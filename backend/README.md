# Backend (FastAPI microservices)

This repo currently includes a frontend and a backend scaffold.

## Services

- `conversation_service` (FastAPI): conversation context, summarization, intent/emotion detection, feedback collection.
- `transaction_service` (FastAPI): mock “core banking” APIs backed by the FAR‑Trans dataset (CSV → DuckDB query).
- `api_gateway_local` (FastAPI): local BFF/API gateway with JWT verification + rate limiting + standardized contracts for frontend.

## Local setup (Windows / PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### Run Transaction Service

```powershell
$env:DATASET_DIR="..\dataset\FAR-Trans"
uvicorn transaction_service.app.main:app --reload --port 8002
```

Open API docs: `http://localhost:8002/docs`

### Run Conversation Service

```powershell
# Optional: OpenAI for summarization/explanations
$env:OPENAI_API_KEY="..."
uvicorn conversation_service.app.main:app --reload --port 8001
```

Open API docs: `http://localhost:8001/docs`

### Run Local API Gateway (BFF)

Start the two downstream services first, then run:

```powershell
uvicorn api_gateway_local.app.main:app --reload --port 8000
```

Open API docs: `http://localhost:8000/docs`

Frontend should call **one base URL** (the gateway) for:
- Chat: `POST /v1/chat/message`, `POST /v1/chat/feedback`
- Dashboard: `GET /v1/dashboard/users/{id}/transactions`, `/summary`, `/insights`, `/recommendations`

## Notes

- Auth/rate limiting is designed to sit in **AWS API Gateway**. For local dev, services can run with auth disabled.
- The current AI logic is safe scaffolding: no automatic financial decision. Outputs are recommendations only.


