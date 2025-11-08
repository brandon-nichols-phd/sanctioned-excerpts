import { createSlice } from '@reduxjs/toolkit';
import { UserPreferencesState, TemperatureUnits } from '../types/store-types';

const initpreferenceState: UserPreferencesState = {
  displayTemperatureUnit: 'F',
  showBothTemperatures: false,
};

export type TemperatureUnitPayload = { unit: TemperatureUnits };

const userPreferencesSlice = createSlice({
  name: 'preferences',
  initialState: initpreferenceState,
  reducers: {
    setDisplayTemperatureUnits: (
      state: UserPreferencesState,
      action: { payload: TemperatureUnitPayload }
    ) => {
      const { unit } = action.payload;
      state.displayTemperatureUnit = unit;
    },
    setShowBothTemperatures: (
      state: UserPreferencesState,
      action: { payload: boolean }
    ) => {
      state.showBothTemperatures = action.payload;
    },
  },
});

export const { setDisplayTemperatureUnits, setShowBothTemperatures } =
  userPreferencesSlice.actions;
export default userPreferencesSlice.reducer;
