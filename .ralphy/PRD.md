# PRD: Scheduled Todos, Folders & Subtasks for Flowdo

**Goal:** Add scheduled todos (due dates, reminders, recurring tasks), folder organization, and subtasks/checklists to Flowdo with offline-first localStorage support for guests and PostgreSQL sync for authenticated users.

**Date:** 2026-01-20

---

## Context

Flowdo is a full-stack TypeScript monorepo using Next.js 16, tRPC, Drizzle ORM with PostgreSQL, and Better-Auth. The app supports dual-mode storage:
- **Guests:** localStorage for offline-first experience
- **Authenticated users:** PostgreSQL via tRPC with sync on login

### Existing Patterns
- Entity-based API structure at `apps/web/src/app/api/:entityName/`
- Drizzle schema in `packages/db/src/schema/`
- E2E tests in `apps/web/e2e/` (Playwright)
- Unit tests alongside source files (Vitest)
- Optimistic updates via React Query

### Technical Decisions
- **Reminders:** Both browser notifications (Web Notifications API) + in-app toasts
- **Recurring:** Full cron-style patterns (daily, weekly, monthly, yearly, custom like "every Tuesday and Thursday")
- **Folders:** Flat folder structure (no nesting), todos belong to one folder or "Inbox"
- **Subtasks:** Simple checkboxes (text + completed state), auto-complete parent when all subtasks done
- **Realtime Sync:** Supabase Realtime subscriptions for instant cross-device/tab sync (keep Drizzle for mutations)

---

## Phase 1: Database Schema & Migrations

Foundation layer - all subsequent phases depend on these schema changes.

- [x] Create `packages/db/src/schema/folder.ts` with folder table (id, name, color, userId, createdAt, order)
- [x] Add unit tests for folder schema validation in `packages/db/src/schema/folder.test.ts`
- [x] Update `packages/db/src/schema/todo.ts` to add scheduling fields (dueDate, reminderAt, recurringPattern, folderId)
- [x] Add unit tests for updated todo schema in `packages/db/src/schema/todo.test.ts`
- [x] Create `packages/db/src/schema/subtask.ts` with subtask table (id, text, completed, todoId, order)
- [x] Add unit tests for subtask schema in `packages/db/src/schema/subtask.test.ts`
- [x] Update `packages/db/src/schema/index.ts` to export folder and subtask schemas and relations
- [x] Generate Drizzle migrations with `bun run db:generate`
- [x] Apply migrations to database with `bun run db:push`

---

## Phase 2: Folder Feature - Backend

Backend API layer for folders. Can proceed after Phase 1.

- [x] Create `packages/api/src/routers/folder.ts` with CRUD procedures (list, create, update, delete, reorder)
- [x] Add unit tests for folder router in `packages/api/src/routers/folder.test.ts`
- [x] Add folder router to main tRPC router in `packages/api/src/index.ts`
- [x] Add Zod validation schemas for folder inputs in router

---

## Phase 3: Folder Feature - Frontend API Layer

Frontend API wrappers for folders. Can proceed after Phase 2.

- [x] Create `apps/web/src/app/api/folder/folder.types.ts` with TypeScript types and Zod schemas
- [x] Add unit tests for folder types/schemas in `apps/web/src/app/api/folder/folder.types.test.ts`
- [x] Create `apps/web/src/app/api/folder/folder.api.ts` with tRPC query/mutation options
- [x] Create `apps/web/src/app/api/folder/folder.hooks.ts` with React hooks and optimistic updates
- [x] Add unit tests for folder hooks in `apps/web/src/app/api/folder/folder.hooks.test.ts`
- [x] Create `apps/web/src/app/api/folder/index.ts` barrel export
- [x] Create `apps/web/src/lib/local-folder-storage.ts` for localStorage folder management (guests)
- [x] Add unit tests for local folder storage in `apps/web/src/lib/local-folder-storage.test.ts`

---

## Phase 4: Folder Feature - UI Components

UI components for folder management. Can proceed after Phase 3.

