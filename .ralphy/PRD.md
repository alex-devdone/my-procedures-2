# PRD: Fix Toggle Todos Logic for Recurring Todos

**Goal:** Fix recurring todo toggle behavior so completing an occurrence only records completion without creating a new todo
**Date:** 2026-01-22

---

## Context

Currently, when toggling a recurring todo (e.g., daily task), the `completeRecurring` mutation marks the todo as completed AND creates a new todo for the next occurrence. This is incorrect behavior for Today/Upcoming/Overdue views where users expect to toggle specific occurrences.

### Stack
- **Frontend:** Next.js 16, React 19, shadcn/ui, React Query
- **Backend:** tRPC, Drizzle ORM, PostgreSQL
- **Key patterns:** Entity-based API structure in `apps/web/src/app/api/`

### Key Insight
The `updatePastCompletion` tRPC procedure (lines 823-900 in `packages/api/src/routers/todo.ts`) already handles occurrence toggling correctly - it inserts/updates `recurringTodoCompletion` records without creating new todos. We just need to route the toggle function to use it for recurring instances in smart views.

---

## Phase 1: Foundation - Types & API Layer (parallel_group: 1)

- [x] Update `UseTodoStorageReturn.toggle` signature in `apps/web/src/app/api/todo/todo.types.ts` to accept optional `options?: { virtualDate?: string }` parameter
- [x] Add `getUpdatePastCompletionMutationOptions` function to `apps/web/src/app/api/todo/todo.api.ts` if not already present (wraps `trpc.todo.updatePastCompletion`)

---

## Phase 2: Core Implementation - Hook & Toggle Logic (parallel_group: 2)

- [x] Add `updatePastCompletionMutation` with optimistic updates in `apps/web/src/app/api/todo/todo.hooks.ts` following the pattern of existing mutations (cancel queries, update cache, rollback on error)
- [x] Modify `toggle` function in `apps/web/src/app/api/todo/todo.hooks.ts` (lines 348-386) to check for `options.virtualDate` - if provided with recurring todo, use `updatePastCompletion` instead of `completeRecurring`
- [x] Update local storage toggle logic in `apps/web/src/lib/local-todo-storage.ts` to support `toggleLocalOccurrence(todoId, scheduledDate, completed)` for guest users

---

## Phase 3: View Component Integration (parallel_group: 3)

- [x] Update `handleToggleTodo` in `apps/web/src/components/views/today-view.tsx` to detect virtual recurring instances and pass `{ virtualDate: entry.virtualDate }` when calling `onToggle`
- [x] Update `handleToggleTodo` in `apps/web/src/components/views/upcoming-view.tsx` to pass `virtualDate` for virtual recurring instances
- [x] Update `handleToggleTodo` in `apps/web/src/components/views/overdue-view.tsx` to pass `virtualDate` for missed recurring occurrences
- [x] Verify folder views (`apps/web/src/components/folders/folder-content.tsx`) continue using existing behavior (no virtualDate = creates next occurrence)

---

## Phase 4: E2E Tests (parallel_group: 4)

- [x] Add E2E test in `apps/web/e2e/recurring-views.spec.ts`: "Today view: toggling recurring todo marks occurrence complete without creating new todo" - create daily recurring, toggle in Today, verify no new todo in Inbox, verify occurrence shows completed
- [x] Add E2E test: "Today view: toggle recurring occurrence back to incomplete" - toggle completed occurrence, verify it shows as active again
- [x] Add E2E test: "Upcoming view: toggling future occurrence marks it complete" - create daily recurring, toggle tomorrow's occurrence, verify shows completed, original todo unchanged
- [x] Add E2E test: "Overdue view: toggling missed occurrence retroactively completes it" - create recurring with past due date, navigate to Overdue, toggle, verify marked completed
- [x] Add E2E test: "Folder view: completing recurring todo creates next occurrence" - create recurring in folder, complete via folder view, verify new todo created (existing Inbox behavior)
- [x] Add E2E test: "Toggle persistence: recurring occurrence completion persists after reload" - toggle occurrence, reload, verify status persisted

---

## Phase 5: Quality Assurance (parallel_group: 5)

- [x] Run `bun run check-types` and fix any TypeScript errors
- [x] Run `bun run check` and fix any Biome linting/formatting issues
- [x] Run `bun run test` and ensure all unit tests pass
- [x] Run `bun run test:e2e` and ensure all E2E tests pass including new toggle tests

---

## Acceptance Criteria

- [x] Toggling a recurring todo in Today view only records the occurrence completion (no new todo created)
- [x] Toggling a recurring todo in Upcoming view marks future occurrence as complete
- [x] Toggling a recurring todo in Overdue view retroactively marks missed occurrence as completed
- [x] Toggling in folder/Inbox views maintains existing behavior (creates next occurrence)
- [x] Guest users (localStorage) have same toggle behavior as authenticated users
- [x] All tests pass (`bun run test`)
- [x] No type errors (`bun run check-types`)
- [x] Linting passes (`bun run check`)
- [x] Build succeeds (`bun run build`)
- [x] All new E2E tests pass (`bun run test:e2e`)

---

## Notes

### Key Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/api/todo/todo.types.ts` | Update toggle signature type |
| `apps/web/src/app/api/todo/todo.api.ts` | Add mutation options wrapper |
| `apps/web/src/app/api/todo/todo.hooks.ts` | Update `toggle` function, add mutation |
| `apps/web/src/lib/local-todo-storage.ts` | Add `toggleLocalOccurrence` for guest users |
| `apps/web/src/components/views/today-view.tsx` | Pass `virtualDate` on toggle |
| `apps/web/src/components/views/upcoming-view.tsx` | Pass `virtualDate` on toggle |
| `apps/web/src/components/views/overdue-view.tsx` | Pass `virtualDate` on toggle |
| `apps/web/e2e/recurring-views.spec.ts` | Add comprehensive E2E tests |

### Virtual Todos
Virtual todos (`VirtualTodo` type) have a `virtualDate` property that identifies which occurrence they represent. Views already create these for displaying recurring instances.

### Analytics History
The analytics history toggle already works correctly via `useUpdatePastCompletion` hook - no changes needed there.

### Testing Strategy
E2E tests are prioritized because they verify the complete user flow. The toggle logic changes affect multiple layers (hooks -> views -> API), so end-to-end verification is most valuable.
