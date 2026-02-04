# Feature Engine (stub)

This folder contains scaffolding for feature computation jobs.

Production target:
- Streaming ingestion (Kafka/MSK)
- Batch/stream compute (Flink)
- Feature store (Feast / SageMaker Feature Store)

Local mock:
- Read FAR-Trans dataset CSVs
- Compute per-user features
- Write outputs to `backend_data/features.parquet` (or SQLite)


