// API
export {
	getAllTodosQueryOptions,
	getBulkCreateTodosMutationOptions,
	getCompleteRecurringMutationOptions,
	getCreateTodoMutationOptions,
	getDeleteTodoMutationOptions,
	getTodosQueryKey,
	getToggleTodoMutationOptions,
	getUpdatePastCompletionMutationOptions,
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
	CompleteRecurringInput,
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
	UpdatePastCompletionInput,
	UpdateTodoFolderInput,
	UseSyncTodosReturn,
	UseTodoStorageReturn,
	VirtualTodo,
} from "./todo.types";
export {
	bulkCreateTodosInputSchema,
	completeRecurringInputSchema,
	createTodoInputSchema,
	deleteTodoInputSchema,
	toggleTodoInputSchema,
	updatePastCompletionInputSchema,
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
