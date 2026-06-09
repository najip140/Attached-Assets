# PharmaCare Management System

A full-stack pharmacy management system with JWT-based role access, POS, inventory, expiry tracking, and financial reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Recharts, date-fns, wouter, next-themes
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, suppliers, products, sales, stock_movements)
- `lib/api-client-react/` — generated React Query hooks + Zod schemas (do not edit by hand)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/pharmacy/src/pages/` — React page components
- `artifacts/pharmacy/src/components/Layout.tsx` — sidebar + nav
- `scripts/src/seed.ts` — demo data seeder

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks. Never write raw fetches in the frontend.
- JWT auth via `SESSION_SECRET` env var. Token stored in `localStorage` under `pharmacy_token`. `setAuthTokenGetter` from `@workspace/api-client-react` attaches it to every API call.
- Drizzle `numeric` columns (purchasePrice, sellingPrice, unitPrice) are stored as strings in PostgreSQL — always cast with `Number()` when reading, `String()` when writing via Drizzle insert/update.
- Role-based visibility: admin sees all 8 nav items; pharmacist sees all except Users; cashier sees only Dashboard, POS, and Inventory.

## Product

- **Login** — JWT auth with demo credential shortcuts (admin/pharmacist/cashier)
- **Dashboard** — today's sales, monthly revenue, low-stock alerts, 7-day bar chart
- **Point of Sale** — product search → cart → discount → checkout → printable receipt
- **Products** — CRUD with category/stock filters, supplier linking, expiry dates
- **Inventory** — stock movement log (in/out/adjustment) with per-product filter
- **Expiry** — expired vs expiring-within-N-days tables with colour-coded badges
- **Reports** — daily + monthly breakdowns: revenue, profit, category pie chart, top products
- **Users** — admin-only user CRUD with role assignment
- **Suppliers** — supplier directory with contact info

## Demo credentials

| Role       | Username  | Password  |
|------------|-----------|-----------|
| Admin      | admin     | admin123  |
| Pharmacist | dr_sarah  | pharm123  |
| Cashier    | cashier1  | cash123   |

## Gotchas

- Run `pnpm run typecheck:libs` before leaf artifact checks whenever `lib/db` schema changes.
- Drizzle `numeric` columns must be coerced: `String()` on insert, `Number()` when reading.
- Do NOT use raw `sql\`table alias\`` as Drizzle FROM clause — use the actual table reference and Drizzle joins.
- After codegen (`pnpm --filter @workspace/api-spec run codegen`), restart Vite to pick up new hook exports.

## User preferences

_Populate as you build._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
