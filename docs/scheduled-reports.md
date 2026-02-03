# Scheduled Reports (รายงานอัตโนมัติ)

## Overview

Scheduled reports send inventory summary and transaction summary emails to configured recipients on a cron schedule. The flow uses:

- **App**: Settings → รายงานอัตโนมัติ tab to create/edit schedules (per warehouse).
- **Supabase Edge Function**: `scheduled-report` generates the report and sends email via Resend.
- **Cron**: An external trigger (or Supabase cron) calls the Edge Function on an interval; the function evaluates which schedules are due and sends only those.

## Environment

### Next.js (app)

- `NEXT_PUBLIC_SUPABASE_URL` – Used by the "Run now" action to call the Edge Function. Required for triggering reports from the UI.

### Supabase Edge Function secrets

Set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or via CLI):

| Secret              | Required | Description                                                                                 |
| ------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`    | Yes      | Resend API key for sending email.                                                           |
| `REPORT_FROM_EMAIL` | No       | Sender address (e.g. `reports@yourdomain.com`). Defaults to `reports@example.com` if unset. |

Resend must verify the sending domain for production.

## Edge Function URL

The function is invoked by HTTP POST. Base URL (replace with your project ref if different):

```
https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-report
```

- **Run all due schedules**: `POST` with body `{}` or `{"schedule_id": null}`.
- **Run one schedule**: `POST` with body `{"schedule_id": "<uuid>"}`.

The function does not require JWT (`verify_jwt: false`) so it is intended to be called by a trusted cron or your backend. Do not expose this URL to untrusted clients; use the app’s "Run now" (which checks manager access) for user-triggered runs.

## Setting up cron

The Edge Function does **not** evaluate cron expressions itself; it runs whatever you pass it (all active schedules or one `schedule_id`). To run schedules on time you need a job that calls the function on an interval (e.g. every 15 minutes) and optionally filters by due time in your own logic, or you run all active schedules each time and let Resend/recipients handle frequency.

Options:

1. **Supabase pg_cron** (if enabled): use `pg_net` or `http` to POST to the Edge Function URL on a schedule.
2. **External cron** (GitHub Actions, cron job, Vercel Cron, etc.): call the URL every 15–60 minutes with `POST` and empty body `{}` to process active schedules.
3. **Manual / "Run now"**: from Settings → รายงานอัตโนมัติ, use the play button to run a schedule once.

Example (run every 15 minutes via cron):

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-report" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Database

- Table: `public.report_schedules`.
- RLS: Admins have full access; managers can only manage schedules for warehouses in their `user_roles.allowed_warehouses`.
- Index: `idx_report_schedules_active` on `(is_active) WHERE is_active = true` for the function’s query.

## Report types

| Type                  | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `INVENTORY_SUMMARY`   | Summary of stock levels, product count, category breakdown. |
| `TRANSACTION_SUMMARY` | Last 7 days: inbound, outbound, transfer counts.            |

All emails are in Thai and sent via Resend using the configured templates in the Edge Function.
