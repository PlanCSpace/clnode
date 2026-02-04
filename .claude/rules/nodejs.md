---
paths:
  - "src/server/**/*.ts"
  - "src/api/**/*.ts"
  - "server/**/*.ts"
---

# Node.js Backend Rules

## API Design
- RESTful conventions: GET (list/get), POST (create), PUT (update), DELETE (delete)
- Consistent response format: `{ success, data, message }` or `{ ok, error }`
- Validate input at the boundary (request handlers), trust internal functions
- Return proper HTTP status codes (400 for bad input, 404 for not found, 500 for server errors)

## Error Handling
- Catch errors at the handler level, not deep in service functions
- Log errors with context (request ID, user, operation)
- Never expose stack traces or internal details to clients

## Database
- Use parameterized queries — never interpolate user input into SQL
- Keep queries in service/repository layer, not in route handlers
- Use transactions for multi-step operations

## Structure
- Route handler → Service → Repository/DB (layered architecture)
- Route handlers: parse input, call service, format response
- Services: business logic, no HTTP concepts (no req/res)
- Keep dependencies injectable for testing

## Security
- Validate and sanitize all external input
- Use environment variables for secrets, never hardcode
- Set appropriate CORS, rate limiting, and security headers
