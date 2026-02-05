from __future__ import annotations

import os
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

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


def dataset_path(filename: str) -> str:
  base = os.environ.get("DATASET_DIR")
  if not base:
    # default relative to repo root when running from backend/
    base = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../dataset/FAR-Trans"))
  path = os.path.join(base, filename)
  if not os.path.exists(path):
    raise FileNotFoundError(f"Dataset file not found: {path}")
  return path


def _duckdb_path_literal(p: str) -> str:
  # DuckDB works well with forward slashes on Windows; also escape quotes.
  return p.replace("\\", "/").replace("'", "''")


def _db_file_path() -> str:
  override = os.environ.get("DUCKDB_PATH")
  if override:
    return override
  backend_dir = Path(__file__).resolve().parents[3]  # .../backend
  out_dir = backend_dir / ".duckdb"
  out_dir.mkdir(parents=True, exist_ok=True)
  return str(out_dir / "transaction_service.duckdb")


@lru_cache(maxsize=1)
def _ensure_db_loaded() -> str:
  """
  Load FAR-Trans CSVs into an on-disk DuckDB database once per service process.

  This avoids:
  - repeated CSV scans on each request
  - memory spikes from repeated schema inference
  - OOM crashes on Windows
  """
  try:
    import duckdb  # type: ignore
  except ModuleNotFoundError as e:
    raise RuntimeError(
      "Missing dependency 'duckdb'. Install backend requirements:\n"
      "  cd backend && python -m pip install -r requirements.txt"
    ) from e

  db_path = _db_file_path()
  con = duckdb.connect(database=db_path)

  # Make memory use more predictable in dev; can override via env.
  mem_limit = os.environ.get("DUCKDB_MEMORY_LIMIT", "512MB")
  con.execute("SET enable_progress_bar=false;")
  con.execute(f"SET memory_limit='{mem_limit}';")
  # Slightly reduce peak memory on some Windows setups.
  try:
    con.execute("SET preserve_insertion_order=false;")
  except Exception:
    pass

  tx_path = _duckdb_path_literal(dataset_path("transactions.csv"))
  assets_path = _duckdb_path_literal(dataset_path("asset_information.csv"))
  markets_path = _duckdb_path_literal(dataset_path("markets.csv"))
  only_customer_id = os.environ.get("TX_ONLY_CUSTOMER_ID")

  def _has_table(name: str) -> bool:
    return (
      con.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='main' AND table_name=?",
        [name],
      ).fetchone()[0]
      > 0
    )

  # IMPORTANT:
  # - Avoid read_csv_auto() (can OOM due to type inference).
  # - Persist tables into DuckDB file so we don't redo work per request.
  if not _has_table("transactions"):
    con.execute(
      f"""
      CREATE TABLE transactions AS
        SELECT * FROM read_csv(
          '{tx_path}',
          header=true,
          columns={{
            'customerID': 'VARCHAR',
            'ISIN': 'VARCHAR',
            'transactionID': 'BIGINT',
            'transactionType': 'VARCHAR',
            'timestamp': 'DATE',
            'totalValue': 'DOUBLE',
            'units': 'DOUBLE',
            'channel': 'VARCHAR',
            'marketID': 'VARCHAR'
          }},
          dateformat='%Y-%m-%d'
        )
        {"WHERE customerID = '" + _duckdb_path_literal(only_customer_id) + "'" if only_customer_id else ""};
      """
    )

  if not _has_table("assets"):
    con.execute(
      f"""
      CREATE TABLE assets AS
        SELECT * FROM read_csv(
          '{assets_path}',
          header=true,
          columns={{
            'ISIN': 'VARCHAR',
            'assetName': 'VARCHAR',
            'assetShortName': 'VARCHAR',
            'assetCategory': 'VARCHAR',
            'assetSubCategory': 'VARCHAR',
            'marketID': 'VARCHAR',
            'sector': 'VARCHAR',
            'industry': 'VARCHAR',
            'timestamp': 'DATE'
          }},
          dateformat='%Y-%m-%d'
        );
      """
    )

  if not _has_table("markets"):
    con.execute(
      f"""
      CREATE TABLE markets AS
        SELECT * FROM read_csv(
          '{markets_path}',
          header=true,
          columns={{
            'exchangeID': 'VARCHAR',
            'marketID': 'VARCHAR',
            'name': 'VARCHAR',
            'description': 'VARCHAR',
            'country': 'VARCHAR',
            'tradingDays': 'VARCHAR',
            'tradingHours': 'VARCHAR',
            'marketClass': 'VARCHAR'
          }}
        );
      """
    )

  con.close()
  return db_path


