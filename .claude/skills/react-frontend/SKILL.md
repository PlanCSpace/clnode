---
name: react-frontend
description: React frontend development conventions for Orbis e-commerce platform
---

# Orbis React Frontend

## Tech Stack
- React 19 + TypeScript + Vite 7 + TailwindCSS 4
- Server state: TanStack Query (React Query)
- Client state: Zustand (minimal usage)
- Frontend port: 3000

## Code Style
- No comments in code - code must be self-documenting
- Remove existing comments when editing files
- Use descriptive component/function names instead

## Component Rules
- Functional components only
- One component per file
- Co-locate styles, tests, and types with component
- Use barrel exports (index.ts) for directories

## Performance (CRITICAL)
- react-compiler is enabled - do NOT use useMemo, useCallback, React.memo
- Trust the compiler for re-render optimization
- Use functional setState: `setCount(prev => prev + 1)` not `setCount(count + 1)`

## Async Data (CRITICAL)
- Never use sequential awaits - use `Promise.all()` for independent operations
- Bad: `const a = await getA(); const b = await getB();`
- Good: `const [a, b] = await Promise.all([getA(), getB()]);`

## Bundle Size (CRITICAL)
- Avoid barrel imports - import directly from source
- Bad: `import { Button } from '@/components';`
- Good: `import { Button } from '@/components/Button';`
- Use dynamic imports for heavy components: `const Chart = lazy(() => import('./Chart'));`

## Styling
- Use Tailwind CSS utility classes
- Extract repeated patterns to components, not CSS classes
- Use `clsx` or `tailwind-merge` for conditional classes

## Commands
- Dev: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`
- Lint: `cd frontend && npm run lint`
