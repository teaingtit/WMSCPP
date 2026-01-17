# GemWMS (my-wms-app)

This repository contains a Next.js 14-based warehouse management UI.

## Quick Start

### Development Mode

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

### Production Mode

This project uses **Next.js Standalone Output** mode for optimized production deployment.

1. Build the application:

```bash
npm run build
```

2. Run production server:

```bash
npm run start
# หรือ
node .next/standalone/server.js
```

> **Note:** เนื่องจากใช้ `output: 'standalone'` ใน `next.config.mjs` คำสั่ง `npm run start` จะรัน standalone server โดยอัตโนมัติ

## Available Scripts

- `npm run dev` — Run Next.js development server (with hot reload)
- `npm run build` — Build for production (creates standalone output)
- `npm run start` — Run production server (standalone mode)
- `npm run start:dev` — Run production server (standard Next.js mode, for testing only)
- `npm run lint` — Run ESLint checks
- `npm run format` — Run Prettier formatter
- `npm run check` — Run TypeScript type checking + ESLint
- `npm run test` — Run all tests (unit + e2e)
- `npm run test:unit` — Run unit tests with Vitest
- `npm run test:e2e` — Run end-to-end tests with Playwright

## Deployment

### Standalone Mode Benefits

This project is configured with `output: 'standalone'` which provides:

- 📦 **Smaller deployment size** - Only necessary files are included
- 🚀 **Faster deployment** - No need to upload entire `node_modules`
- 🐳 **Docker-friendly** - Perfect for containerization
- 💾 **Less disk space** - Optimized for production environments

### Quick Deploy with Automated Script

**Prerequisites:** Configure SSH alias first (one-time setup)

1. **Setup SSH config** (ครั้งแรกเท่านั้น):

   ```powershell
   # Create/edit SSH config
   notepad ~/.ssh/config
   ```

   Add this configuration:

   ```ssh-config
   Host home-server
       HostName 100.96.9.50
       User teaingtit
       Port 22
       IdentityFile ~/.ssh/id_rsa
   ```

   Test connection: `ssh home-server`

2. **Deploy with one command:**

   ```powershell
   .\deploy.ps1
   ```

   The script will automatically:

   - ✅ Test SSH connection
   - 📦 Create archive (excluding node_modules, .next, .git)
   - 📤 Upload to server
   - 🔧 Extract and build with Docker
   - 🏥 Verify deployment health

### Manual Deployment

For detailed step-by-step instructions, see:

```bash
# Full deployment workflow
.agent/workflows/deploy.md
```

Or deploy manually:

1. Build the project: `npm run build`
2. Copy `.next/standalone/` folder to your server
3. Copy `public/` folder to server (if you have static assets)
4. Copy `.next/static/` to server's `.next/static/`
5. Run: `node server.js` on the server

### Deployment Commands

```powershell
# Quick update (recommended)
.\deploy.ps1

# View logs
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml logs -f"

# Check status
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml ps"

# Restart application
ssh home-server "docker compose -f /opt/wmscpp/docker-compose.yml restart"
```

## CI/CD

A GitHub Actions workflow is included at `.github/workflows/ci.yml` that runs:

- Install dependencies
- TypeScript type checking
- ESLint linting
- Production build