def get_db() -> Any:
  """
  Returns a connection for the request.

  We use an on-disk DuckDB database created once at startup to avoid OOM.
  """
  try:
    import duckdb  # type: ignore
  except ModuleNotFoundError as e:
    raise RuntimeError(
      "Missing dependency 'duckdb'. Install backend requirements:\n"
      "  cd backend && python -m pip install -r requirements.txt"
    ) from e

  db_path = _ensure_db_loaded()
  con = duckdb.connect(database=db_path, read_only=True)
  mem_limit = os.environ.get("DUCKDB_MEMORY_LIMIT", "512MB")
  con.execute("SET enable_progress_bar=false;")
  con.execute(f"SET memory_limit='{mem_limit}';")
  return con


def _fetch_dicts(con: Any, q: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
  res = con.execute(q, params or [])
  cols = [c[0] for c in (res.description or [])]
  out: list[dict[str, Any]] = []
  for row in res.fetchall():
    out.append({cols[i]: row[i] for i in range(len(cols))})
  return out


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


class DebugUserOut(BaseModel):
  customer_id: str
  tx_count: int


@app.get("/v1/debug/users", response_model=list[DebugUserOut])
def debug_users(
  limit: int = Query(default=20, ge=1, le=2000, description="Max number of users to return"),
) -> list[DebugUserOut]:
  """
  Local-dev helper: list customer IDs present in the loaded DuckDB + their tx counts.

  NOTE: This is for local debugging only (not meant for production).
  """
  con = get_db()
  q = """
    SELECT customerID AS customer_id, COUNT(*)::BIGINT AS tx_count
    FROM transactions
    GROUP BY 1
    ORDER BY tx_count DESC
    LIMIT ?
  """
  return _fetch_dicts(con, q, [limit])


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
  rows = _fetch_dicts(con, q, params)
  if not rows:
    return []
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
  """
  NOTE: This endpoint is debugged in local dev by surfacing the real error message.
  In production you would not return raw exception details.
  """
  from fastapi import HTTPException
  import traceback

  try:
    con = get_db()
    q = """
      WITH anchor AS (
        SELECT MAX(CAST(timestamp AS DATE)) AS as_of
        FROM transactions
        WHERE customerID = ?
      ),
      user_tx AS (
        SELECT t.*
        FROM transactions t, anchor a
        WHERE t.customerID = ?
          AND a.as_of IS NOT NULL
          AND CAST(t.timestamp AS DATE) >= (a.as_of - (? || ' days')::INTERVAL)
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
      return UserSummaryOut(
        customer_id=customer_id,
        window_days=window_days,
        buys=0.0,
        sells=0.0,
        net_flow=0.0,
        tx_count=0,
        top_asset_categories=[],
      )

    q2 = """
      WITH anchor AS (
        SELECT MAX(CAST(timestamp AS DATE)) AS as_of
        FROM transactions
        WHERE customerID = ?
      ),
      user_tx AS (
        SELECT t.*
        FROM transactions t, anchor a
        WHERE t.customerID = ?
          AND a.as_of IS NOT NULL
          AND CAST(t.timestamp AS DATE) >= (a.as_of - (? || ' days')::INTERVAL)
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
    top = _fetch_dicts(con, q2, [customer_id, customer_id, window_days])

    return UserSummaryOut(
      customer_id=customer_id,
      window_days=window_days,
      buys=float(buys or 0),
      sells=float(sells or 0),
      net_flow=float(net_flow or 0),
      tx_count=int(tx_count),
      top_asset_categories=top,
    )
  except Exception as e:  # pragma: no cover - local debug helper
    # In local dev, surface the real error so we can fix it.
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"user_summary error: {e}")


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
  rows = _fetch_dicts(con, q, params)
  if not rows:
    return []

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
  # Filter window in python (timestamps are date objects)
  from datetime import timedelta
  as_of = max((t.posted_at for t in txs), default=date.today())
  cutoff = as_of - timedelta(days=window_days)
  txs = [t for t in txs if t.posted_at >= cutoff]
  if not txs:
    return BankingSummaryOut(
      user_id=customer_id,
      window_days=window_days,
      spend_total=0.0,
      income_total=0.0,
      tx_count=0,
      installment_ratio=0.0,
      top_categories=[],
    )

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


