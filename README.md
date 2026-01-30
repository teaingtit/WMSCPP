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

Open [http://localhost:3000](http://localhost:3000) with your browser.

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
.\deploy.ps1
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full details.

## 🧪 Testing

```bash
# Run Unit Tests
npm run test:unit

# Run E2E Tests
npm run test:e2e

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
