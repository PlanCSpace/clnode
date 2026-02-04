---
name: e2e-testing
description: E2E testing conventions for Orbis using Playwright
---

# Orbis E2E Testing

## Tech Stack
- Playwright
- Base URL: `https://orbis.oneflux.io` (Cloudflare tunnel)

## Rules
- Write test code in `frontend/e2e/` directory
- Follow existing test patterns in the codebase
- No comments in test code
- Do NOT start local servers - they are already running

## Commands
- Run all tests: `cd frontend && npm run test:e2e`

## Test Structure
- Use descriptive test names that explain the behavior being tested
- Group related tests with `describe` blocks
- Use page object patterns when tests share common interactions
- Prefer user-visible selectors (role, text, label) over CSS selectors