- [x] Create `apps/web/src/components/folders/folder-sidebar.tsx` - sidebar with folder list and quick actions
- [x] Add unit tests for FolderSidebar component in `apps/web/src/components/folders/folder-sidebar.test.tsx`
- [x] Create `apps/web/src/components/folders/folder-create-dialog.tsx` - modal for creating folders with name/color
- [x] Add unit tests for FolderCreateDialog in `apps/web/src/components/folders/folder-create-dialog.test.tsx`
- [x] Create `apps/web/src/components/folders/folder-edit-dialog.tsx` - modal for editing/deleting folders
- [x] Add unit tests for FolderEditDialog in `apps/web/src/components/folders/folder-edit-dialog.test.tsx`
- [x] Update todo list component to show folder assignment and allow filtering by folder
- [x] Add unit tests for folder filtering in todo list
- [x] Create E2E tests for folder CRUD in localStorage mode at `apps/web/e2e/folders.spec.ts`:
  - [x] E2E: Create a new folder with name and color
  - [x] E2E: Edit folder name and color
  - [x] E2E: Delete folder (todos move to Inbox)
  - [ ] E2E: Reorder folders via drag-and-drop (requires UI implementation)
  - [x] E2E: Assign todo to folder
  - [x] E2E: Filter todos by folder
  - [x] E2E: Persist folders after page reload

---

## Phase 5: Subtasks Feature - Backend

Backend API layer for subtasks. Can proceed after Phase 1.

- [x] Create `packages/api/src/routers/subtask.ts` with CRUD procedures (list, create, update, delete, toggle, reorder)
- [x] Add unit tests for subtask router in `packages/api/src/routers/subtask.test.ts`
- [x] Add subtask router to main tRPC router in `packages/api/src/index.ts`
- [x] Add Zod validation schemas for subtask inputs in router
- [x] Add logic to auto-complete parent todo when all subtasks are completed
- [x] Add unit tests for auto-complete logic in `packages/api/src/routers/subtask.test.ts`

---

## Phase 6: Subtasks Feature - Frontend API Layer

Frontend API wrappers for subtasks. Can proceed after Phase 5.

- [x] Create `apps/web/src/app/api/subtask/subtask.types.ts` with TypeScript types and Zod schemas
- [x] Add unit tests for subtask types/schemas in `apps/web/src/app/api/subtask/subtask.types.test.ts`
- [ ] Create `apps/web/src/app/api/subtask/subtask.api.ts` with tRPC query/mutation options
- [ ] Create `apps/web/src/app/api/subtask/subtask.hooks.ts` with React hooks and optimistic updates
- [ ] Add unit tests for subtask hooks in `apps/web/src/app/api/subtask/subtask.hooks.test.ts`
- [ ] Create `apps/web/src/app/api/subtask/index.ts` barrel export
- [ ] Update `apps/web/src/lib/local-todo-storage.ts` to store subtasks for each todo
- [ ] Add unit tests for local subtask storage in `apps/web/src/lib/local-todo-storage.test.ts`

---

## Phase 7: Subtasks Feature - UI Components

UI components for subtask management. Can proceed after Phase 6.

- [ ] Create `apps/web/src/components/subtasks/subtask-list.tsx` - renders list of subtasks within a todo
- [ ] Add unit tests for SubtaskList in `apps/web/src/components/subtasks/subtask-list.test.tsx`
- [ ] Create `apps/web/src/components/subtasks/subtask-item.tsx` - single subtask with checkbox and delete
- [ ] Add unit tests for SubtaskItem in `apps/web/src/components/subtasks/subtask-item.test.tsx`
- [ ] Create `apps/web/src/components/subtasks/subtask-add-input.tsx` - inline input for adding subtasks
- [ ] Add unit tests for SubtaskAddInput in `apps/web/src/components/subtasks/subtask-add-input.test.tsx`
- [ ] Update todo item component to show subtask progress indicator (e.g., "2/5 done")
- [ ] Add unit tests for subtask progress display
- [ ] Create expandable todo detail view that shows subtasks inline
- [ ] Create E2E tests for subtask CRUD in localStorage mode at `apps/web/e2e/subtasks.spec.ts`:
  - [ ] E2E: Add subtasks to a todo
  - [ ] E2E: Toggle subtask completion
  - [ ] E2E: Delete a subtask
  - [ ] E2E: Reorder subtasks
  - [ ] E2E: Auto-complete parent todo when all subtasks completed
  - [ ] E2E: Uncheck parent todo when subtask unchecked
  - [ ] E2E: Show subtask progress indicator (e.g., "2/5")
  - [ ] E2E: Persist subtasks after page reload

