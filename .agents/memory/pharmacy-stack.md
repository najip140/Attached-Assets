---
name: Pharmacy stack and conventions
description: Architecture decisions for the PharmaCare management system monorepo
---

## Stack
- **Frontend**: `artifacts/pharmacy` — React + Vite, Tailwind, shadcn/ui, wouter routing, react-query
- **Backend**: `artifacts/api-server` — Express 5, pino logging, JWT auth (Bearer token)
- **DB**: `lib/db` — PostgreSQL + Drizzle ORM; push schema with `pnpm --filter @workspace/db run push-force`
- **API contract**: `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen` → generates `lib/api-client-react` and `lib/api-zod`

## Role permissions
- **Cashier**: POS only
- **Pharmacist**: POS + Products/Inventory/Loss Management (view+add)
- **Admin**: full access including Documents, End of Day, Reports, Users

Both layers enforced: frontend via `ProtectedRoute` component (roles prop), backend via `requireRole()` middleware in `artifacts/api-server/src/lib/auth.ts`.

## Currency
All currency displays use **ETB** (Ethiopian Birr), not $.

## Document storage
Documents stored as files in `artifacts/api-server/uploads/documents/` with metadata in `documentsTable`. Frontend sends base64-encoded file data in JSON body; backend decodes and writes to disk.

## New pages added
- `/documents` — Admin only
- `/end-of-day` — Admin only
- `/inventory-loss` — Admin + Pharmacist

**Why:** These follow the role-permission model where operational staff (cashier/pharmacist) have narrow access and admin has full visibility.
