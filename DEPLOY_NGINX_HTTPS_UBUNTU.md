## Deploy chuẩn (Ubuntu) — Build frontend + Nginx (HTTPS) + Reverse proxy API Gateway

Mục tiêu:
- Public 1 domain HTTPS (cổng 443)
- Nginx serve frontend build tĩnh
- Nginx reverse proxy `/api/*` → API Gateway (FastAPI) chạy nội bộ `127.0.0.1:8000`
- Các service backend chạy bằng `systemd` (tự restart)

> Repo không push `dataset/FAR-Trans/*.csv` (đã ignore). **Muốn dashboard có số liệu thật** bạn phải upload dataset lên server.

---

## 0) Prerequisites

```bash
sudo apt update
sudo apt install -y nginx python3-venv git
```

### Node.js
Khuyến nghị Node 18+.

```bash
node -v || true
npm -v || true
```

Nếu server chưa có Node, bạn cài theo cách bạn đang dùng (apt/nvm). (Nên dùng nvm để có Node mới hơn.)

---

## 1) Clone repo

```bash
cd ~
git clone https://github.com/huynhthiphuoc11/Banking-vbac.git
cd Banking-vbac
```

---

## 2) Upload dataset (bắt buộc để có data)

Trên **Windows PowerShell** (máy local), copy folder dataset lên server:

```powershell
scp -P 8081 -r "D:\Banking AI Dashboard Design\dataset\FAR-Trans" mytam@localhost:~/Banking-vbac/dataset/
```

Trên server, verify:

```bash
ls -la ~/Banking-vbac/dataset/FAR-Trans/transactions.csv
```

---

## 3) Backend (systemd)

### 3.1 Tạo venv + cài deps

```bash
cd ~/Banking-vbac/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
deactivate
```

### 3.2 Tạo env files (ở `/etc/banking-vbac/`)

```bash
sudo mkdir -p /etc/banking-vbac
sudo nano /etc/banking-vbac/tx.env
```

Nội dung `tx.env`:

```bash
DISABLE_AUTH=true
DATASET_DIR=../dataset/FAR-Trans
RATE_LIMIT_ENABLED=true
CORS_ALLOW_ORIGINS=*
```

Tạo gateway env:

```bash
sudo nano /etc/banking-vbac/gateway.env
```

```bash
DISABLE_AUTH=true
RATE_LIMIT_ENABLED=true
CORS_ALLOW_ORIGINS=*
TRANSACTION_SERVICE_URL=http://127.0.0.1:8002
CONVERSATION_SERVICE_URL=http://127.0.0.1:8001
```

Conversation env (nếu chạy chat):

```bash
sudo nano /etc/banking-vbac/conv.env
```

```bash
DISABLE_AUTH=true
RATE_LIMIT_ENABLED=true
CORS_ALLOW_ORIGINS=*
# optional:
# OPENAI_API_KEY=...
```

> Tên biến môi trường map theo `backend/common/settings.py` (Pydantic Settings) nên dùng `DISABLE_AUTH`, `CORS_ALLOW_ORIGINS`, `RATE_LIMIT_ENABLED`… (uppercase).

### 3.3 Cài systemd units

Copy các file template trong repo:
- `deploy/systemd/banking-vbac-tx.service`
- `deploy/systemd/banking-vbac-conv.service`
- `deploy/systemd/banking-vbac-gateway.service`

Ví dụ:

```bash
sudo cp ~/Banking-vbac/deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
```

Start services:

```bash
sudo systemctl enable --now banking-vbac-tx
sudo systemctl enable --now banking-vbac-gateway
# optional:
sudo systemctl enable --now banking-vbac-conv
```

Check:

```bash
sudo systemctl status banking-vbac-gateway --no-pager
curl http://127.0.0.1:8000/healthz
curl http://127.0.0.1:8002/healthz
```

Logs:

```bash
sudo journalctl -u banking-vbac-gateway -f
```

---

## 4) Frontend build + Nginx serve

### 4.1 Build frontend (API base dùng đường dẫn tương đối)

Quan trọng: build với `VITE_API_BASE_URL=/api` để frontend gọi `https://<domain>/api/v1/...`

```bash
cd ~/Banking-vbac
npm install
VITE_API_BASE_URL=/api npm run build
```

### 4.2 Copy build ra web root

```bash
sudo mkdir -p /var/www/banking-vbac
sudo rm -rf /var/www/banking-vbac/*
sudo cp -r ~/Banking-vbac/dist/* /var/www/banking-vbac/
```

### 4.3 Nginx config (HTTP → HTTPS + reverse proxy)

Copy file template:

```bash
sudo cp ~/Banking-vbac/deploy/nginx/banking-vbac.conf /etc/nginx/sites-available/banking-vbac.conf
sudo ln -sf /etc/nginx/sites-available/banking-vbac.conf /etc/nginx/sites-enabled/banking-vbac.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5) HTTPS (Certbot)

> Bạn cần domain trỏ DNS về IP server.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <YOUR_DOMAIN>
```

---

## Troubleshooting nhanh

- **UI load nhưng call API fail**: xem Nginx proxy `/api/` và check gateway `curl http://127.0.0.1:8000/healthz`
- **Transaction service lỗi “Dataset file not found”**: thiếu CSV ở `dataset/FAR-Trans/` hoặc `DATASET_DIR` sai.
- **Firewall**: nếu dùng domain/HTTPS chuẩn, chỉ cần mở 80/443:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```