---

## Phase 8: Scheduling Feature - Backend

Backend API updates for todo scheduling. Can proceed after Phase 1.

- [ ] Update `packages/api/src/routers/todo.ts` to handle dueDate, reminderAt, recurringPattern fields
- [ ] Add unit tests for scheduling fields in todo router `packages/api/src/routers/todo.test.ts`
- [ ] Create `packages/api/src/lib/recurring.ts` with cron-style pattern parsing and next occurrence calculation
- [ ] Add unit tests for recurring pattern logic in `packages/api/src/lib/recurring.test.ts`
- [ ] Add procedure to get todos due within a time range (for reminder checking)
- [ ] Add procedure to complete recurring todo (creates next occurrence, marks current complete)

---

## Phase 9: Scheduling Feature - Frontend API Layer

Frontend API wrappers for scheduling. Can proceed after Phase 8.

- [ ] Update `apps/web/src/app/api/todo/todo.types.ts` with scheduling fields (dueDate, reminderAt, recurringPattern, folderId)
- [ ] Add unit tests for updated todo types in `apps/web/src/app/api/todo/todo.types.test.ts`
- [ ] Update `apps/web/src/app/api/todo/todo.api.ts` with scheduling query options
- [ ] Update `apps/web/src/app/api/todo/todo.hooks.ts` to handle scheduling in optimistic updates
- [ ] Add unit tests for scheduling hooks in `apps/web/src/app/api/todo/todo.hooks.test.ts`
- [ ] Update `apps/web/src/lib/local-todo-storage.ts` to store scheduling fields
- [ ] Add unit tests for local storage scheduling in `apps/web/src/lib/local-todo-storage.test.ts`

---

## Phase 10: Scheduling Feature - UI Components

UI for setting due dates, reminders, and recurring patterns. Can proceed after Phase 9.

- [ ] Create `apps/web/src/components/scheduling/date-picker.tsx` - due date picker with presets (today, tomorrow, next week)
- [ ] Add unit tests for DatePicker in `apps/web/src/components/scheduling/date-picker.test.tsx`
- [ ] Create `apps/web/src/components/scheduling/reminder-picker.tsx` - reminder time selector
- [ ] Add unit tests for ReminderPicker in `apps/web/src/components/scheduling/reminder-picker.test.tsx`
- [ ] Create `apps/web/src/components/scheduling/recurring-picker.tsx` - full cron-style recurring pattern selector
- [ ] Add unit tests for RecurringPicker in `apps/web/src/components/scheduling/recurring-picker.test.tsx`
- [ ] Create `apps/web/src/components/scheduling/todo-schedule-popover.tsx` - combined popover for all scheduling options
- [ ] Add unit tests for TodoSchedulePopover in `apps/web/src/components/scheduling/todo-schedule-popover.test.tsx`
- [ ] Update todo item component to show due date badge and overdue styling
- [ ] Add unit tests for due date display in todo item
- [ ] Create E2E tests for scheduling in localStorage mode at `apps/web/e2e/scheduling.spec.ts`:
  - [ ] E2E: Set due date using date picker
  - [ ] E2E: Set due date using presets (today, tomorrow, next week)
  - [ ] E2E: Clear due date from todo
  - [ ] E2E: Set reminder time for todo
  - [ ] E2E: Create daily recurring todo
  - [ ] E2E: Create weekly recurring todo with specific days
  - [ ] E2E: Create monthly recurring todo
  - [ ] E2E: Complete recurring todo and verify next occurrence created
  - [ ] E2E: Show overdue styling for past-due todos
  - [ ] E2E: Persist scheduling data after page reload

---

## Phase 11: Reminder Notifications

Notification system for due reminders. Can proceed after Phase 10.

