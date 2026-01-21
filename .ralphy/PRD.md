# PRD: Analytics Dashboard & Recurring Todo Enhancements

**Goal:** Build a task completion analytics dashboard and enhance Today/Upcoming views to properly display recurring todos with completion history tracking.
**Date:** 2026-01-21

---

## Context

This project extends the existing todo management system with analytics capabilities and improved recurring todo visibility. The codebase already has:

- Recurring todo support with patterns (daily, weekly, monthly, yearly, custom)
- `completeRecurring` procedure that creates next occurrences
- Today view that includes recurring todos via `isDateMatchingPattern()`
- **Gap identified:** Upcoming view does NOT include recurring todos - only explicit due dates

### Stack
- **Frontend:** Next.js 16, React 19, shadcn/ui, React Query
- **Backend:** tRPC, Drizzle ORM, PostgreSQL
- **Key patterns:** Entity-based API structure in `apps/web/src/app/api/`

### Constraints
- Follow existing Biome linting, use Zod validation, maintain type safety with tRPC
- **Default notification time:** New recurring todos default to `09:00` when `notifyAt` is not explicitly set

---

## Phase 1: Database & Schema Updates (parallel_group: 1)

Foundation changes for tracking recurring todo completion history.

- [ ] Create `recurringTodoCompletion` table in `packages/db/src/schema/todo.ts` with fields: `id`, `todoId` (FK to todo), `scheduledDate` (the date it was supposed to be done), `completedAt` (nullable timestamp - null means missed), `userId`, `createdAt`
- [ ] Generate migration for the new completion history table using `bun run db:generate`
- [ ] Apply migration using `bun run db:migrate`
- [ ] Update `recurringPatternSchema` in `packages/api/src/routers/todo.ts` to default `notifyAt` to `"09:00"` when creating new recurring patterns without explicit time

---

## Phase 2: Backend API Extensions (parallel_group: 2)

New tRPC procedures for analytics and completion history.

- [ ] Create `getCompletionHistory` procedure in `packages/api/src/routers/todo.ts` that returns completion records for a date range, joining with todo data to include todo text
- [ ] Create `getAnalytics` procedure in `packages/api/src/routers/todo.ts` that calculates for a date range: total regular todos completed, total recurring occurrences completed, total recurring missed, completion rate %, current streak (consecutive days with completions), daily breakdown
- [ ] Create `updatePastCompletion` procedure in `packages/api/src/routers/todo.ts` to insert/update/delete completion records for past recurring todo occurrences (for forgotten check-ins)
- [ ] Update `completeRecurring` procedure in `packages/api/src/routers/todo.ts` (lines 234-320) to also insert a record into `recurringTodoCompletion` table with the scheduled date and completedAt timestamp
- [ ] Create `getRecurringTodosForDateRange` procedure in `packages/api/src/routers/todo.ts` that returns all recurring todos matching dates within a range using pattern matching logic similar to `isDateMatchingPattern()`

---

## Phase 3: Frontend API Layer - Analytics Entity (parallel_group: 3)

Create analytics entity following the established API structure pattern.

- [ ] Create `apps/web/src/app/api/analytics/analytics.types.ts` with interfaces: `AnalyticsData` (totals, rates, streak, dailyBreakdown), `CompletionRecord` (todoId, todoText, scheduledDate, completedAt, isRecurring), `DailyStats` (date, regularCompleted, recurringCompleted, recurringMissed), and Zod input schemas
- [ ] Create `apps/web/src/app/api/analytics/analytics.api.ts` with tRPC query option wrappers for `getAnalytics`, `getCompletionHistory`, `updatePastCompletion`
- [ ] Create `apps/web/src/app/api/analytics/analytics.hooks.ts` with `"use client"` directive and hooks: `useAnalytics(startDate, endDate)`, `useCompletionHistory(startDate, endDate)`, `useUpdatePastCompletion()` with optimistic cache updates
- [ ] Create `apps/web/src/app/api/analytics/index.ts` barrel file exporting all types, schemas, API functions, and hooks

---

## Phase 4: Today & Upcoming View Enhancements (parallel_group: 4)

Fix the Upcoming view gap and show completed recurring todos inline.

- [ ] Update `apps/web/src/components/views/today-view.tsx` `getTodosDueToday()` function to include completed recurring todos (currently line 84 filters to incomplete only) and render them inline with strikethrough styling
- [ ] Update `apps/web/src/components/views/upcoming-view.tsx` `getTodosUpcoming()` function (lines 123-151) to include recurring todos matching dates in next 7 days using `isDateMatchingPattern()` from `use-reminder-checker.ts`
- [ ] Update `apps/web/src/components/views/upcoming-view.tsx` to generate virtual todo entries for each recurring pattern match date, merging them with explicit due date todos in the date-grouped display
- [ ] Update `apps/web/src/components/views/upcoming-view.tsx` to show completed recurring todos inline with strikethrough styling for each matched date
- [ ] Add visual indicator (repeat icon from lucide-react) on todo items to distinguish recurring todos from one-time todos in both Today and Upcoming views

---

## Phase 5: Analytics Dashboard Components (parallel_group: 5)

Build the analytics dashboard UI components.

