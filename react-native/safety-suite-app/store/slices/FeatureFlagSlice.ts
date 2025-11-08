import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FeatureFlagState } from '../types/store-types';

const initFeatureFlagState: FeatureFlagState = {
  temperaturesMigrated: true,
};

const featureFlagState = createSlice({
  name: 'featureFlags',
  initialState: initFeatureFlagState,
  reducers: {
    setTemperatureMigrated: (
      state,
      action: PayloadAction<{ temperaturesMigrated: boolean }>
    ) => {
      const { temperaturesMigrated } = action.payload;
      state.temperaturesMigrated = temperaturesMigrated;
    },
  },
});

export const { setTemperatureMigrated } = featureFlagState.actions;
export default featureFlagState.reducer;