- [ ] Create `apps/web/src/hooks/use-notifications.ts` - hook for requesting/managing browser notification permissions
- [ ] Add unit tests for useNotifications hook in `apps/web/src/hooks/use-notifications.test.ts`
- [ ] Create `apps/web/src/hooks/use-reminder-checker.ts` - hook that polls for due reminders and triggers notifications
- [ ] Add unit tests for useReminderChecker in `apps/web/src/hooks/use-reminder-checker.test.ts`
- [ ] Create `apps/web/src/components/notifications/reminder-toast.tsx` - in-app toast component for reminders
- [ ] Add unit tests for ReminderToast in `apps/web/src/components/notifications/reminder-toast.test.tsx`
- [ ] Integrate reminder checker into app layout to run on authenticated pages
- [ ] Create E2E tests for reminder notifications in localStorage mode at `apps/web/e2e/reminders.spec.ts`:
  - [ ] E2E: Request browser notification permission
  - [ ] E2E: Show in-app toast when reminder is due
  - [ ] E2E: Dismiss reminder toast
  - [ ] E2E: Click reminder toast to navigate to todo

---

## Phase 12: Smart Views & Filtering

Smart views based on scheduling data. Can proceed after Phase 10.

- [ ] Create `apps/web/src/components/views/today-view.tsx` - shows todos due today
- [ ] Add unit tests for TodayView in `apps/web/src/components/views/today-view.test.tsx`
- [ ] Create `apps/web/src/components/views/upcoming-view.tsx` - shows todos due in next 7 days grouped by date
- [ ] Add unit tests for UpcomingView in `apps/web/src/components/views/upcoming-view.test.tsx`
- [ ] Create `apps/web/src/components/views/overdue-view.tsx` - shows overdue todos
- [ ] Add unit tests for OverdueView in `apps/web/src/components/views/overdue-view.test.tsx`
- [ ] Add smart view navigation to sidebar alongside folders
- [ ] Create E2E tests for smart views in localStorage mode at `apps/web/e2e/smart-views.spec.ts`:
  - [ ] E2E: Navigate to Today view and see only today's todos
  - [ ] E2E: Navigate to Upcoming view and see todos grouped by date
  - [ ] E2E: Navigate to Overdue view and see only past-due todos
  - [ ] E2E: Complete todo from smart view and verify it updates
  - [ ] E2E: Empty state shown when no todos match view criteria

---

## Phase 13: Supabase Realtime Setup

Configure Supabase client and enable Realtime for automatic sync. Can proceed after Phase 1.

- [ ] Install `@supabase/supabase-js` package in apps/web with `bun add @supabase/supabase-js`
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `packages/env/` validation
- [ ] Create `apps/web/src/lib/supabase.ts` with Supabase client initialization
- [ ] Add unit tests for Supabase client setup in `apps/web/src/lib/supabase.test.ts`
- [ ] Enable Realtime replication for `todo`, `folder`, and `subtask` tables in Supabase dashboard (document in README)
- [ ] Create `apps/web/src/hooks/use-supabase-realtime.ts` - generic hook for subscribing to table changes
- [ ] Add unit tests for useSupabaseRealtime in `apps/web/src/hooks/use-supabase-realtime.test.ts`

---

## Phase 14: Realtime Todo Sync

Integrate Supabase Realtime with todo React Query cache. Can proceed after Phase 13.

- [ ] Create `apps/web/src/hooks/use-todo-realtime.ts` - subscribes to todo table changes and updates React Query cache
- [ ] Add unit tests for useTodoRealtime in `apps/web/src/hooks/use-todo-realtime.test.ts`
- [ ] Update `apps/web/src/app/api/todo/todo.hooks.ts` useTodoStorage to integrate realtime subscription
- [ ] Add unit tests for realtime integration in todo hooks
- [ ] Handle INSERT events - add new todo to cache when created on another device/tab
- [ ] Handle UPDATE events - update todo in cache when modified elsewhere
- [ ] Handle DELETE events - remove todo from cache when deleted elsewhere
- [ ] Add connection status indicator component at `apps/web/src/components/realtime/connection-status.tsx`
- [ ] Add unit tests for ConnectionStatus in `apps/web/src/components/realtime/connection-status.test.tsx`

---

## Phase 15: Realtime Folder & Subtask Sync

