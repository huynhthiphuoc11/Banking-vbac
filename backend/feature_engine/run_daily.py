from __future__ import annotations

import os
from pathlib import Path

import duckdb


def dataset_path(filename: str) -> str:
  base = os.environ.get("DATASET_DIR") or os.path.normpath(
    os.path.join(os.path.dirname(__file__), "../../dataset/FAR-Trans")
  )
  return os.path.join(base, filename)


def main() -> None:
  out_dir = Path(os.environ.get("BACKEND_DATA_DIR", os.path.join(os.path.dirname(__file__), "../backend_data")))
  out_dir.mkdir(parents=True, exist_ok=True)
  out_path = out_dir / "features.parquet"

  con = duckdb.connect(database=":memory:")
  con.execute(
    "CREATE VIEW transactions AS SELECT * FROM read_csv_auto($1, header=true);",
    [dataset_path("transactions.csv")],
  )

  # Example features (per customer):
  # - tx_count_90d, net_flow_90d, recency_days, frequency_per_month
  con.execute(
    f"""
    COPY (
      WITH tx AS (
        SELECT
          customerID,
          CAST(timestamp AS DATE) AS ts,
          transactionType,
          totalValue
        FROM transactions
      ),
      w AS (
        SELECT *
        FROM tx
        WHERE ts >= (CURRENT_DATE - INTERVAL '90 days')
      ),
      agg AS (
        SELECT
          customerID,
          COUNT(*) AS tx_count_90d,
          SUM(CASE WHEN transactionType='Sell' THEN totalValue ELSE 0 END) -
          SUM(CASE WHEN transactionType='Buy' THEN totalValue ELSE 0 END) AS net_flow_90d,
          DATE_DIFF('day', MAX(ts), CURRENT_DATE) AS recency_days
        FROM w
        GROUP BY 1
      )
      SELECT
        customerID,
        tx_count_90d,
        net_flow_90d,
        recency_days,
        (tx_count_90d / 3.0) AS frequency_per_month
      FROM agg
    ) TO '{out_path.as_posix()}' (FORMAT PARQUET);
    """
  )

  print(f"Wrote features: {out_path}")


if __name__ == "__main__":
  main()


