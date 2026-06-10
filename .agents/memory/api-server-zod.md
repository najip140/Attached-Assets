---
name: API server zod import
description: How to use zod in api-server routes
---

## Rule
`zod` must be listed as a direct dependency in `artifacts/api-server/package.json` for routes that import it directly.

## Why
The api-server's `package.json` did not include `zod` — only `@workspace/api-zod` (which wraps it). When new routes imported `import { z } from "zod"` directly, esbuild failed with "Could not resolve zod".

## How to apply
- Always add `"zod": "catalog:"` to `artifacts/api-server/package.json` dependencies if writing new routes with inline Zod schemas.
- After adding, run `pnpm install` at workspace root before restarting the workflow.
- Alternative: import Zod schemas from `@workspace/api-zod` instead of defining them inline.
