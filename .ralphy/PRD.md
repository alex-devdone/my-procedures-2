# PRD: Scheduled Notifications for Recurring Todos

**Goal:** Add a specific time of day to recurring todos so browser notifications trigger automatically when the scheduled time arrives.

**Date:** 2026-01-21

---

## Context

Flowdo already has:
- **Recurring patterns** (`daily`, `weekly`, `monthly`, `yearly`, `custom`) stored in `recurringPattern` field
- **Browser notification system** (`use-notifications.ts`) for requesting permission and showing notifications
- **Reminder checker** (`use-reminder-checker.ts`) that polls todos and triggers notifications when `reminderAt` time passes

### What's Missing

Recurring todos have a pattern (e.g., "repeat daily") but no **specific time** for when notifications should fire. Users need to:
1. Set a specific time (e.g., 9:00 AM) for their recurring todo
2. Have the system automatically trigger browser notifications at that time each recurrence

### Technical Approach

**Option chosen:** Add a `notifyAt` time field to `RecurringPattern` that stores the time-of-day (HH:mm format). The reminder checker will:
1. Calculate the next notification datetime by combining the recurring pattern with `notifyAt`
2. Show a browser notification when that datetime arrives

### Stack
- **Frontend:** Next.js 16, React 19, shadcn/ui
- **State:** React Query with optimistic updates
- **Storage:** Drizzle ORM (PostgreSQL) + localStorage for guests
- **Notifications:** Web Notifications API

---

## Phase 1: Schema Updates (parallel_group: 1)

Extend RecurringPattern to include notification time.

- [x] Update `RecurringPattern` interface in `packages/db/src/schema/todo.ts` to add `notifyAt?: string` field (HH:mm format)
- [x] Update `recurringPatternSchema` in `apps/web/src/app/api/todo/todo.types.ts` to validate `notifyAt` as optional time string
- [x] Add unit tests for `notifyAt` validation in `apps/web/src/app/api/todo/todo.types.test.ts`

---

## Phase 2: Backend Logic (parallel_group: 2)

Calculate next notification datetime from recurring pattern + notifyAt.

- [x] Create `getNextNotificationTime(pattern: RecurringPattern, fromDate?: Date): Date | null` function in `packages/api/src/lib/recurring.ts`
- [x] Add unit tests for `getNextNotificationTime` in `packages/api/src/lib/recurring.test.ts` covering:
  - Daily pattern with notifyAt "09:00" returns today at 9am or tomorrow at 9am
  - Weekly pattern with daysOfWeek and notifyAt returns correct next occurrence
  - Monthly pattern with dayOfMonth and notifyAt returns correct next occurrence
  - Pattern without notifyAt returns null

---

## Phase 3: Frontend Time Picker (parallel_group: 2)

UI for setting notification time on recurring todos.

- [x] Create `apps/web/src/components/scheduling/time-picker.tsx` - simple time input (HH:mm) with presets (Morning 9am, Noon 12pm, Evening 6pm)
- [x] Add unit tests for TimePicker in `apps/web/src/components/scheduling/time-picker.test.tsx`
- [x] Update `apps/web/src/components/scheduling/recurring-picker.tsx` to show TimePicker when user sets a recurring pattern
- [x] Add unit tests for TimePicker integration in `apps/web/src/components/scheduling/recurring-picker.test.tsx`

---

## Phase 4: Reminder Checker Integration (parallel_group: 3)

Update reminder checker to calculate and trigger recurring notifications.

- [x] Update `apps/web/src/hooks/use-reminder-checker.ts`:
  - Add helper `getEffectiveReminderTime(todo: Todo): string | null` that returns:
    - `reminderAt` if set (existing behavior)
    - OR calculated next notification time from `recurringPattern.notifyAt`
  - Update `getDueReminders` to use `getEffectiveReminderTime`
- [x] Add unit tests for recurring notification logic in `apps/web/src/hooks/use-reminder-checker.test.ts`
- [x] Update notification display to show recurring indicator (e.g., "Daily reminder" instead of just "Reminder")

---

## Phase 5: Local Storage Support (parallel_group: 3)

Ensure localStorage (guest) todos also support notifyAt.

- [x] Verify `apps/web/src/hooks/use-todo-storage.ts` passes `notifyAt` through to local storage
- [x] Add unit test confirming local todos with recurring patterns and notifyAt work correctly
- [x] Ensure sync mechanism in `useSyncTodos` includes `notifyAt` when syncing to server

---

## Phase 6: E2E Tests (parallel_group: 4)

End-to-end tests for scheduled recurring notifications.

- [x] Add E2E tests in `apps/web/e2e/scheduled-notifications.spec.ts`:
  - [x] E2E: Create daily recurring todo with notification at 9:00 AM
  - [x] E2E: Edit notification time on existing recurring todo
  - [x] E2E: Clear notification time from recurring todo
  - [x] E2E: Verify time picker shows presets (Morning, Noon, Evening)
  - [x] E2E: Persist notification time after page reload

---

## Phase 7: Quality & Polish (parallel_group: 5)

Final verification and cleanup.

- [x] Run `bun run check-types` and fix any TypeScript errors
- [x] Run `bun run check` and fix any linting issues
- [x] Run `bun run test` and ensure all unit tests pass
- [x] Run `bun run test:e2e` and ensure all E2E tests pass
- [x] Run `bun run build` and ensure build succeeds

---

## Acceptance Criteria

- [x] All tests pass (`bun run test`)
- [x] No type errors (`bun run check-types`)
- [x] Linting passes (`bun run check`)
- [x] Build succeeds (`bun run build`)
- [x] User can set a specific time (e.g., 9:00 AM) for recurring todos
- [x] Browser notification fires automatically when scheduled time arrives
- [x] Works for all recurring patterns (daily, weekly, monthly, yearly)
- [x] Works in both authenticated and guest (localStorage) modes
- [x] Notification shows recurring context (e.g., "Daily at 9:00 AM")

---

## Appendix: Updated RecurringPattern Schema

```typescript
interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number; // every N days/weeks/months
  daysOfWeek?: number[]; // 0-6 for Sun-Sat (for weekly/custom)
  dayOfMonth?: number; // 1-31 (for monthly)
  monthOfYear?: number; // 1-12 (for yearly)
  endDate?: string; // ISO date string, optional end date
  occurrences?: number; // optional max occurrences
  notifyAt?: string; // NEW: Time of day for notification (HH:mm format, e.g., "09:00")
}

// Examples:
// Daily at 9am: { type: 'daily', notifyAt: '09:00' }
// Weekly Mon/Wed/Fri at noon: { type: 'weekly', daysOfWeek: [1, 3, 5], notifyAt: '12:00' }
// Monthly on 1st at 8am: { type: 'monthly', dayOfMonth: 1, notifyAt: '08:00' }
```

## Appendix: Notification Calculation Logic

```typescript
function getNextNotificationTime(pattern: RecurringPattern, fromDate: Date = new Date()): Date | null {
  if (!pattern.notifyAt) return null;

  const [hours, minutes] = pattern.notifyAt.split(':').map(Number);

  // Get next occurrence date based on pattern type
  const nextOccurrence = getNextOccurrenceDate(pattern, fromDate);
  if (!nextOccurrence) return null;

  // Set the specific time
  nextOccurrence.setHours(hours, minutes, 0, 0);

  // If time has already passed today for daily patterns, move to next day
  if (pattern.type === 'daily' && nextOccurrence <= fromDate) {
    nextOccurrence.setDate(nextOccurrence.getDate() + (pattern.interval || 1));
  }

  return nextOccurrence;
}
```
