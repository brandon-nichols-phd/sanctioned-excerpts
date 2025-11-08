import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ContextState } from '../types/store-types';
import moment from 'moment';

/**
 * customerId = {1: pathspot, 5, chopt}
 */
const initContextState: ContextState = {
  bottomTabContext: '',
  prevContext: '',
  defaultLocationId: null,
  locationId: null,
  customerId: null, // 1
  online: false,
  offlineDismissed: false,
  forceReconnect: false,
  offlineStartTime: null,
  locations: [],
  lastUserAction: '',
  loggedIn: false,
  deviceId: null,
  userId: null,
  roles: [],
};

const contextState = createSlice({
  name: 'context',
  initialState: initContextState,
  reducers: {
    /**
     * @param state
     * @param action - payload: {context: string}
     */
    setContext: (state, action: PayloadAction<{ context: string }>) => {
      const { context } = action.payload;

      state.prevContext = state.bottomTabContext;
      state.bottomTabContext = context;
    },
    setLocation: (state, action: any) => {
      const { locationId } = action.payload;

      state.locationId = locationId;
    },
    setCustomer: (state, action: any) => {
      const { customerId } = action.payload;

      state.customerId = customerId;
    },
    setLocations: (state, action: any) => {
      const { locations } = action.payload;

      state.locations = locations;
    },
    setLastUserAction: (state, action: any) => {
      const { time } = action.payload;

      state.lastUserAction = time ? time : moment().valueOf();
    },
    setLoggedIn: (state, action: any) => {
      const { authenticated } = action.payload;

      state.loggedIn = authenticated ? true : false;
    },
    registerDevice: (state, action: any) => {
      const { context } = action.payload;

      state.deviceId = context?.deviceId;
      state.customerId = context?.customerId;
      state.defaultLocationId = context?.locationId;
      state.locationId = context?.locationId;
      state.userId = context?.userId;
    },
    setRoles: (state, action: any) => {
      const { roles } = action.payload;

      state.roles = roles;
    },
    setUserId: (state, action: any) => {
      const { userId } = action.payload;

      state.userId = userId;
    },
    setOnline: (state, action: PayloadAction<{ online: boolean }>) => {
      state.online = action.payload.online;

      if (state.online) {
        state.offlineDismissed = false;
        state.forceReconnect = false;
        state.offlineStartTime = null;
      } else if (!state.offlineStartTime) {
        state.offlineStartTime = Date.now();
      }
    },
    dismissOfflineWatermark: (state) => {
      state.offlineDismissed = true;
    },
    restoreOfflineWatermark: (state) => {
      state.offlineDismissed = false;
    },
    forceReconnectMode: (state) => {
      state.forceReconnect = true;
      state.offlineDismissed = false;
    },
  },
});

export const {
  setContext,
  setLocation,
  setCustomer,
  setLocations,
  setLastUserAction,
  setLoggedIn,
  registerDevice,
  setRoles,
  setUserId,
  setOnline,
  dismissOfflineWatermark,
  restoreOfflineWatermark,
  forceReconnectMode,
} = contextState.actions;

export default contextState.reducer;
