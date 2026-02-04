---
paths:
  - "src/**/*.tsx"
  - "src/**/*.jsx"
---

# React Rules

## Components
- One component per file
- Keep components small and focused (single responsibility)
- Use semantic HTML and proper ARIA attributes
- Handle loading, error, and empty states

## State
- Use functional setState to prevent stale closures
- Bad: `setCount(count + 1)`
- Good: `setCount(prev => prev + 1)`
- Lift state only when necessary — colocate state with its consumer

## Performance
- Do NOT add manual memoization (useMemo, useCallback, React.memo) unless profiled
- Use dynamic imports for heavy components: `lazy(() => import('./Heavy'))`
- Avoid creating objects/arrays in JSX props (causes re-renders)

## Styling
- Use Tailwind CSS utility classes
- Extract repeated patterns to components, not CSS classes
- Use `clsx` or `tailwind-merge` for conditional classes

## Data Fetching
- Use a data fetching library (TanStack Query, SWR) for server state
- Keep form state local (React Hook Form or controlled inputs)
- Separate server state from UI state
