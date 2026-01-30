# 🚀 Deployment Guide

This project is configured for **automated deployment** using a PowerShell script that orchestrates the build and release process to a Linux server via Docker.

## 📋 Prerequisites

### Local Environment (Your Machine)

- **PowerShell**: For running the automation script.
- **SSH Client**: Configured and working.
- **Tar**: For archiving the project (available in Git Bash or standard Windows 10+).

### Server Environment (`home-server`)

- **Docker & Docker Compose**: Installed and running.
- **Directory**: `/opt/wmscpp` created and writable by your user.
- **Environment**: `.env` file must exist in `/opt/wmscpp/.env`.

---

## 🛠️ Automated Deployment

We use a helper script `deploy.ps1` to handle everything.

### Usage

```powershell
.\deploy.ps1
```

### How it Works (Under the Hood)

The script performs the following 6 atomic steps:

1.  **Connection Test**: Pings the server via SSH to ensure connectivity.
2.  **Packaging**: Creates a lightweight `project.tar.gz` archive.
    - _Excludes_: `node_modules`, `.next`, `.git`, `.env.local` to keep uploads fast (~2MB).
3.  **Upload**: SCPs the archive to `/opt/wmscpp/`.
4.  **Remote Execution**: Connects via SSH to:
    - Extract the new code.
    - Remove the archive.
    - Run `docker compose up -d --build` to rebuild the container with the new code.
5.  **Status Check**: Verifies the Docker container state is `running`.
6.  **Health Check**: Pings `http://<server-ip>:3000/api/health` to confirm the app is responsive.

---

## ⚡ One-Time Setup

### 1. SSH Config

Add this to your `~/.ssh/config` file to create the `home-server` alias:

```ssh-config
Host home-server
    HostName 100.96.9.50
    User teaingtit
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
```

### 2. Server Prep

Run these commands locally to prepare the remote directory:

```bash
ssh home-server "sudo mkdir -p /opt/wmscpp && sudo chown -R $USER:$USER /opt/wmscpp"
```

### 3. Environment Secrets

**CRITICAL:** You must manually create the `.env` file on the server. The deployment script _intentionally_ does not upload your local secrets for security.

```bash
# SSH into server and create .env
ssh home-server
nano /opt/wmscpp/.env
```

Paste your production variables (Supabase keys, Auth secrets, etc.).

---

## 🐛 Troubleshooting

### Common Failure Points

#### ❌ "SSH connection failed"

- **Cause:** VPN is down, wrong IP, or SSH key permission issue.
- **Fix:** Try `ssh home-server` manually. If that fails, the script will fail.

#### ❌ "Upload failed"

- **Cause:** Permission denied on `/opt/wmscpp`.
- **Fix:** Run `sudo chown -R $USER:$USER /opt/wmscpp` on the server.

#### ❌ "Container is running" but App is down

- **Cause:** Runtime error (likely missing env vars).
- **Fix:** Check container logs:
  ```powershell
  ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml logs -f"
  ```

#### ❌ "Health Check Failed"

- **Cause:** The app started but is crashing or slow to initialize.
- **Fix:** Wait 10s and check logs. If using Supabase, ensure the server can reach Supabase APIs.

---

## 📊 Management Commands

Useful shortcuts for managing the production instance:

```powershell
# Live Logs
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml logs -f"

# Restart Container
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml restart"

# Stop System
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml down"
```
