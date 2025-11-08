import { combineReducers, configureStore, Middleware } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/es/stateReconciler/autoMergeLevel2';

import { State } from './types/store-types';
import printerSlice from './slices/printerSlice';
import deviceSlice from './slices/deviceSlice';
import lableSlice from './slices/labelSlice';
import userSlice from './slices/userSlice';
import contextSlice from './slices/contextSlice';
import noteSlice from './slices/noteSlice';
import taskSlice from './slices/taskSlice';
import userPreferencesSlice from './slices/user-preferences';
import { middleware } from './middleware/Middleware';
import userInteractionSlice from './slices/userInteractionSlice';
import featureFlagSlice from './slices/FeatureFlagSlice';
import digitalPrepSlice from './slices/digitalPrepSlice';
import offlineQueue from './slices/offlineQueue';

const persistConfig = {
  key: 'pathspot-store-v1',
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
};

const rootReducer = combineReducers({
  printer: printerSlice,
  device: deviceSlice,
  labels: lableSlice,
  user: userSlice,
  context: contextSlice,
  notes: noteSlice,
  tasks: taskSlice,
  userInteraction: userInteractionSlice,
  userPreferences: userPreferencesSlice,
  digitalPrep: digitalPrepSlice,
  offlineQueue: offlineQueue,
  featureFlags: featureFlagSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const withRequiredParamsMiddleware: Middleware<NonNullable<unknown>, State> =
  (store) => (next) => (action) => {
    if (action.meta && action.meta.withRequiredParams) {
      const currentState = store.getState();
      const required = {
        customerId: currentState.context.customerId,
        userId: currentState.user.currUser?.id,
        deviceId: currentState.context.deviceId,
        locationId: currentState.context.locationId,
        assignedChecklistId: currentState.tasks.selected?.assignedId,
        checklistId: currentState.tasks.selected?.checklistId,
      };

      action.payload.params.requiredParams = required;
    }

    return next(action);
  };

export const store = configureStore({
  reducer: persistedReducer, //rootReducer
  devTools: __DEV__,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(withRequiredParamsMiddleware)
      .concat(...middleware),
});

export const persistor = persistStore(store);
