# Test Architecture

## Structure

```
tests/           — Test infrastructure (setup, fixtures, mocks)
src/**/__tests__/ — Unit & integration tests (co-located with source)
e2e/             — End-to-end tests (Playwright)
scripts/         — Smoke tests
```

## Running Tests

```bash
pnpm run test          # Unit + integration (vitest)
pnpm run test:coverage # With coverage report
pnpm run test:e2e      # E2E (Playwright)
pnpm run test:e2e:ui   # E2E with UI mode
```

## Test Types

### Unit Tests (`vitest`)

- Pure logic: `lib/` — rate-limit, password hashing, AI functions
- Components: render + interaction with `renderWithProviders()`
- Schemas: Zod validation rules

### Integration Tests (`vitest`)

- API routes with real SQLite (better-sqlite3 in-memory)
- Mock external APIs (Replicate, GRS, Stripe)
- Pattern: extract handler → mock deps with `vi.hoisted()` → test

### E2E Tests (`playwright`)

- `page.route()` intercepts all API calls — no backend needed
- Helper functions in `e2e/helpers/mocks.ts`
- Focus: user flows, AARRR funnel

### Smoke Tests (`scripts/`)

- Run against production: `bash scripts/smoke-test.sh`
- Validates API response correctness, not just HTTP status

## Key Conventions

- Use `vi.hoisted()` for mock variables (Vitest hoisting)
- Extract route handlers as standalone exports for testability
- `#test/*` alias for test utilities
- `renderWithProviders()` for component tests (i18n + QueryClient)
