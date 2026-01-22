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

- [ ] Update `UseTodoStorageReturn.toggle` signature in `apps/web/src/app/api/todo/todo.types.ts` to accept optional `options?: { virtualDate?: string }` parameter
- [ ] Add `getUpdatePastCompletionMutationOptions` function to `apps/web/src/app/api/todo/todo.api.ts` if not already present (wraps `trpc.todo.updatePastCompletion`)

---

## Phase 2: Core Implementation - Hook & Toggle Logic (parallel_group: 2)

- [ ] Add `updatePastCompletionMutation` with optimistic updates in `apps/web/src/app/api/todo/todo.hooks.ts` following the pattern of existing mutations (cancel queries, update cache, rollback on error)
- [ ] Modify `toggle` function in `apps/web/src/app/api/todo/todo.hooks.ts` (lines 348-386) to check for `options.virtualDate` - if provided with recurring todo, use `updatePastCompletion` instead of `completeRecurring`
- [ ] Update local storage toggle logic in `apps/web/src/lib/local-todo-storage.ts` to support `toggleLocalOccurrence(todoId, scheduledDate, completed)` for guest users

---

## Phase 3: View Component Integration (parallel_group: 3)

- [ ] Update `handleToggleTodo` in `apps/web/src/components/views/today-view.tsx` to detect virtual recurring instances and pass `{ virtualDate: entry.virtualDate }` when calling `onToggle`
- [ ] Update `handleToggleTodo` in `apps/web/src/components/views/upcoming-view.tsx` to pass `virtualDate` for virtual recurring instances
- [ ] Update `handleToggleTodo` in `apps/web/src/components/views/overdue-view.tsx` to pass `virtualDate` for missed recurring occurrences
- [ ] Verify folder views (`apps/web/src/components/folders/folder-content.tsx`) continue using existing behavior (no virtualDate = creates next occurrence)

---

## Phase 4: E2E Tests (parallel_group: 4)

- [ ] Add E2E test in `apps/web/e2e/recurring-views.spec.ts`: "Today view: toggling recurring todo marks occurrence complete without creating new todo" - create daily recurring, toggle in Today, verify no new todo in Inbox, verify occurrence shows completed
- [ ] Add E2E test: "Today view: toggle recurring occurrence back to incomplete" - toggle completed occurrence, verify it shows as active again
- [ ] Add E2E test: "Upcoming view: toggling future occurrence marks it complete" - create daily recurring, toggle tomorrow's occurrence, verify shows completed, original todo unchanged
- [ ] Add E2E test: "Overdue view: toggling missed occurrence retroactively completes it" - create recurring with past due date, navigate to Overdue, toggle, verify marked completed
- [ ] Add E2E test: "Folder view: completing recurring todo creates next occurrence" - create recurring in folder, complete via folder view, verify new todo created (existing Inbox behavior)
- [ ] Add E2E test: "Toggle persistence: recurring occurrence completion persists after reload" - toggle occurrence, reload, verify status persisted

---

## Phase 5: Quality Assurance (parallel_group: 5)

- [ ] Run `bun run check-types` and fix any TypeScript errors
- [ ] Run `bun run check` and fix any Biome linting/formatting issues
- [ ] Run `bun run test` and ensure all unit tests pass
- [ ] Run `bun run test:e2e` and ensure all E2E tests pass including new toggle tests

---

## Acceptance Criteria

- [ ] Toggling a recurring todo in Today view only records the occurrence completion (no new todo created)
- [ ] Toggling a recurring todo in Upcoming view marks future occurrence as complete
- [ ] Toggling a recurring todo in Overdue view retroactively marks missed occurrence as completed
- [ ] Toggling in folder/Inbox views maintains existing behavior (creates next occurrence)
- [ ] Guest users (localStorage) have same toggle behavior as authenticated users
- [ ] All tests pass (`bun run test`)
- [ ] No type errors (`bun run check-types`)
- [ ] Linting passes (`bun run check`)
- [ ] Build succeeds (`bun run build`)
- [ ] All new E2E tests pass (`bun run test:e2e`)

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
