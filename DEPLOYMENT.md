# 🚀 Quick Deployment Guide

## ⚡ One-Time Setup (5 นาที)

### 1. ตั้งค่า SSH Config

```powershell
# เปิด SSH config file
notepad ~/.ssh/config
```

เพิ่ม configuration นี้:

```ssh-config
Host home-server
    HostName 100.96.9.50
    User teaingtit
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

**ทดสอบการเชื่อมต่อ:**

```powershell
ssh home-server
```

✅ ถ้าเชื่อมต่อได้ = สำเร็จ!

### 2. ตั้งค่า SSH Agent (Optional - แนะนำ)

ถ้าคุณใช้ SSH key ที่มี passphrase และไม่อยากพิมพ์ทุกครั้ง:

**เปิด PowerShell แบบ Administrator:**

```powershell
# เปิด ssh-agent
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
```

**กลับมา PowerShell ปกติ:**

```powershell
# เพิ่ม key เข้า agent (พิมพ์ passphrase ครั้งเดียว)
ssh-add ~/.ssh/id_ed25519
```

✅ ตอนนี้ไม่ต้องพิมพ์ passphrase อีก!

> 💡 **หมายเหตุ:** ทุกครั้งที่เปิดเครื่องใหม่ ต้องรัน `ssh-add` อีกครั้ง  
> ดูวิธี auto-load ใน `SSH-SETUP.md`

---

## 🎯 Deploy ครั้งแรก (First Time)

### 1. เตรียม Server (รันครั้งเดียว)

```bash
ssh home-server
sudo mkdir -p /opt/wmscpp
sudo chown -R $USER:$USER /opt/wmscpp
cd /opt/wmscpp
nano .env  # Copy จาก .env.local ของคุณ
exit
```

### 2. Deploy!

```powershell
.\deploy.ps1
```

✅ เสร็จแล้ว! เปิด http://100.96.9.50:3000

---

## 🔄 Update แอป (ทุกครั้งที่แก้โค้ด)

```powershell
.\deploy.ps1
```

**นั่นแหละ! แค่นี้เอง** 🎉

---

## 📊 คำสั่งที่ใช้บ่อย

### ดู Logs

```powershell
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml logs -f"
```

### เช็คสถานะ

```powershell
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml ps"
```

### Restart แอป

```powershell
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml restart"
```

### Stop แอป

```powershell
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml down"
```

### ทดสอบ Health

```powershell
curl http://100.96.9.50:3000/api/health
```

---

## 🐛 Troubleshooting

### ปัญหา: SSH connection failed

**แก้ไข:**

1. ตรวจสอบ `~/.ssh/config` ว่าถูกต้อง
2. ทดสอบ: `ssh home-server`
3. ถ้ายังไม่ได้ ลอง: `ssh teaingtit@100.96.9.50`

### ปัญหา: Container ไม่ขึ้น

**แก้ไข:**

```bash
ssh home-server
cd /opt/wmscpp
docker compose logs
# ดู error message แล้วแก้ตาม
```

### ปัญหา: Application ไม่ตอบสนอง

**แก้ไข:**

```bash
# เช็คว่า .env ถูกต้องหรือไม่
ssh home-server "cat /opt/wmscpp/.env"

# Restart
ssh home-server "cd /opt/wmscpp && docker compose restart"
```

---

## 📚 เอกสารเพิ่มเติม

- **SSH Passphrase Setup:** `SSH-SETUP.md` ⭐ แก้ปัญหาต้องพิมพ์ passphrase ทุกครั้ง
- **Full Deployment Guide:** `.agent/workflows/deploy.md`
- **SSH Config Example:** `.agent/workflows/ssh-config.example`
- **README:** `README.md`

---

## 💡 Tips

1. **ใช้ `.\deploy.ps1` เสมอ** - มันจะทำทุกอย่างให้อัตโนมัติ
2. **ดู logs ก่อนเสมอ** - ถ้ามีปัญหา logs จะบอก
3. **Backup `.env`** - เก็บไว้ที่ปลอดภัย อย่า commit ลง Git
4. **ทดสอบ local ก่อน** - รัน `npm run build` ให้ผ่านก่อน deploy

---

**Happy Deploying! 🚀**
