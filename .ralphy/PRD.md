# PRD: Google Tasks Integration

**Goal:** Enable two-way synchronization between app todos and Google Tasks with per-todo sync toggle and 15-minute background sync interval.

**Date:** 2026-01-23

---

## Context

This integration allows users to sync individual todos with Google Tasks. When a user enables sync on a todo for the first time, they'll be prompted to configure the integration by linking their Google account and selecting (or creating) a Google Tasks list.

- **Stack:** Next.js 16, tRPC, Drizzle ORM, PostgreSQL, Better-Auth, Bun
- **Key patterns:** Entity-based API structure in `apps/web/src/app/api/`, optimistic updates via React Query, protected tRPC procedures
- **Constraints:** Must use existing Better-Auth setup, follow Biome linting, use Zod for validation

### Sync Behavior
- **App → Google:** Immediate sync when todo is toggled in the app
- **Google → App:** Background sync every 15 minutes via cron job
- **Conflict resolution:** Last write wins (based on timestamps)
- **Scope:** Per-todo toggle (each todo can independently enable/disable sync)
- **List selection:** User can create a new list OR select an existing Google Tasks list

---

## Phase 1: Database Schema (parallel_group: 1)

- [x] Add Google Tasks fields to todo table in `packages/db/src/schema/todo.ts`:
  - `googleTaskId: text("google_task_id")` - Google Tasks API task ID
  - `googleSyncEnabled: boolean("google_sync_enabled").default(false).notNull()`
  - `lastSyncedAt: timestamp("last_synced_at")` - For conflict resolution
  - Add index: `index("todo_googleTaskId_idx").on(table.googleTaskId)`

- [x] Create `packages/db/src/schema/google-tasks-integration.ts` with fields:
  - `id: serial("id").primaryKey()`
  - `userId: text("user_id").notNull().unique().references(() => user.id)`
  - `googleTasksListId: text("google_tasks_list_id")` - Selected list ID
  - `googleTasksListName: text("google_tasks_list_name")` - For display
  - `enabled: boolean("enabled").default(false).notNull()`
  - `lastSyncedAt: timestamp("last_synced_at")`
  - `syncStatus: text("sync_status").default("idle")` - 'idle' | 'syncing' | 'error'
  - `lastSyncError: text("last_sync_error")`
  - Add relations to user table

- [x] Export new schema from `packages/db/src/schema/index.ts`

- [x] Add environment variables to `packages/env/src/server.ts`:
  - `GOOGLE_CLIENT_ID: z.string().min(1)`
  - `GOOGLE_CLIENT_SECRET: z.string().min(1)`
  - `CRON_SECRET: z.string().min(1)` - For cron job auth

- [x] Run `bun run db:push` to apply schema changes

---

## Phase 2: OAuth & API Client (parallel_group: 2)

