# GemWMS (My-WMS-App)

Modern Warehouse Management System (WMS) built with **Next.js 16**.

## 🚀 Key Features

- **Dashboard:** Real-time overview of warehouse operations.
- **Inventory Visualization:** **2.5D Interactive Map** for warehouse layout and stock positioning.
- **Operations:**
  - **Inbound:** Receive goods, manage lots/batches.
  - **Outbound:** Pick & Pack, validate stock.
  - **Transfer:** Move stock between bins/locations with "From -> To" workflow.
- **Multi-Warehouse:** Manage multiple sites/zones.
- **Role-Based Access:** Admin, Manager, Staff roles (via Supabase Auth).
- **Scheduled Reports:** Email reports (inventory summary, transaction summary) on a cron schedule; see [docs/scheduled-reports.md](./docs/scheduled-reports.md).
- **Offline Support:** Service worker and offline fallback for limited offline use.
- **Responsive Design:** Optimized for Desktop and Tablet use.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Database:** Supabase (PostgreSQL)
- **UI Library:** Shadcn UI, TailwindCSS, Lucide Icons
- **Language:** TypeScript
- **Testing:**
  - **Unit:** Vitest
  - **E2E:** Playwright
- **Others:** Zod (Validation), Date-fns

## 🏗️ Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3006](http://localhost:3006) with your browser. (Dev server runs on port 3006.)

### Production Build

```bash
npm run build
npm run start
```

## 📦 Deployment

This project uses **Next.js Standalone Output** for optimized Docker deployment.

### Automated Deployment (Recommended)

Use the included PowerShell script to deploy to your server (requires SSH config):

```powershell
.\deploy.ps1        # update (default; fast)
.\deploy.ps1 full   # full rebuild (no cache)
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full details.

## 🧪 Testing

```bash
# Run Unit Tests
npm run test:unit

# Run E2E Tests
npm run test:e2e

# Run E2E with lower RAM (uses production build instead of dev server)
npm run test:e2e:low-memory

# Or use the E2E script (PowerShell on Windows)
.\run-e2e.ps1              # ปกติ
.\run-e2e.ps1 -LowMemory   # กิน RAM น้อย (production server)
.\run-e2e.ps1 -ExistingServer  # ใช้ server ที่รันอยู่แล้ว (รัน npm run dev ไว้ก่อน)
.\run-e2e.ps1 -UnitFirst   # รัน unit test ก่อน แล้วค่อย E2E

# Linux/macOS: ./scripts/run-e2e.sh [--low-memory] [--existing-server] [--unit-first]

# Kill test-related processes (free RAM when processes are left behind)
npm run kill-test-processes
# Or: .\kill-test-processes.ps1 [ -DryRun ] [ -IncludeBrowser ]
# Linux/macOS: ./scripts/kill-test-processes.sh [--dry-run] [--include-browser]

# Run Type Check & Lint
npm run check
```

## 📂 Project Structure

- `src/app`: Next.js App Router pages & layouts.
- `src/actions`: Server Actions (Data mutations).
- `src/components`: React components (UI, features).
- `src/lib`: Utilities, database clients, helpers.
- `src/types`: TypeScript definitions.
- `e2e`: Playwright E2E tests.
