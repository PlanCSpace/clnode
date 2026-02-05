---
name: react-frontend
description: clnode Web UI development — React 19 + Vite 7 + TailwindCSS 4 dashboard, agent tree, context viewer
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
skills:
  - react-frontend
  - compress-context
---

# clnode React Frontend (Web UI)

## Pages
- **Dashboard**: stats cards, active sessions, recent activity, WebSocket LIVE indicator
- **Agents**: agent tree (parent-child), status filter, context summary
- **Context**: session selector, full-text search (content/type/tags)
- **Tasks**: 3-column kanban (pending/in_progress/completed)
- **Activity**: event log + file changes tabs, event type filter

## API Base URL
- Development: `http://localhost:3100`
- Production: same origin (Hono serves static)

## Commands
- Dev: `cd web && pnpm dev`
- Build: `cd web && pnpm build`

## Before Returning
Return a **compressed summary** (max 300 chars):
1. What you accomplished (1 sentence)
2. Key decisions or findings (1 sentence)
3. Blockers/handoffs if any

Do NOT return full reports. Leader only needs concise summary.