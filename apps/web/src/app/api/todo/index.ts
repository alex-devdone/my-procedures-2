// API
export {
	getAllTodosQueryOptions,
	getBulkCreateTodosMutationOptions,
	getCreateTodoMutationOptions,
	getDeleteTodoMutationOptions,
	getTodosQueryKey,
	getToggleTodoMutationOptions,
	getUpdateTodoFolderMutationOptions,
} from "./todo.api";
// Hooks
export {
	notifyLocalTodosListeners,
	useSyncTodos,
	useTodoStorage,
} from "./todo.hooks";
// Types
export type {
	BulkCreateTodosInput,
	BulkCreateTodosOutput,
	CreateTodoInput,
	DeleteTodoInput,
	LocalTodo,
	RecurringPattern,
	RecurringPatternType,
	RemoteTodo,
	SelectedFolderId,
	SyncAction,
	SyncPromptState,
	Todo,
	ToggleTodoInput,
	UpdateTodoFolderInput,
	UseSyncTodosReturn,
	UseTodoStorageReturn,
} from "./todo.types";
export {
	bulkCreateTodosInputSchema,
	createTodoInputSchema,
	deleteTodoInputSchema,
	toggleTodoInputSchema,
	updateTodoFolderInputSchema,
} from "./todo.types";
export type { FilterType, TodoStats } from "./todo.utils";
// Utils (pure functions for filtering, sorting, stats)
export {
	applyOptimisticCreate,
	applyOptimisticDelete,
	applyOptimisticToggle,
	calculateTodoStats,
	createOptimisticTodo,
	filterTodos,
	filterTodosBySearch,
	filterTodosByStatus,
	getCurrentGreeting,
	getMotivationMessage,
	getRecentTodos,
	getTimeBasedGreeting,
	hasLocalTodosToSync,
	normalizeLocalTodo,
	normalizeLocalTodos,
	normalizeRemoteTodo,
	normalizeRemoteTodos,
	prepareTodosForSync,
} from "./todo.utils";
