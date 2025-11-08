import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export type QueueItem<T = unknown> = {
  id: string;
  action: string;
  payload: T;
};

type InternalQueueItem<T = unknown> = QueueItem<T> & {
  retries: number;
  inflight: boolean;
};

export type OfflineQueue = {
  queue: InternalQueueItem[];
};

const initOfflineQueue: OfflineQueue = {
  queue: [],
};

const offlineQueueSlice = createSlice({
  name: 'offlineQueue',
  initialState: initOfflineQueue,
  reducers: {
    addToQueue: (state, action: PayloadAction<QueueItem>) => {
      state.queue.push({ ...action.payload, retries: 0, inflight: false });
    },
    removeMultipleFromQueue: (state, action: PayloadAction<{ ids: string[] }>) => {
      state.queue = state.queue.filter((item) => !action.payload.ids.includes(item.id));
    },
    updateInflightInQueue: (state, action: PayloadAction<{ ids: string[] }>) => {
      state.queue = state.queue.reduce<InternalQueueItem[]>((accum, item) => {
        if (action.payload.ids.includes(item.id)) {
          item.inflight = true;
        }
        accum.push(item);
        return accum;
      }, []);
    },
    updateRetriesInQueue: (state, action: PayloadAction<{ ids: string[] }>) => {
      state.queue = state.queue.reduce<InternalQueueItem[]>((accum, item) => {
        if (action.payload.ids.includes(item.id)) {
          if (item.retries >= 4) {
            return accum;
          } else {
            item.inflight = false;
            item.retries++;
          }
        }
        accum.push(item);
        return accum;
      }, []);
    },
  },
});

export const {
  addToQueue,
  removeMultipleFromQueue,
  updateInflightInQueue,
  updateRetriesInQueue,
} = offlineQueueSlice.actions;

export default offlineQueueSlice.reducer;
