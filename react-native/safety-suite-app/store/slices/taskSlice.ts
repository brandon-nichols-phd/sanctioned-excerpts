import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TaskList, Task } from '../../src/data/task';
import { findAndUpdateTask } from '../../utils/task-utils';
import { getUUID, isValidValue } from '../../utils/utils';
import {
  OfflineTaskActions,
  OfflineTaskQueue,
  TaskFilterPayload,
  TaskFilterTypes,
  TaskState,
  OfflineTaskQueueState,
  AddToOfflineQueue,
} from '../types/store-types';

const initialState: TaskState = {
  tasks: [],
  flagged: [],
  pinned: [],
  filters: {
    date: null,
    checklist: '',
    filter: [],
    sort: '',
  },
  selected: null,
  refresh: false,
  offlineQueue: [],
  showBottomFilters: false,
  showSortOptions: false,
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState: initialState,
  reducers: {
    setTasks: (state: TaskState, action: PayloadAction<{ tasks: TaskList[] }>) => {
      const { tasks } = action.payload;

      state.tasks = tasks;
      const selected =
        tasks.length && state.selected?.assignedId
          ? tasks.find((checklist) => checklist.assignedId === state.selected?.assignedId)
          : null;
      state.selected = selected ? selected : tasks.length ? tasks[0] ?? null : null;
    },
    addChecklist: (state: TaskState, action: PayloadAction<{ checklist: TaskList }>) => {
      const { checklist } = action.payload;
      state.tasks = [checklist, ...state.tasks];
      state.selected = checklist;
    },
    deactivateAssignment: (
      state: TaskState,
      action: PayloadAction<{ assignmentId: number }>
    ) => {
      const { assignmentId } = action.payload;

      state.tasks = state.tasks.filter((task) => task.assignedId !== assignmentId);

      // If the deactivated task list was selected, clear the selection
      if (state.selected?.assignedId === assignmentId) {
        state.selected = null;
      }
    },
    setTaskSelected: (
      state: TaskState,
      action: PayloadAction<{ assignedChecklistId: number }>
    ) => {
      const { assignedChecklistId } = action.payload;

      const selected = state.tasks.find(
        (task) => task.assignedId === assignedChecklistId
      );

      state.selected = selected || null;
      return state;
    },
    setTaskFilters: (state: TaskState, action: { payload: TaskFilterPayload }) => {
      const { type, filter } = action.payload;

      switch (type) {
        case TaskFilterTypes.DATE: // used in filter bar - today, weeekly, monthly
          state.filters = {
            ...state.filters,
            date: filter,
          };
          break;
        case TaskFilterTypes.CHECKLIST: // used in search bar
          state.filters = {
            ...state.filters,
            checklist: filter,
          };
          break;
        case TaskFilterTypes.FILTER:
          state.filters = {
            ...state.filters,
            filter: filter,
          };
          break;
        case TaskFilterTypes.SORT:
          state.filters = {
            ...state.filters,
            sort: filter,
          };
          break;
      }
    },
    /** add to offline queue for task state */
    addToOfflineQueue: {
      reducer: (state, action: PayloadAction<AddToOfflineQueue>) => {
        const { type, params, taskId } = action.payload;

        // dont queue a fetch if the last action in queue is a fetch
        if (type === OfflineTaskActions.FETCH) {
          const len = state.offlineQueue.length;
          if (state.offlineQueue[len - 1]?.type === OfflineTaskActions.FETCH) {
            return state;
          }
        }

        state.offlineQueue = [
          ...state.offlineQueue,
          {
            type: type,
            params: params,
            taskId: taskId,
            retryCount: 0,
            state: 'pending',
            id: getUUID(),
          },
        ].filter((val) => isValidValue(val));
      },
      prepare: (payload: {
        type: OfflineTaskActions;
        params: unknown;
        taskId: string;
        state: OfflineTaskQueueState;
        id: string;
      }) => {
        return { payload, meta: { withRequiredParams: true } };
      },
    },
    updateOfflineQueue: (
      state: TaskState,
      action: PayloadAction<{ queue: OfflineTaskQueue[] }>
    ) => {
      const { queue } = action.payload;

      if (!queue.length) {
        return;
      }

      const fqueue = state.offlineQueue.reduce((agg: OfflineTaskQueue[], item) => {
        const updatedItem = queue.find((qitem) => qitem.id === item.id);

        // did not find item in processed queue
        if (!updatedItem) {
          // add state item to process
          agg.push(item);
          return agg;
        }

        // determine to continue to process by state
        switch (updatedItem.state) {
          // continue to process && add back
          case 'pending':
            agg.push(updatedItem);
            break;

          // don't add back
          case 'remove':
            break;
        }
        return agg;
      }, []);

      state.offlineQueue = fqueue;
    },
    showFilterBottomModal: (state: TaskState) => {
      state.showBottomFilters = !state.showBottomFilters;
    },
    showSortingOptions: (state: TaskState) => {
      state.showSortOptions = !state.showSortOptions;
    },
    modifyTask: (state: TaskState, action: PayloadAction<{ task: Task }>) => {
      const { task } = action.payload;

      const checklistIndex = state.tasks.findIndex(
        (checklist) => checklist.assignedId === task.assingedToChecklistId
      );

      if (checklistIndex === -1) {
        return state;
      }

      const checklist = state.tasks[checklistIndex];

      if (checklist == null) {
        return state;
      }

      const newChecklist = findAndUpdateTask(task, checklist, task.uniqueId);

      state.tasks.splice(checklistIndex, 1, newChecklist);
      if (state.selected?.id === newChecklist.id) {
        state.selected = newChecklist;
      }
    },
  },
});

export const {
  setTasks,
  setTaskSelected,
  setTaskFilters,
  updateOfflineQueue,
  addToOfflineQueue,
  addChecklist,
  showFilterBottomModal,
  showSortingOptions,
  modifyTask,
  deactivateAssignment,
} = taskSlice.actions;

export default taskSlice.reducer;