Extend realtime sync to folders and subtasks. Can proceed after Phase 14.

- [ ] Create `apps/web/src/hooks/use-folder-realtime.ts` - subscribes to folder table changes
- [ ] Add unit tests for useFolderRealtime in `apps/web/src/hooks/use-folder-realtime.test.ts`
- [ ] Update `apps/web/src/app/api/folder/folder.hooks.ts` to integrate realtime subscription
- [ ] Create `apps/web/src/hooks/use-subtask-realtime.ts` - subscribes to subtask table changes
- [ ] Add unit tests for useSubtaskRealtime in `apps/web/src/hooks/use-subtask-realtime.test.ts`
- [ ] Update `apps/web/src/app/api/subtask/subtask.hooks.ts` to integrate realtime subscription
- [ ] Handle subtask changes triggering parent todo auto-complete across devices
- [ ] Add unit tests for cross-device auto-complete behavior

---

## Phase 16: Local Storage Sync Enhancement

Update localStorage sync mechanism to handle new fields. Can proceed after Phases 9, 6, and 3.

- [ ] Update `apps/web/src/app/api/todo/todo.hooks.ts` useSyncTodos to include scheduling fields and subtasks
- [ ] Add unit tests for sync with scheduling fields
- [ ] Update bulk create mutation to include folderId, scheduling fields, and subtasks
- [ ] Create folder sync mechanism in useSyncTodos for syncing local folders on login
- [ ] Add unit tests for folder sync mechanism
- [ ] Create subtask sync mechanism for syncing local subtasks on login
- [ ] Add unit tests for subtask sync mechanism
- [ ] Create E2E tests for sync with scheduling/folders/subtasks at `apps/web/e2e/sync-enhanced.spec.ts`:
  - [ ] E2E: Create todos with due dates in localStorage, login, verify synced with dates
  - [ ] E2E: Create folders in localStorage, login, verify folders synced
  - [ ] E2E: Create todos with subtasks in localStorage, login, verify subtasks synced
  - [ ] E2E: Sync dialog shows correct counts for local items
  - [ ] E2E: "Discard" action clears all local data
  - [ ] E2E: "Keep both" action merges local and remote

---

## Phase 17: Polish & Cleanup

Final polish and type checking. Depends on all previous phases.

- [ ] Run `bun run check-types` and fix any TypeScript errors
- [ ] Run `bun run check` and fix any linting issues
- [ ] Run `bun run test` and ensure all unit tests pass
- [ ] Run `bun run test:e2e` and ensure all E2E tests pass
- [ ] Run `bun run build` and ensure build succeeds
- [ ] Manual testing of all features in both localStorage and authenticated modes
- [ ] Test realtime sync across multiple browser tabs
- [ ] Test realtime sync across multiple devices

---

## Appendix: Recurring Pattern Schema

The `recurringPattern` field stores cron-style patterns as JSON:

```typescript
interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number; // every N days/weeks/months
  daysOfWeek?: number[]; // 0-6 for Sun-Sat (for weekly/custom)
  dayOfMonth?: number; // 1-31 (for monthly)
  monthOfYear?: number; // 1-12 (for yearly)
  endDate?: string; // ISO date string, optional end date
  occurrences?: number; // optional max occurrences
}

// Examples:
// Daily: { type: 'daily' }
// Every 3 days: { type: 'daily', interval: 3 }
// Weekly on Mon/Wed/Fri: { type: 'weekly', daysOfWeek: [1, 3, 5] }
// Monthly on 15th: { type: 'monthly', dayOfMonth: 15 }
// Every 2 weeks on Tuesday: { type: 'weekly', interval: 2, daysOfWeek: [2] }
// Yearly on Jan 1: { type: 'yearly', monthOfYear: 1, dayOfMonth: 1 }
```

## Appendix: Folder Color Schema

Folders support predefined colors for visual organization:

```typescript
type FolderColor =
  | 'slate' | 'red' | 'orange' | 'amber'
  | 'yellow' | 'lime' | 'green' | 'emerald'
  | 'teal' | 'cyan' | 'sky' | 'blue'
  | 'indigo' | 'violet' | 'purple' | 'fuchsia'
  | 'pink' | 'rose';
```