- [ ] Create `apps/web/src/components/analytics/stats-cards.tsx` showing 4 cards: Total Completed (regular + recurring), Completion Rate %, Current Streak (days), Missed Recurring count - using shadcn/ui Card component
- [ ] Create `apps/web/src/components/analytics/completion-chart.tsx` using recharts (add to dependencies if not present) showing stacked bar chart of daily completions: regular vs recurring, with missed recurring shown separately
- [ ] Create `apps/web/src/components/analytics/calendar-heatmap.tsx` showing GitHub-style activity grid for selected date range with color intensity (gray=0, light green=1-2, medium green=3-5, dark green=6+)
- [ ] Create `apps/web/src/components/analytics/completion-history-list.tsx` showing chronological list of recurring todo completions with columns: Todo text, Scheduled date, Status (completed with timestamp / missed), and toggle button to change status
- [ ] Create `apps/web/src/components/analytics/analytics-dashboard.tsx` as main container with: date range selector (default last 7 days), tabs for "Overview" (stats + chart) and "History" (heatmap + list)
- [ ] Create `apps/web/src/components/analytics/index.ts` barrel file exporting all analytics components

---

## Phase 6: Analytics Page & Navigation (parallel_group: 6)

Wire up analytics to app routing and navigation.

- [ ] Create `apps/web/src/app/(dashboard)/analytics/page.tsx` that renders AnalyticsDashboard with authentication check (redirect to login if not authenticated)
- [ ] Update sidebar navigation component to add "Analytics" menu item with BarChart3 icon from lucide-react, positioned after existing menu items
- [ ] Add route protection to ensure analytics page requires authentication

---

## Phase 7: Local Storage Support for Guest Mode (parallel_group: 7)

Extend local storage to support analytics in guest mode.

- [ ] Add completion history storage key in `apps/web/src/lib/local-todo-storage.ts` with array of `{ todoId: string, scheduledDate: string, completedAt: string | null }`
- [ ] Update `completeRecurring()` in `apps/web/src/lib/local-todo-storage.ts` (lines 390-455) to also store completion record in localStorage
- [ ] Create `getLocalCompletionHistory(startDate, endDate)` function in `apps/web/src/lib/local-todo-storage.ts`
- [ ] Create `getLocalAnalytics(startDate, endDate)` function in `apps/web/src/lib/local-todo-storage.ts` calculating same metrics as backend
- [ ] Create `updateLocalPastCompletion(todoId, scheduledDate, completed)` function in `apps/web/src/lib/local-todo-storage.ts`
- [ ] Update analytics hooks in `apps/web/src/app/api/analytics/analytics.hooks.ts` to use local storage functions when user is not authenticated (follow pattern from `useTodoStorage` in todo.hooks.ts)

---

## Phase 8: Testing & Quality (parallel_group: 8)

Tests, type checking, and final polish.

- [ ] Write unit tests for analytics calculation logic in `packages/api/src/routers/todo.test.ts` covering: completion rate calculation, streak calculation, daily breakdown grouping
- [ ] Write unit tests for `isDateMatchingPattern()` edge cases in `apps/web/src/hooks/use-reminder-checker.test.ts` covering: pattern at month boundaries, leap years, weekly patterns crossing month boundaries
- [ ] Write unit tests for analytics hooks in `apps/web/src/app/api/analytics/analytics.hooks.test.ts`
- [ ] Write E2E tests in `apps/web/e2e/analytics.spec.ts` covering: viewing stats cards, interacting with date range selector, toggling past completion status, chart renders correctly
- [ ] Write E2E tests in `apps/web/e2e/recurring-views.spec.ts` covering: recurring todos appear in Today view, recurring todos appear in Upcoming view, completed recurring shown with strikethrough
- [ ] Run `bun run check && bun run check-types` and fix any issues
- [ ] Run `bun run test` and ensure all unit tests pass
- [ ] Run `bun run test:e2e` and ensure all E2E tests pass
- [ ] Run `bun run build` and ensure production build succeeds

---

## Acceptance Criteria

- [ ] All tests pass (`bun run test`)
- [ ] No type errors (`bun run check-types`)
- [ ] Linting passes (`bun run check`)
- [ ] Build succeeds (`bun run build`)
- [ ] E2E tests pass (`bun run test:e2e`)
- [ ] Analytics dashboard displays stats for last 7 days by default
- [ ] Stats cards show: total completed, completion rate %, current streak, missed recurring count
- [ ] Bar chart shows daily breakdown of regular vs recurring completions
- [ ] Calendar heatmap shows activity intensity with color coding
- [ ] Completion history list shows all recurring occurrences with status
- [ ] Users can toggle completion status for past recurring todo occurrences
- [ ] Today view shows completed recurring todos inline with strikethrough
- [ ] Upcoming view includes recurring todos matching dates in next 7 days
- [ ] Upcoming view shows completed recurring todos inline with strikethrough
- [ ] Recurring todos have visual indicator (repeat icon) distinguishing them from one-time todos
- [ ] New recurring todos default to 09:00 notification time when not explicitly set
- [ ] Analytics works in guest mode using localStorage

---

## Notes

### Existing Helper to Reuse
`isDateMatchingPattern()` in `apps/web/src/hooks/use-reminder-checker.ts` (lines 217-278) handles pattern matching for all recurring types. Import and reuse this in Upcoming view.

### Virtual Entries for Upcoming View
Recurring todos will generate "virtual" entries for each matched date in the 7-day range. These are not database records - the parent recurring todo is the source of truth. Each virtual entry should have: original todoId, matched date, completion status for that specific date.

### Missed Detection Logic
A recurring todo occurrence is "missed" if:
1. Its scheduled date has passed (before today)
2. No completion record exists for that scheduledDate

This is calculated at query time by comparing the expected occurrences (from pattern) against actual completion records.

### Chart Library
Check if `recharts` is already in `apps/web/package.json`. If not, add it: `bun add recharts`

### Default Time Implementation
When creating a recurring pattern without `notifyAt`, default to `"09:00"`. This should be applied in the backend schema default and/or the frontend form when user doesn't explicitly set a time.
