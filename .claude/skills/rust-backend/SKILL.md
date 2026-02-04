---
name: rust-backend
description: Rust backend development conventions for Orbis e-commerce platform
---

# Orbis Rust Backend

## Tech Stack
- Rust 2024, Axum 0.8, SQLx 0.8, PostgreSQL
- Keeper (main server) port: 8080, OpenAPI port: 8082

## Code Style
- No comments in code - code must be self-documenting
- Remove existing comments when editing files
- Exception: `//!` and `///` doc comments for public APIs only if required
- clippy pedantic is enabled - follow all warnings

## Error Handling
- Use `anyhow::Result` for internal error propagation
- Use `thiserror` for custom error types
- Map errors to proper HTTP status codes in middleware

## API Design
- RESTful conventions: GET (list/get), POST (create), PUT/PATCH (update), DELETE (delete)
- Pagination: `page` and `limit` query params
- Response format: `{ "success": bool, "data": T, "message": string }`

## Utoipa (Swagger)
- All endpoints must have `#[utoipa::path]` attribute
- Define schemas with `#[derive(ToSchema)]`
- Group endpoints by tag

## Commands
- Build: `cd backend && cargo build`
- Test: `cd backend && cargo test`
- Lint: `cd backend && cargo clippy`
- Run: `cd backend && cargo run --bin keeper`
- OpenAPI: `cd backend && cargo run --bin open_api`
- Migration: `cd backend && sqlx migrate run`
