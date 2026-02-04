---
paths:
  - "backend/**/*.rs"
---

# Rust Backend Rules

## Code Style
- IMPORTANT: No comments - code should be self-documenting
- Remove existing comments when editing files
- Exception: `//!` and `///` doc comments for public APIs only if required

## Error Handling
- Use `thiserror` for custom error types
- Use `anyhow` for internal error propagation
- Map errors to proper HTTP status codes in middleware

## API Design
- RESTful conventions: GET (list/get), POST (create), PUT (update), DELETE (delete)
- Pagination: `page` and `limit` query params
- Response format: `{ "success": bool, "data": T, "message": string }`

## Testing
- Unit tests in same file with `#[cfg(test)]` module
- Integration tests in `tests/` directory
- Use `sqlx::test` macro for DB tests

## Utoipa (Swagger)
- All endpoints must have `#[utoipa::path]` attribute
- Define schemas with `#[derive(ToSchema)]`
- Group endpoints by tag
