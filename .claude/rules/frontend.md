---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
---

# React Frontend Rules

## Code Style
- IMPORTANT: No comments - code should be self-documenting
- Remove existing comments when editing files
- Use descriptive component/function names instead

## Component Structure
- One component per file
- Co-locate styles, tests, and types with component
- Use barrel exports (index.ts) for directories

## State Management
- Server state: TanStack Query (React Query)
- Form state: React Hook Form or controlled inputs
- Global state: Zustand (minimal usage)

## Styling
- Use Tailwind CSS utility classes
- Extract repeated patterns to components, not CSS classes
- Use `clsx` or `tailwind-merge` for conditional classes

## Performance
- IMPORTANT: react-compiler handles optimization automatically
- Do NOT add manual memoization (useMemo, useCallback, React.memo)
- Trust the compiler for re-render optimization

## Async Data (CRITICAL)
- IMPORTANT: Never use sequential awaits - use `Promise.all()` for independent operations
- Bad: `const a = await getA(); const b = await getB();`
- Good: `const [a, b] = await Promise.all([getA(), getB()]);`

## Bundle Size (CRITICAL)
- IMPORTANT: Avoid barrel imports (import from index.ts) - import directly from source
- Bad: `import { Button } from '@/components';`
- Good: `import { Button } from '@/components/Button';`
- Use dynamic imports for heavy components: `const Chart = lazy(() => import('./Chart'));`

## Rendering
- Use Suspense boundaries strategically for progressive loading
- Prevent hydration mismatch: use `useEffect` for client-only values

## State Updates
- Use functional setState to prevent stale closures
- Bad: `setCount(count + 1)`
- Good: `setCount(prev => prev + 1)`

## Reference
- Full guide: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- Use context7 MCP for detailed patterns when needed
