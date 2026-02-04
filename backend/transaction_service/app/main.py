from __future__ import annotations

import os
from datetime import date
from typing import Any, TYPE_CHECKING

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from common.logging import configure_logging
from common.settings import CommonSettings
from common.auth import require_auth
from common.rate_limit import RateLimitMiddleware

from .normalize import map_to_category, synthetic_installment


settings = CommonSettings(service_name="transaction_service")
configure_logging("transaction_service")

_DB: "duckdb.DuckDBPyConnection | None" = None

if TYPE_CHECKING:
  import duckdb  # type: ignore


def dataset_path(filename: str) -> str:
  base = os.environ.get("DATASET_DIR")
  if not base:
    # default relative to repo root when running from backend/
    base = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../dataset/FAR-Trans"))
  path = os.path.join(base, filename)
  if not os.path.exists(path):
    raise FileNotFoundError(f"Dataset file not found: {path}")
  return path


def get_db() -> "duckdb.DuckDBPyConnection":
  """
  Lazily create and reuse a single DuckDB connection.

  This avoids re-reading CSVs and re-creating views on every request which can
  be slow and memory-hungry (and may trigger OOM on Windows).
  """
  try:
    import duckdb  # type: ignore
  except ModuleNotFoundError as e:
    raise RuntimeError(
      "Missing dependency 'duckdb'. Install backend requirements:\n"
      "  cd backend && python -m pip install -r requirements.txt"
    ) from e

  global _DB
  if _DB is not None:
    return _DB

  # DuckDB can query CSVs directly; keep it simple but reuse the connection.
  con = duckdb.connect(database=":memory:")
  con.execute("SET enable_progress_bar=false;")
  # Prefer lower peak memory for local dev.
  try:
    con.execute("SET preserve_insertion_order=false;")
  except Exception:
    pass

  # NOTE: DuckDB does not support prepared parameters for some DDL statements
  # (e.g. CREATE VIEW). Inline the file path with minimal escaping.
  def _sql_path(p: str) -> str:
    # Normalize Windows paths and escape single quotes for SQL string literal.
    return p.replace("\\", "/").replace("'", "''")

  tx_csv = _sql_path(dataset_path("transactions.csv"))
  assets_csv = _sql_path(dataset_path("asset_information.csv"))
  markets_csv = _sql_path(dataset_path("markets.csv"))

  con.execute(
    f"""
    CREATE OR REPLACE VIEW transactions AS
      SELECT * FROM read_csv_auto('{tx_csv}', header=true);
    """
  )
  con.execute(
    f"""
    CREATE OR REPLACE VIEW assets AS
      SELECT * FROM read_csv_auto('{assets_csv}', header=true);
    """
  )
  con.execute(
    f"""
    CREATE OR REPLACE VIEW markets AS
      SELECT * FROM read_csv_auto('{markets_csv}', header=true);
    """
  )
  _DB = con
  return _DB


