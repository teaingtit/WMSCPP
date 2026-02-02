---
description: Deploy app to private server with Supabase Cloud
---

# Deployment Workflow: Private Server + Supabase Cloud

## Automated deployment (recommended)

From the project root in PowerShell:

```powershell
# Normal update (fast, uses Docker cache)
.\deploy.ps1

# Full rebuild (no cache; use after dependency/Dockerfile changes)
.\deploy.ps1 full
```

The script uses **registry-based deployment**: builds the Docker image locally, pushes to GitHub Container Registry (GHCR), then on the server runs `docker compose pull && docker compose up -d`. No source code or build runs on the server. See [DEPLOYMENT.md](../../DEPLOYMENT.md) for prerequisites (Docker, SSH config, server `.env`, GHCR login).

---

## Prerequisites

- Private server (VPS/Physical) with **Docker** and **Docker Compose** installed
- SSH config alias configured as `home-server` (see SSH Setup section below)
- Supabase Cloud project already configured
- Domain name (optional, but recommended for production)

## SSH Setup (ตั้งค่าครั้งเดียว)

สร้าง SSH config alias เพื่อความสะดวกและปลอดภัย:

1. **สร้างหรือแก้ไข SSH config file:**

   ```powershell
   # บน Windows
   notepad ~\.ssh\config
   ```

2. **เพิ่ม configuration:**

   ```ssh-config
   Host home-server
       HostName 100.96.9.50
       User teaingtit
       Port 22
       IdentityFile ~/.ssh/id_rsa
       ServerAliveInterval 60
       ServerAliveCountMax 3
   ```

3. **ทดสอบการเชื่อมต่อ:**

   ```powershell
   ssh home-server
   ```

   ✅ ถ้าเชื่อมต่อได้แสดงว่าตั้งค่าสำเร็จ!

---

## Local Testing (ทดสอบก่อน Deploy)

### Step 1: Build Docker Image

```bash
# สร้าง .env file (copy จาก .env.local)
cp .env.local .env

# Build image
docker compose build

# Start container
docker compose up -d

# ตรวจสอบ logs
docker compose logs -f wmscpp

# ทดสอบที่ http://localhost:3000
```

### Step 2: Verify Application

```bash
# Check container status
docker compose ps

# Test health
curl http://localhost:3000

# Stop container
docker compose down
```

---

## Production Deployment (Deploy จริงไปที่ Server)

### Step 1: Prepare Server

1. **SSH เข้าเครื่อง Server:**

   ```bash
   ssh home-server
   ```

2. **จัดการโฟลเดอร์และสิทธิ์ (รันบน Server):**

   ```bash
   sudo mkdir -p /opt/wmscpp
   sudo chown -R $USER:$USER /opt/wmscpp
   cd /opt/wmscpp
   ```

3. **เตรียมไฟล์ Environment (.env) บน Server** (สร้างที่ `/opt/wmscpp/.env` — script ไม่ upload ไฟล์นี้):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

### Step 2: Deploy on server (registry-based)

The deploy script uploads `docker-compose.yml` to the server and runs:

```bash
docker compose pull && docker compose up -d
```

No tar/archive transfer. The server pulls the image from GHCR (`ghcr.io/teaingtit/wmscpp:latest` by default).

### Step 3: Verify deployment

เปิด Browser ไปที่: `http://100.96.9.50:3000`

หรือทดสอบด้วย curl:

```bash
curl http://100.96.9.50:3000/api/health
```

---

## Updating the application (อัปเดตแอป)

เมื่อมีการแก้ไขโค้ดและต้องการอัปเดต: รัน `.\deploy.ps1` อีกครั้ง (build → push → server pull & up). ไม่ต้องส่ง source หรือ tar.

---

## Monitoring & Troubleshooting

### ดู Logs แบบ Real-time

```bash
ssh home-server "cd /opt/wmscpp && docker compose logs -f wmscpp"
```

### เช็ค Resource Usage

```bash
ssh home-server "docker stats"
```

### Restart Application

```bash
ssh home-server "cd /opt/wmscpp && docker compose restart"
```

### Stop Application

```bash
ssh home-server "cd /opt/wmscpp && docker compose down"
```

### Server DNS broken (cannot pull from GHCR)

If deploy fails on the server with `lookup ghcr.io ... connection refused` or `no servers could be reached`, the server has no working DNS (e.g. systemd-resolved inactive and `/etc/resolv.conf` missing).

**Fix once on the server (run in an interactive SSH session so you can enter your sudo password):**

```bash
ssh home-server
```

Then on the server:

```bash
# Option A: inline fix
sudo rm -f /etc/resolv.conf
echo 'nameserver 8.8.8.8
nameserver 8.8.4.4' | sudo tee /etc/resolv.conf

# Verify
nslookup ghcr.io

# Redeploy
cd /opt/wmscpp && docker compose pull && docker compose up -d
```

**Option B:** copy the fix script and run it:

```powershell
scp scripts/fix-dns-server.sh home-server:/tmp/
ssh home-server "sudo sh /tmp/fix-dns-server.sh"
ssh home-server "cd /opt/wmscpp && docker compose pull && docker compose up -d"
```

### Common Issues

- **กรณีรันไม่ขึ้น:** เช็ค `.env` ว่าค่า Supabase ถูกต้องหรือไม่
- **Connection refused:** เช็ค firewall ของ server ว่าเปิดพอร์ต 3000 หรือไม่
- **Container crash:** ดู logs ด้วย `docker compose logs`

---

## Quick Reference (คำสั่งด่วน)

### 🚀 Deploy ด้วย Script (แนะนำ)

```powershell
.\deploy.ps1        # update (default)
.\deploy.ps1 full   # full rebuild
```

### 🚀 Deploy ครั้งแรก (manual)

On the server: create `/opt/wmscpp`, add `.env`, then run deploy from local so the script uploads `docker-compose.yml` and runs `docker compose pull && up -d`. See [DEPLOYMENT.md](../../DEPLOYMENT.md) for one-time GHCR login and server prep.

### 📊 ตรวจสอบสถานะ

```bash
# ดู logs
ssh home-server "cd /opt/wmscpp && docker compose logs -f wmscpp"

# เช็คสถานะ container
ssh home-server "cd /opt/wmscpp && docker compose ps"

# ทดสอบ health endpoint
curl http://100.96.9.50:3000/api/health
```
