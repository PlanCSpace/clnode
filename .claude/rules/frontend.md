---
paths:
  - "src/web/**/*.tsx"
  - "src/web/**/*.ts"
---

# Web UI Rules (Phase 2)

## Code Style
- IMPORTANT: No comments - code should be self-documenting
- Remove existing comments when editing files
- Use descriptive component/function names instead

## WebSocket
- Connect to `ws://localhost:3100/ws` for real-time events
- Parse incoming messages as `{ event, data, timestamp }`
- Reconnect on disconnect with exponential backoff

## Data Fetching
- Fetch from `/api/*` endpoints
- Use `Promise.all()` for independent requests — never sequential awaits

## Component Structure
- One component per file
- Functional components only
- Use Tailwind CSS for styling