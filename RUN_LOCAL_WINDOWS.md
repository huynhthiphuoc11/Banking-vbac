# Run locally (Windows / PowerShell)

This project has:
- **Frontend** (Vite/React)
- **Backend** (FastAPI microservices)
  - `transaction_service` on **:8002**
  - `conversation_service` on **:8001** (optional if you don’t use chat)
  - `api_gateway_local` (BFF) on **:8000** (frontend calls this)

> If you want **real numbers on the dashboard**, you must run **Gateway (:8000)** + **Transaction Service (:8002)**.

---

## One-time setup

### Frontend deps

```powershell
cd "D:\Banking AI Dashboard Design"
npm install
```

### Backend venv + deps

```powershell
cd "D:\Banking AI Dashboard Design\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

---

## Daily run (open multiple terminals)

### Option 1 (recommended) — run ALL backend services with ONE command

From **project root**:

```powershell
cd "D:\Banking AI Dashboard Design"
.\backend\run-backend.ps1
```

- It will start:
  - `transaction_service` on **:8002**
  - `conversation_service` on **:8001**
  - `api_gateway_local` on **:8000**

Optional:

```powershell
# start backend without chat service
.\backend\run-backend.ps1 -NoChat

# start backend as background jobs (no extra windows)
.\backend\run-backend.ps1 -Background
```

> If your PowerShell blocks scripts, run once in the current terminal:
> `Set-ExecutionPolicy -Scope Process Bypass`

### Option 2 — manual (3 terminals)

### Terminal A — Transaction Service (:8002)

```powershell
cd "D:\Banking AI Dashboard Design\backend"
.\.venv\Scripts\Activate.ps1
$env:DISABLE_AUTH="1"
$env:DATASET_DIR="..\dataset\FAR-Trans"
uvicorn transaction_service.app.main:app --reload --port 8002
```

### Terminal B — Conversation Service (:8001) (optional, for chat)

```powershell
cd "D:\Banking AI Dashboard Design\backend"
.\.venv\Scripts\Activate.ps1
$env:DISABLE_AUTH="1"
# optional:
# $env:OPENAI_API_KEY="..."
uvicorn conversation_service.app.main:app --reload --port 8001
```

### Terminal C — API Gateway (:8000)

```powershell
cd "D:\Banking AI Dashboard Design\backend"
.\.venv\Scripts\Activate.ps1
$env:DISABLE_AUTH="1"
uvicorn api_gateway_local.app.main:app --reload --port 8000
```

### Terminal D — Frontend (Vite)

```powershell
cd "D:\Banking AI Dashboard Design"
npm run dev
```

---

## Quick health checks

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/healthz"
Invoke-RestMethod "http://127.0.0.1:8002/healthz"
```

Open Swagger:
- Gateway: `http://127.0.0.1:8000/docs`
- Transaction service: `http://127.0.0.1:8002/docs`
- Conversation service: `http://127.0.0.1:8001/docs`


