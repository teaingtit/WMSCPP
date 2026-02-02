# Deployment Guide

This project uses **registry-based deployment**: build a Docker image locally, push to GitHub Container Registry (GHCR), then the server pulls and runs it. No source code or build step runs on the server.

## Prerequisites

### Local Environment

- **PowerShell**: For running the deploy script
- **Docker Desktop**: Installed and running (for build and push)
- **SSH Client**: Configured for the target server

### Server Environment (`home-server`)

- **Docker & Docker Compose**: Installed and running
- **Directory**: `/opt/wmscpp` created and writable
- **Environment**: `.env` file at `/opt/wmscpp/.env` with production Supabase keys

---

## One-Time Setup

### 1. GHCR Authentication

To push images to GitHub Container Registry, log in once:

```powershell
docker login ghcr.io -u YOUR_GITHUB_USERNAME
```

Use a GitHub **Personal Access Token** (classic) with scope: `read:packages`, `write:packages`.

Create a token: GitHub → Settings → Developer settings → Personal access tokens.

### 2. SSH Config

Add to `~/.ssh/config`:

```ssh-config
Host home-server
    HostName 100.96.9.50
    User teaingtit
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
```

### 3. Server Prep

```powershell
ssh home-server "sudo mkdir -p /opt/wmscpp && sudo chown -R `$USER:`$USER /opt/wmscpp"
```

### 4. Server `.env`

Create `/opt/wmscpp/.env` on the server (not uploaded by the script):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Deployment Flow

```
Local: docker build → docker push (ghcr.io)
Server: docker compose pull → docker compose up -d
```

### Usage

```powershell
# Normal deploy (reuses Docker cache)
.\deploy.ps1

# Clean rebuild (no cache)
.\deploy.ps1 full
```

| Mode     | Use case                                   |
| -------- | ------------------------------------------ |
| `update` | Regular deploys; faster (uses build cache) |
| `full`   | After Dockerfile or dependency changes     |

### Steps (automatic)

1. **Verify Docker** – Ensure Docker is running locally
2. **Build** – `docker build -t ghcr.io/teaingtit/wmscpp:latest .`
3. **Push** – `docker push` to GHCR
4. **SSH test** – Confirm connectivity to server
5. **Deploy** – Upload `docker-compose.yml`, then `docker compose pull && up -d` on server
6. **Status & health** – Verify container and `/api/health`

---

## Image Name

Default: `ghcr.io/teaingtit/wmscpp:latest`

Override with:

```powershell
$env:WMSCPP_IMAGE = "ghcr.io/your-org/wmscpp:v1.0"
.\deploy.ps1
```

---

## Database Migrations

After deploying, run any new SQL migrations in Supabase:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run the contents of `database/inventory-position-pagination.sql` (for position-aware inventory pagination)

Without this migration, inventory falls back to row-based pagination (items at the same position may appear on separate pages).

---

## Troubleshooting

### "Docker push failed"

- Run `docker login ghcr.io` and use a PAT with `write:packages`
- Check repo visibility: public images can be pulled without login on the server

### "SSH connection failed"

- Ensure VPN is on if needed
- Test: `ssh home-server`

### Private repo / image

If the image is private, on the server run:

```bash
docker login ghcr.io -u USERNAME
```

Use a PAT with `read:packages`.

### "Container(s) running" but app is down

Check logs:

```powershell
ssh home-server "cd /opt/wmscpp && docker compose logs -f"
```

### Health check fails

Wait 10–15 seconds for startup. Confirm Supabase env vars in `.env` and that the server can reach Supabase APIs.

---

## Management Commands

```powershell
# Live logs
ssh home-server "cd /opt/wmscpp && docker compose logs -f"

# Restart
ssh home-server "cd /opt/wmscpp && docker compose restart"

# Stop
ssh home-server "cd /opt/wmscpp && docker compose down"
```
