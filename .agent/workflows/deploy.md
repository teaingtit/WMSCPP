---
description: Deploy app to private server with Supabase Cloud
---

# Deployment Workflow: Private Server + Supabase Cloud

## Prerequisites

- Private server (VPS/Physical) with **Docker** and **Docker Compose** installed
- SSH access to the server: `ssh teaingtit@100.96.9.50`
- Supabase Cloud project already configured
- Domain name (optional, but recommended for production)

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

## Production Deployment (Deploy จริงไปที่ Server)

### Step 1: Prepare Server

1. **SSH เข้าเครื่อง Server:**

   ```bash
   ssh teaingtit@100.96.9.50
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

เนื่องจากบน Windows ไม่มี `rsync` เป็นค่าเริ่มต้น แนะนำให้ใช้ `tar` + `scp` ดังนี้:

1. **บีบอัดไฟล์ (กดยกเลิกโฟลเดอร์ที่ไม่จำเป็น):**

   ```powershell
   tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cvzf project.tar.gz .
   ```

2. **ส่งไฟล์ไปที่ Server:**

   ```powershell
   scp project.tar.gz teaingtit@100.96.9.50:/opt/wmscpp/
   ```

3. **แตกไฟล์บน Server (รันผ่าน SSH):**
   ```bash
   cd /opt/wmscpp
   tar -xvzf project.tar.gz
   rm project.tar.gz
   ```

### Step 3: Build and Start (รันบน Server)

```bash
cd /opt/wmscpp

# Build และ Start
docker compose up -d --build

# ดูสถานะ
docker compose ps

# ดู Logs
docker compose logs -f wmscpp
```

## Step 4: Verify Deployment

เปิด Browser ไปที่: `http://100.96.9.50:3000`

---

## Updating the Application

เมื่อมีการแก้ไขโค้ดและต้องการอัปเดต:

1. บีบอัดไฟล์ใหม่: `tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cvzf project.tar.gz .`
2. ส่งไฟล์ใหม่: `scp project.tar.gz teaingtit@100.96.9.50:/opt/wmscpp/`
3. แตกไฟล์บน server
   ```bash
   cd /opt/wmscpp
   tar -xvzf project.tar.gz
   rm project.tar.gz
   ```
4. รัน: `docker compose up -d --build`

## Monitoring & Troubleshooting

- **ดู Logs:** `docker compose logs -f`
- **เช็ค Resource:** `docker stats`
- **Restart App:** `docker compose restart`
- **กรณีรันไม่ขึ้น:** เช็ค `.env` ว่าค่า Supabase ถูกต้องหรือไม่ และเช็ค firewall ของ server ปิดพอร์ต 3000 หรือไม่
  (บน Local):
  tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cvzf project.tar.gz .
  scp project.tar.gz teaingtit@100.96.9.50:/opt/wmscpp/
  บน Server (SSH):
  cd /opt/wmscpp
  tar -xvzf project.tar.gz
  rm project.tar.gz
  docker compose up -d --build
