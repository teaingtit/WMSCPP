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

The script: tests SSH, creates an archive (excluding `node_modules`, `.next`, `.git`, `.env`, etc.), uploads to `/opt/wmscpp`, extracts, runs `docker compose up -d --build`, and checks container + health endpoint. See [DEPLOYMENT.md](../../DEPLOYMENT.md) for details.

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

3. **เตรียมไฟล์ Environment (.env) บน Server:**

   ```bash
   nano .env
   ```

   ใส่ข้อมูลจาก `.env.local` ของคุณ และเปลี่ยน `NEXT_PUBLIC_APP_URL`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=your-database-url

   # Google AI
   GOOGLE_API_KEY=your-google-api-key

   # App URL (use your domain or server IP)
   NEXT_PUBLIC_APP_URL=http://100.96.9.50:3000
   ```

### Step 2: Transfer Files to Server (จากเครื่อง Local)

// turbo

1. **บีบอัดไฟล์ (ยกเว้นโฟลเดอร์ที่ไม่จำเป็น):**

   ```powershell
   tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cvzf project.tar.gz .
   ```

2. **ส่งไฟล์ไปที่ Server:**

```powershell
scp project.tar.gz home-server:/opt/wmscpp/
```

3. **แตกไฟล์บน Server (รันผ่าน SSH):**

   ```bash
   ssh home-server "cd /opt/wmscpp && tar -xvzf project.tar.gz && rm project.tar.gz"
   ```

   หรือแบบแยกคำสั่ง:

   ```bash
   ssh home-server
   cd /opt/wmscpp
   tar -xvzf project.tar.gz
   rm project.tar.gz
   ```

### Step 3: Build and Start (รันบน Server)

```bash
ssh home-server "cd /opt/wmscpp && docker compose up -d --build"
```

หรือแบบ interactive:

```bash
ssh home-server
cd /opt/wmscpp

# Build และ Start
docker compose up -d --build

# ดูสถานะ
docker compose ps

# ดู Logs
docker compose logs -f wmscpp
```

### Step 4: Verify Deployment

เปิด Browser ไปที่: `http://100.96.9.50:3000`

หรือทดสอบด้วย curl:

```bash
curl http://100.96.9.50:3000/api/health
```

---

## Updating the Application (อัปเดตแอป)

เมื่อมีการแก้ไขโค้ดและต้องการอัปเดต:

1. **บีบอัดไฟล์ใหม่:**

   ```powershell
   tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cvzf project.tar.gz .
   ```

2. **ส่งไฟล์ใหม่:**

```powershell
scp project.tar.gz home-server:/opt/wmscpp/
```

3. **แตกไฟล์และ Deploy:**

   ```bash
   ssh home-server "cd /opt/wmscpp && tar -xvzf project.tar.gz && rm project.tar.gz && docker compose up -d --build"
   ```

---

## Monitoring & Troubleshooting

### ดู Logs แบบ Real-time

```bash
ssh home-server "cd /opt/wmscpp && docker compose logs -f"
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

### 🚀 Deploy ครั้งแรก (Manual)

```powershell
# บน Local
tar --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.env' -cvzf project.tar.gz .
scp project.tar.gz home-server:/opt/wmscpp/

# บน Server (SSH)
ssh home-server
cd /opt/wmscpp
tar -xvzf project.tar.gz
rm project.tar.gz
docker compose up -d --build
```

### 🔄 Update แอป (Manual one-liner)

```powershell
tar --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.env' -cvzf project.tar.gz . && scp project.tar.gz home-server:/opt/wmscpp/ && ssh home-server "cd /opt/wmscpp && tar -xvzf project.tar.gz && rm project.tar.gz && docker compose up -d --build"
```

### 📊 ตรวจสอบสถานะ

```bash
# ดู logs
ssh home-server "cd /opt/wmscpp && docker compose logs -f"

# เช็คสถานะ container
ssh home-server "cd /opt/wmscpp && docker compose ps"

# ทดสอบ health endpoint
curl http://100.96.9.50:3000/api/health
```
