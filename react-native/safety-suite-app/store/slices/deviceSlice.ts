import { createSlice } from '@reduxjs/toolkit';
import { getDeviceOrientation } from '../../utils/utils';
import { DeviceState } from '../types/store-types';
import { Device } from '../../src/data/device';

type addDevicePayload = {
  device: Device;
};

const initDeviceState: DeviceState = {
  orientation: getDeviceOrientation(),
  devices: [],
};

const deviceSlice = createSlice({
  name: 'device',
  initialState: initDeviceState,
  reducers: {
    setDeviceOrientation: (state) => {
      state.orientation = getDeviceOrientation();
    },
    setDevices: (state, action: any) => {
      const { devices } = action.payload;

      state.devices = devices;
    },
    addDevice: (state, action: { payload: addDevicePayload }) => {
      const { device } = action.payload;
      state.devices = [...state.devices, device];
    },
    editDevice: (state, action: { payload: addDevicePayload }) => {
      const { device } = action.payload;

      const filteredState = state.devices.filter((dev: Device) => dev.id !== device.id);
      state.devices = [...filteredState, device];
    },
  },
});

export const { setDeviceOrientation, setDevices, addDevice, editDevice } =
  deviceSlice.actions;
export const selectDeviceOrientation = (State: any) => State.cart;

export default deviceSlice.reducer;
