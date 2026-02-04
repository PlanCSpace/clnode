---
paths:
  - "src/server/**/*.ts"
  - "src/cli/**/*.ts"
---

# TypeScript Backend Rules

## Code Style
- IMPORTANT: No comments - code should be self-documenting
- Remove existing comments when editing files
- Use descriptive function/variable names instead
- ESM only (import/export), no CommonJS (require)

## Hono Patterns
- Use `Hono()` sub-apps per route group, mount with `app.route()`
- Return `c.json()` for all API responses
- Use path params via `c.req.param()`, query via `c.req.query()`
- Parse body with `c.req.json()`

## DuckDB Patterns
- Use `duckdb-async` — always `await db.run()` for writes, `await db.all()` for reads
- Use parameterized queries (?) — never string interpolation for SQL
- Use `now()` for timestamp defaults (not `current_timestamp`)
- Use `ON CONFLICT ... DO UPDATE` for upserts

## Error Handling
- Wrap route handlers in try/catch
- Return `{ ok: false, error: message }` with appropriate status codes
- Log errors to console with context prefix: `[module] Error: ...`

## File Organization
- One service per domain entity (session, agent, task, etc.)
- Routes grouped by purpose (hooks, api, ws)
- Services import `getDb()` from `../db.js` — always use `.js` extension in imports