## Appendix: Subtask Schema

Subtasks are simple checkboxes within a todo:

```typescript
interface Subtask {
  id: number | string; // number for remote, string UUID for local
  text: string;
  completed: boolean;
  todoId: number | string; // parent todo ID
  order: number; // for manual reordering
}

// Example: Morning training todo with subtasks
// Todo: "Morning training"
// Subtasks:
//   - { text: "Exercise 1 - Push-ups", completed: true, order: 0 }
//   - { text: "Exercise 2 - Squats", completed: false, order: 1 }
//   - { text: "Exercise 3 - Planks", completed: false, order: 2 }
```

**Auto-complete behavior:** When all subtasks are marked complete, the parent todo automatically marks as complete. If a subtask is unchecked, the parent todo is marked incomplete.

## Appendix: Database Schema Changes

### New: `folder` table
```sql
CREATE TABLE folder (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  "order" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX folder_user_id_idx ON folder(user_id);
```

### New: `subtask` table
```sql
CREATE TABLE subtask (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  todo_id INTEGER NOT NULL REFERENCES todo(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX subtask_todo_id_idx ON subtask(todo_id);
```

### Updated: `todo` table
```sql
ALTER TABLE todo ADD COLUMN due_date TIMESTAMP;
ALTER TABLE todo ADD COLUMN reminder_at TIMESTAMP;
ALTER TABLE todo ADD COLUMN recurring_pattern JSONB;
ALTER TABLE todo ADD COLUMN folder_id INTEGER REFERENCES folder(id) ON DELETE SET NULL;
CREATE INDEX todo_due_date_idx ON todo(due_date);
CREATE INDEX todo_folder_id_idx ON todo(folder_id);
```

## Appendix: Supabase Realtime Architecture

### Overview

The app uses a hybrid approach:
- **Mutations:** tRPC + Drizzle ORM (existing pattern, type-safe, optimistic updates)
- **Realtime sync:** Supabase Realtime subscriptions (instant cross-device updates)

```
┌─────────────┐     tRPC mutations      ┌─────────────┐
│   Browser   │ ───────────────────────▶│   Server    │
│   Tab A     │                         │  (Drizzle)  │
└─────────────┘                         └──────┬──────┘
       ▲                                       │
       │ Realtime                              │ writes to
       │ subscription                          ▼
       │                                ┌─────────────┐
┌──────┴──────┐     Realtime events     │  Supabase   │
│  Supabase   │ ◀───────────────────────│  PostgreSQL │
│  Realtime   │                         └─────────────┘
└──────┬──────┘
       │ broadcasts to
       ▼
┌─────────────┐
│   Browser   │
│   Tab B     │
└─────────────┘
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Dashboard Setup

Enable Realtime replication for tables:
1. Go to Database → Replication
2. Enable replication for: `todo`, `folder`, `subtask`
3. Select events: INSERT, UPDATE, DELETE

### Row Level Security (RLS)

Ensure RLS policies allow users to only see their own data:

```sql
-- Enable RLS
ALTER TABLE todo ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtask ENABLE ROW LEVEL SECURITY;

-- Todo policies
CREATE POLICY "Users can view own todos" ON todo
  FOR SELECT USING (user_id = auth.uid());

-- Folder policies
CREATE POLICY "Users can view own folders" ON folder
  FOR SELECT USING (user_id = auth.uid());

-- Subtask policies (via todo ownership)
CREATE POLICY "Users can view own subtasks" ON subtask
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM todo WHERE todo.id = subtask.todo_id AND todo.user_id = auth.uid())
  );
```

### React Query Integration

Realtime events update the React Query cache directly:

```typescript
// Example: useTodoRealtime hook
useEffect(() => {
  const channel = supabase
    .channel('todos')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'todo', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          queryClient.setQueryData(['todos'], (old) => [...old, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          queryClient.setQueryData(['todos'], (old) =>
            old.map(t => t.id === payload.new.id ? payload.new : t)
          );
        } else if (payload.eventType === 'DELETE') {
          queryClient.setQueryData(['todos'], (old) =>
            old.filter(t => t.id !== payload.old.id)
          );
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [userId]);
```
