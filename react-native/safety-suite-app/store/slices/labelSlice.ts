import { createSlice } from '@reduxjs/toolkit';
import {
  Label,
  ExpirationTypes,
  StatusTypes,
  PrintLabel,
  Category,
} from '../../src/data/label';
import { LabelOfflineQueue, LabelState, labelSizePayload } from '../types/store-types';

const initLabelState: LabelState = {
  labels: [] as Label[],
  labelCategories: [],
  category: '',
  search: '',
  previousSelections: {
    status: StatusTypes.RECEIVED,
    expiration: ExpirationTypes.DEFAULT,
  },
  offlineQueue: [],
  labelSize: '1x1.25',
};

export type ResetIphoneCartPayload = { context: string };
export type SetIphoneCartPayload = { context: string; labels: PrintLabel[] };

const labelSlice = createSlice({
  name: 'labels',
  initialState: initLabelState,
  reducers: {
    setCategoryFilter: (state: LabelState, action: { payload: { category: string } }) => {
      const { category } = action.payload;
      if (category === 'Clear All') {
        state.category = '';
      } else {
        state.category = category || '';
      }
    },
    removeCategoryFilter: (state: LabelState) => {
      state.category = '';
    },
    setSearchBarFilter: (state: LabelState, action: { payload: { search: string } }) => {
      state.search = action.payload.search;
    },
    setLabels: (state: LabelState, action: { payload: { labels: Label[] } }) => {
      const { labels } = action.payload;
      state.labels = labels;
    },
    setLabelCategories: (
      state: LabelState,
      action: { payload: { categories: Category[] } }
    ) => {
      const { categories } = action.payload;

      state.labelCategories = categories;
    },
    addToOfflineQueue: (state: LabelState, action: { payload: LabelOfflineQueue }) => {
      const { type, params } = action.payload;

      state.offlineQueue = [...state.offlineQueue, { type: type, params: params }];
    },
    setOfflineQueue: (
      state: LabelState,
      action: { payload: { queue: LabelOfflineQueue[] } }
    ) => {
      const { queue } = action.payload;
      state.offlineQueue = queue;
    },
    setLabelSize: (state: LabelState, action: { payload: labelSizePayload }) => {
      const { size } = action.payload;
      state.labelSize = size;
    },
  },
});

export const {
  setCategoryFilter,
  removeCategoryFilter,
  setSearchBarFilter,
  setLabels,
  setLabelCategories, // set available categories from
  addToOfflineQueue, // add callbacks to offline queue
  setOfflineQueue, // set offline queue after processing
  setLabelSize, // configures label size for prtiner
} = labelSlice.actions;

export const selectCategories = (State: LabelState) => State.category;
export const selectlabelsLabels = (State: LabelState) => State.labels;
export const selectLabelState = (State: LabelState) => State;
export default labelSlice.reducer;