def _fetch_records(con: "duckdb.DuckDBPyConnection", q: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
  """
  Fetch rows as list-of-dicts without requiring pandas/numpy (DuckDB fetchdf()).
  """
  res = con.execute(q, params or [])
  cols = [c[0] for c in (res.description or [])]
  rows = res.fetchall()
  return [dict(zip(cols, row)) for row in rows]


app = FastAPI(
  title="Transaction Service",
  version="0.1.0",
  description="Mock core-banking transaction APIs backed by FAR-Trans (CSV).",
)

app.add_middleware(
  RateLimitMiddleware,
  enabled=settings.rate_limit_enabled,
  rps=settings.rate_limit_rps,
  burst=settings.rate_limit_burst,
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=[settings.cors_allow_origins],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
  return {"status": "ok", "service": "transaction_service"}


class TransactionOut(BaseModel):
  customer_id: str = Field(alias="customerID")
  transaction_id: str = Field(alias="transactionID")
  transaction_type: str = Field(alias="transactionType")
  isin: str = Field(alias="ISIN")
  timestamp: date
  total_value: float = Field(alias="totalValue")
  units: float
  channel: str
  market_id: str = Field(alias="marketID")

  asset_name: str | None = None
  asset_category: str | None = None
  market_name: str | None = None
  market_country: str | None = None


@app.get("/v1/users/{customer_id}/transactions", response_model=list[TransactionOut])
def get_transactions(
  customer_id: str,
  start: date | None = Query(default=None, description="YYYY-MM-DD"),
  end: date | None = Query(default=None, description="YYYY-MM-DD"),
  limit: int = Query(default=200, ge=1, le=2000),
  _claims: dict = require_auth(settings),
) -> list[TransactionOut]:
  con = get_db()
  where = ["t.customerID = ?"]
  params: list[Any] = [customer_id]
  if start:
    where.append("t.timestamp >= ?")
    params.append(start.isoformat())
  if end:
    where.append("t.timestamp <= ?")
    params.append(end.isoformat())

  q = f"""
    SELECT
      t.*,
      a.assetName AS asset_name,
      a.assetCategory AS asset_category,
      m.name AS market_name,
      m.country AS market_country
    FROM transactions t
    LEFT JOIN (
      SELECT DISTINCT ON (ISIN) ISIN, assetName, assetCategory, marketID
      FROM assets
    ) a USING (ISIN)
    LEFT JOIN markets m USING (marketID)
    WHERE {" AND ".join(where)}
    ORDER BY t.timestamp DESC
    LIMIT {limit}
  """
  rows = _fetch_records(con, q, params)
  if not rows:
    raise HTTPException(status_code=404, detail="No transactions found for customer.")
  return rows


class UserSummaryOut(BaseModel):
  customer_id: str
  window_days: int
  buys: float
  sells: float
  net_flow: float
  tx_count: int
  top_asset_categories: list[dict[str, Any]]


@app.get("/v1/users/{customer_id}/summary", response_model=UserSummaryOut)
def user_summary(
  customer_id: str,
  window_days: int = Query(default=90, ge=7, le=365),
  _claims: dict = require_auth(settings),
) -> UserSummaryOut:
  con = get_db()
  q = """
    WITH user_tx AS (
      SELECT *
      FROM transactions
      WHERE customerID = ?
        AND timestamp >= (
          (SELECT MAX(timestamp) FROM transactions WHERE customerID = ?)
          - (? || ' days')::INTERVAL
        )
    ),
    enriched AS (
      SELECT
        ut.*,
        a.assetCategory AS asset_category
      FROM user_tx ut
      LEFT JOIN (
        SELECT DISTINCT ON (ISIN) ISIN, assetCategory
        FROM assets
      ) a USING (ISIN)
    )
    SELECT
      SUM(CASE WHEN transactionType='Buy' THEN totalValue ELSE 0 END) AS buys,
      SUM(CASE WHEN transactionType='Sell' THEN totalValue ELSE 0 END) AS sells,
      (SUM(CASE WHEN transactionType='Sell' THEN totalValue ELSE 0 END)
       - SUM(CASE WHEN transactionType='Buy' THEN totalValue ELSE 0 END)) AS net_flow,
      COUNT(*) AS tx_count
    FROM enriched;
  """
  buys, sells, net_flow, tx_count = con.execute(q, [customer_id, customer_id, window_days]).fetchone()
  if tx_count == 0:
    raise HTTPException(status_code=404, detail="No transactions in this window for customer.")

  q2 = """
    WITH user_tx AS (
      SELECT *
      FROM transactions
      WHERE customerID = ?
        AND timestamp >= (
          (SELECT MAX(timestamp) FROM transactions WHERE customerID = ?)
          - (? || ' days')::INTERVAL
        )
    ),
    enriched AS (
      SELECT
        ut.*,
        COALESCE(a.assetCategory, 'Unknown') AS asset_category
      FROM user_tx ut
      LEFT JOIN (
        SELECT DISTINCT ON (ISIN) ISIN, assetCategory
        FROM assets
      ) a USING (ISIN)
    )
    SELECT asset_category, COUNT(*) AS n, SUM(totalValue) AS total_value
    FROM enriched
    GROUP BY 1
    ORDER BY total_value DESC
    LIMIT 5;
  """
  top = _fetch_records(con, q2, [customer_id, customer_id, window_days])

  return UserSummaryOut(
    customer_id=customer_id,
    window_days=window_days,
    buys=float(buys or 0),
    sells=float(sells or 0),
    net_flow=float(net_flow or 0),
    tx_count=int(tx_count),
    top_asset_categories=top,
  )


class InstallmentOut(BaseModel):
  is_installment: bool
  months: int | None = None
  monthly_amount: float | None = None


class BankingTransactionOut(BaseModel):
  id: str
  user_id: str
  posted_at: date
  direction: str  # debit/credit
  amount: float   # debit negative, credit positive
  currency: str = "EUR"

  merchant_name: str | None = None
  channel: str | None = None

  category: str
  mcc: int
  isin: str

  installment: InstallmentOut | None = None


@app.get("/v1/banking/users/{customer_id}/transactions", response_model=list[BankingTransactionOut])
def get_banking_transactions(
  customer_id: str,
  start: date | None = Query(default=None, description="YYYY-MM-DD"),
  end: date | None = Query(default=None, description="YYYY-MM-DD"),
  limit: int = Query(default=200, ge=1, le=2000),
  _claims: dict = require_auth(settings),
) -> list[BankingTransactionOut]:
  con = get_db()
  where = ["t.customerID = ?"]
  params: list[Any] = [customer_id]
  if start:
    where.append("t.timestamp >= ?")
    params.append(start.isoformat())
  if end:
    where.append("t.timestamp <= ?")
    params.append(end.isoformat())

  q = f"""
    SELECT
      t.customerID,
      t.transactionID,
      t.transactionType,
      t.ISIN,
      t.timestamp,
      t.totalValue,
      t.units,
      t.channel,
      t.marketID,
      a.assetName AS asset_name
    FROM transactions t
    LEFT JOIN (
      SELECT DISTINCT ON (ISIN) ISIN, assetName
      FROM assets
    ) a USING (ISIN)
    WHERE {" AND ".join(where)}
    ORDER BY t.timestamp DESC
    LIMIT {limit}
  """
  rows = _fetch_records(con, q, params)
  if not rows:
    raise HTTPException(status_code=404, detail="No transactions found for customer.")

  out: list[BankingTransactionOut] = []
  for row in rows:
    tx_type = row.get("transactionType")
    amount_abs = float(row.get("totalValue") or 0)
    direction = "debit" if tx_type == "Buy" else "credit"
    signed_amount = -amount_abs if direction == "debit" else amount_abs
    mapping = map_to_category(str(row.get("transactionID")), row.get("channel"))
    inst = synthetic_installment(str(row.get("transactionID")), mapping.category, amount_abs)

    out.append(
      BankingTransactionOut(
        id=str(row.get("transactionID")),
        user_id=str(row.get("customerID")),
        posted_at=row.get("timestamp"),
        direction=direction,
        amount=round(signed_amount, 2),
        merchant_name=row.get("asset_name"),
        channel=row.get("channel"),
        category=mapping.category,
        mcc=mapping.mcc,
        isin=str(row.get("ISIN")),
        installment=InstallmentOut(**inst) if inst else None,
      )
    )
  return out


class BankingSummaryOut(BaseModel):
  user_id: str
  window_days: int
  spend_total: float
  income_total: float
  tx_count: int
  installment_ratio: float = Field(description="installment debit amount / total debit amount")
  top_categories: list[dict[str, Any]]


@app.get("/v1/banking/users/{customer_id}/summary", response_model=BankingSummaryOut)
def banking_summary(
  customer_id: str,
  window_days: int = Query(default=90, ge=7, le=365),
  _claims: dict = require_auth(settings),
) -> BankingSummaryOut:
  # Reuse normalized transactions to compute category and installment features.
  txs = get_banking_transactions(customer_id=customer_id, limit=2000, start=None, end=None, _claims=_claims)
  # Filter window in python (timestamps are date objects). FAR-Trans is historical,
  # so use the most recent transaction date as the "now" anchor.
  from datetime import timedelta
  anchor = max((t.posted_at for t in txs), default=date.today())
  cutoff = anchor - timedelta(days=window_days)
  txs = [t for t in txs if t.posted_at >= cutoff]
  if not txs:
    raise HTTPException(status_code=404, detail="No transactions in this window for customer.")

  debit = [t for t in txs if t.direction == "debit"]
  credit = [t for t in txs if t.direction == "credit"]
  spend_total = round(sum(abs(t.amount) for t in debit), 2)
  income_total = round(sum(t.amount for t in credit), 2)

  installment_debit = 0.0
  for t in debit:
    if t.installment and t.installment.is_installment:
      installment_debit += abs(t.amount)
  installment_ratio = round((installment_debit / spend_total) if spend_total > 0 else 0.0, 4)

  cat_totals: dict[str, float] = {}
  for t in debit:
    cat_totals[t.category] = cat_totals.get(t.category, 0.0) + abs(t.amount)
  top_categories = [
    {"category": k, "total": round(v, 2)} for k, v in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)[:6]
  ]

  return BankingSummaryOut(
    user_id=customer_id,
    window_days=window_days,
    spend_total=spend_total,
    income_total=income_total,
    tx_count=len(txs),
    installment_ratio=installment_ratio,
    top_categories=top_categories,
  )