- [x] Configure Google OAuth in `packages/auth/src/index.ts`:
  - Add `socialProviders.google` with clientId, clientSecret
  - Request scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/tasks`
  - Better-Auth will store tokens in existing `account` table

- [x] Create `packages/api/src/lib/google-tasks-client.ts`:
  - `GoogleTasksClient` class with static `forUser(userId)` factory
  - Auto-refresh expired tokens using `refreshToken` from account table
  - Methods: `listTaskLists()`, `createTaskList(name)`, `listTasks(listId)`, `upsertTask(listId, todo)`, `deleteTask(listId, taskId)`
  - Use fetch to call Google Tasks REST API v1

---

## Phase 3: tRPC Procedures (parallel_group: 3)

- [x] Create `packages/api/src/routers/google-tasks.ts` with procedures:
  - `getIntegration` - Get user's integration settings
  - `hasGoogleAccount` - Check if Google account is linked
  - `listTaskLists` - List user's Google Tasks lists
  - `createTaskList` - Create new Google Tasks list
  - `configureIntegration` - Save selected list ID and enable integration
  - `disableIntegration` - Disable sync for user
  - `enableTodoSync` - Enable sync for a todo (returns `needsConfiguration: true` if not configured)
  - `disableTodoSync` - Disable sync for a todo
  - `syncTodoToGoogle` - Push single todo to Google
  - `pullFromGoogle` - Manual full sync from Google

- [x] Register router in `packages/api/src/routers/index.ts`

- [x] Modify `toggle` procedure in `packages/api/src/routers/todo.ts`:
  - After updating local todo, check if `googleSyncEnabled && googleTaskId`
  - If true, call `GoogleTasksClient.upsertTask()` to sync immediately
  - Update `lastSyncedAt` timestamp
  - Wrap in try/catch - don't fail toggle if Google sync fails

- [x] Modify `delete` procedure in `packages/api/src/routers/todo.ts`:
  - If todo has `googleTaskId`, call `GoogleTasksClient.deleteTask()` to remove from Google

---

## Phase 4: Frontend - Entity API Layer (parallel_group: 4)

- [x] Create `apps/web/src/app/api/google-tasks/google-tasks.types.ts`:
  - `GoogleTasksIntegration` interface
  - `GoogleTaskList` interface
  - Zod schemas: `configureIntegrationInputSchema`, `enableTodoSyncInputSchema`

- [x] Create `apps/web/src/app/api/google-tasks/google-tasks.api.ts`:
  - Query options: `getIntegrationQueryOptions`, `getHasGoogleAccountQueryOptions`, `getListTaskListsQueryOptions`
  - Mutation options: `getConfigureIntegrationMutationOptions`, `getEnableTodoSyncMutationOptions`, `getDisableTodoSyncMutationOptions`, `getPullFromGoogleMutationOptions`, `getCreateTaskListMutationOptions`

- [x] Create `apps/web/src/app/api/google-tasks/google-tasks.hooks.ts`:
  - `useGoogleTasksIntegration()` - Integration status, task lists, configure/pull mutations
  - `useTodoGoogleSync()` - Enable/disable sync per todo, manages config modal state

- [x] Create `apps/web/src/app/api/google-tasks/index.ts` barrel file

---

## Phase 5: Frontend - UI Components (parallel_group: 5)

- [x] Create `apps/web/src/components/integrations/google-tasks-config-modal.tsx`:
  - Dialog with title "Connect to Google Tasks"
  - If no Google account linked: Show "Link Google Account" button (triggers OAuth flow via `authClient.signIn.social`)
  - If linked: Show list of existing Google Tasks lists + "Create New List" option
  - On list selection: Call `configureIntegration` mutation
  - Use existing Dialog component from shadcn/ui

- [x] Create `apps/web/src/components/integrations/google-sync-toggle.tsx`:
  - Small icon button (Cloud/CloudOff icons)
  - Props: `todoId`, `isSynced`
  - On click: Call `enableSync` or `disableSync` from hook
  - Blue Cloud icon when synced, muted CloudOff when not

- [x] Create `apps/web/src/components/integrations/google-tasks-provider.tsx`:
  - Context provider for config modal state
  - Renders `GoogleTasksConfigModal` at root level
  - Exposes `openConfigModal`, `closeConfigModal`, `onConfigured` via context

- [x] Modify `apps/web/src/components/todos/todo-expandable-item.tsx`:
  - Add `googleSyncEnabled?: boolean` to props interface
  - Import and render `GoogleSyncToggle` in action buttons section (next to delete button)
  - Only show for numeric todo IDs (authenticated users)

- [x] Add `GoogleTasksProvider` to app layout in `apps/web/src/app/layout.tsx`

---

## Phase 6: Background Sync (parallel_group: 6)

- [x] Create `apps/web/src/app/api/cron/google-tasks-sync/route.ts`:
  - GET handler for Vercel Cron
  - Verify `CRON_SECRET` in Authorization header
  - Query all enabled integrations
  - For each: fetch Google Tasks, compare timestamps, update local todos (last write wins)
  - Update `lastSyncedAt` and `syncStatus` on integration record
  - Handle errors gracefully, log failures

- [x] Create/update `apps/web/vercel.json`:
  - Add cron config: `{ "path": "/api/cron/google-tasks-sync", "schedule": "*/15 * * * *" }`

- [x] Add `CRON_SECRET` to environment variables documentation

---

## Phase 7: Testing & Polish (parallel_group: 7)

- [x] Write unit tests for `GoogleTasksClient` in `packages/api/src/lib/google-tasks-client.test.ts`

- [x] Write hook tests in `apps/web/src/app/api/google-tasks/google-tasks.hooks.test.tsx`

- [x] Write E2E test for sync flow in `apps/web/e2e/google-tasks.spec.ts`:
  - Test config modal opens on first sync toggle
  - Test list selection flow
  - Test sync indicator updates

- [x] Run `bun run check && bun run check-types` and fix any issues

- [x] Run `bun run test` and ensure all tests pass

- [x] Run `bun run build` and verify build succeeds

---

## Acceptance Criteria

- [x] User can click sync toggle on any todo to enable Google Tasks sync
- [x] First sync attempt opens configuration modal if not already configured
- [x] User can link Google account via OAuth from the modal
- [x] User can select existing Google Tasks list or create new one
- [x] Todos with sync enabled show blue Cloud icon
- [x] Toggling a synced todo immediately updates Google Tasks
- [x] Deleting a synced todo removes it from Google Tasks
- [x] Background sync runs every 15 minutes and pulls changes from Google
- [x] Last-write-wins conflict resolution works correctly
- [x] All tests pass (`bun run test`)
- [x] No type errors (`bun run check-types`)
- [x] Linting passes (`bun run check`)
- [x] Build succeeds (`bun run build`)

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/db/src/schema/todo.ts` | Add googleTaskId, googleSyncEnabled, lastSyncedAt |
| `packages/db/src/schema/google-tasks-integration.ts` | New table for integration settings |
| `packages/auth/src/index.ts` | Add Google OAuth provider |
| `packages/api/src/lib/google-tasks-client.ts` | Google Tasks API client |
| `packages/api/src/routers/google-tasks.ts` | New tRPC router |
| `packages/api/src/routers/todo.ts` | Modify toggle/delete for immediate sync |
| `apps/web/src/app/api/google-tasks/` | Entity-based frontend API |
| `apps/web/src/components/integrations/` | UI components for integration |
| `apps/web/src/components/todos/todo-expandable-item.tsx` | Add sync toggle button |
| `apps/web/src/app/api/cron/google-tasks-sync/route.ts` | Background sync cron |

---

## Notes

### Google Tasks API Limits
- 50,000 requests/day per user
- Rate limit: 500 requests/100 seconds per user
- Background sync should batch requests efficiently

### Token Refresh
- Better-Auth stores tokens in `account` table
- `GoogleTasksClient` checks `accessTokenExpiresAt` and refreshes if needed
- If refresh fails, mark integration as error state

### Edge Cases
- User revokes Google access: Catch 401 errors, disable integration, prompt re-auth
- Network failures during immediate sync: Log error but don't fail the toggle operation
- Todo deleted in Google: During pull sync, mark local todo as no longer synced (don't delete)
