# PRD: Fix Analytics Hooks Tests After Supabase Migration

**Goal:** Fix failing unit tests after Supabase refactoring and ensure all lint, build, and E2E tests pass.

**Date:** 2026-01-22

---

## Context

After refactoring to use Supabase for read operations, 10 unit tests are failing in `analytics.hooks.test.tsx`. The root cause is a test structure issue where `describe("useCompletionHistory")` and `describe("useUpdatePastCompletion")` blocks are outside the `describe("Authenticated User (Remote API)")` block, losing access to `startDate`/`endDate` constants and the authenticated user mock setup.

### Current Status

| Check | Status |
|-------|--------|
| Lint (`bun run check`) | Passing |
| Types (`bun run check-types`) | Passing |
| Build (`bun run build`) | Passing |
| Unit Tests (`bun test`) | **10 failing** |
| E2E Tests | Not yet verified |

### Failing Tests

All in `apps/web/src/app/api/analytics/analytics.hooks.test.tsx`:

**ReferenceError: startDate is not defined (5 tests)**
- `useCompletionHistory > returns completion history for the date range`
- `useCompletionHistory > passes startDate and endDate to query options`
- `useCompletionHistory > returns isLoading true while fetching`
- `useCompletionHistory > returns isError true on failure`
- `useCompletionHistory > returns completion records with correct structure`

**Mock not called - missing authenticated user context (5 tests)**
- `useUpdatePastCompletion > Optimistic Updates > cancels outgoing queries on mutate`
- `useUpdatePastCompletion > Optimistic Updates > invalidates queries on success`
- `useUpdatePastCompletion > Optimistic Updates > updates analytics cache optimistically...`
- `useUpdatePastCompletion > Optimistic Updates > updates completion history cache optimistically`
- `useUpdatePastCompletion > Optimistic Updates > handles marking as incomplete (unchecking)`

---

## Phase 1: Fix Test Structure (parallel_group: 1)

- [x] Fix test scoping in `apps/web/src/app/api/analytics/analytics.hooks.test.tsx`
  - Remove premature closing `});` at line 287 that ends `describe("Authenticated User")` too early
  - Move `describe("useCompletionHistory")` block (lines 289-370) inside `describe("Authenticated User (Remote API)")`
  - Move `describe("useUpdatePastCompletion")` block (lines 372-649) inside `describe("Authenticated User (Remote API)")`
  - Add closing `});` after line 649 to properly close the Authenticated User block

---

## Phase 2: Verify Tests Pass (parallel_group: 2)

- [x] Run unit tests: `cd apps/web && bun run test -- --run` - expect 0 failures
- [x] Run E2E tests: `cd apps/web && bun run test:e2e` - verify all pass

---

## Phase 3: Final Verification (parallel_group: 3)

- [x] Run lint check: `bun run check`
- [x] Run type check: `bun run check-types`
- [x] Run build: `bun run build`

---

## Acceptance Criteria

- [x] All 10 failing unit tests now pass
- [x] No new test failures introduced
- [x] E2E tests pass
- [x] Lint passes (`bun run check`)
- [x] Types pass (`bun run check-types`)
- [x] Build succeeds (`bun run build`)

---

## Key Files

| File | Change |
|------|--------|
| `apps/web/src/app/api/analytics/analytics.hooks.test.tsx` | Fix describe block nesting structure |

---

## Notes

### Root Cause Analysis

The test file structure was broken during the Supabase migration commit (`9fef3ae`). The `describe("useAnalytics")` block was closed at line 248, but the parent `describe("Authenticated User (Remote API)")` block was also accidentally closed at line 287, leaving subsequent test blocks orphaned:

**Broken structure:**
```
describe("Analytics Hooks")
  describe("Authenticated User (Remote API)")  // startDate/endDate defined here
    describe("useAnalytics") { ... }
  });  // CLOSES at line 287 - too early!

  describe("useCompletionHistory") { ... }     // OUTSIDE - no access to startDate/endDate
  describe("useUpdatePastCompletion") { ... }  // OUTSIDE - no authenticated user mock
});
```

**Fixed structure:**
```
describe("Analytics Hooks")
  describe("Authenticated User (Remote API)")  // startDate/endDate defined here
    describe("useAnalytics") { ... }
    describe("useCompletionHistory") { ... }     // INSIDE - has access
    describe("useUpdatePastCompletion") { ... }  // INSIDE - has auth mock
  });  // Closes after all authenticated user tests
});
```
