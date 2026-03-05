# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a data sync system that pulls from the **JobMan API** and writes to **Google Sheets** for Inspire Kitchens. It exposes a Next.js web dashboard for manual sync triggers and real-time log streaming, plus a CLI script for automated/scheduled runs.

## Commands

All commands run from the `dashboard/` directory:

```bash
npm run dev        # Start Next.js dev server (http://localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run sync-all   # CLI: run full sync (tsx scripts/sync-all.ts)
npm run compare    # CLI: compare datasets (tsx scripts/compare.ts)
```

There are no tests configured.

## Architecture

### Core Data Flow

```
JobMan API → sync modules → Google Sheets
```

Four sync modules in [dashboard/lib/sync/sync/](dashboard/lib/sync/sync/): `quotes.ts`, `leads.ts`, `jobs.ts`, `invoices.ts`. Each module fetches paginated data, enriches it with lookups (contacts, staff, members), and returns a flat array of rows.

**Triggered two ways:**
1. **Web UI** — `POST /api/sync` ([dashboard/app/api/sync/route.ts](dashboard/app/api/sync/route.ts)) streams logs via Server-Sent Events
2. **CLI** — [dashboard/scripts/sync-all.ts](dashboard/scripts/sync-all.ts) runs a full sync and exits

### API Clients

**JobMan client** ([dashboard/lib/sync/api/jobman.ts](dashboard/lib/sync/api/jobman.ts)):
- Rate-limited to 30 req/min via `p-queue`
- Retries on 429 and 5xx (up to 3 attempts)
- Caches contacts, staff, leads, jobs, and lookup tables (types, sources, priorities, statuses) in `Map`s to avoid redundant calls
- Pagination: 50 items/page by default; uses `limit` param to cap results during test syncs
- Key methods: `getQuotes/Leads/Jobs/Invoices()`, `getContactWithDetails()`, `getLeadMembers()`, `getJobMembers()`, `getStaffMember()`

**Google Sheets client** ([dashboard/lib/sync/api/google.ts](dashboard/lib/sync/api/google.ts)):
- JWT service account auth via `google-auth-library`
- `updateSheet(sheetTitle, data)` clears and rewrites the entire sheet each sync
- Row 1: "Date Exported:" + date; Row 2: headers; Rows 3+: data

### Google Sheets Layout

Four sheets: `Jobman Data - Quotes`, `Jobman Data - Leads`, `Jobman Data - Jobs`, `Jobman Data - Invoices`.

### Dashboard UI

[dashboard/app/page.tsx](dashboard/app/page.tsx) — password-protected (hardcoded: `"InspireKitchens"`), persisted in `localStorage`. Lets the user pick which modules to sync, set a row limit (5/10/20/50 or full), and watch streaming logs in real time.

## Environment Variables

Copy `.env.template` to `.env` in the `dashboard/` directory:

```
JOBMAN_API_KEY=          # Personal access token
JOBMAN_ORG_ID=           # Organisation ID
GOOGLE_SHEET_ID=         # Spreadsheet ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=      # PEM key with \n escaped as literal \n
SYNC_INTERVAL_MINUTES=60 # Optional
```

## Key Conventions

- **Deleted record filtering**: pass `trashed=false` (or equivalent) when fetching from JobMan. Recent bugs have involved forgetting this — check each sync module's fetch call.
- **Pagination**: The `limit` param caps the number of *pages* fetched, not individual records. A `null` limit means full sync. Bugs have occurred when limit logic was applied incorrectly across modules.
- **Member/role resolution**: Team members are resolved via a tasks endpoint first, with a direct members endpoint as fallback. Roles are matched by name keywords (e.g., "CNC Operator", "Designer").
- **Date formatting**: Dates are output as `DD/MM/YYYY`. Use the shared formatting pattern already present in each sync module.
- **API docs**: [api_structure.md](api_structure.md) documents the JobMan API shape. [google_sheet_structure.md](google_sheet_structure.md) documents the expected column layout for each sheet.
