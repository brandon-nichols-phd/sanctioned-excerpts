import { useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TemperatureUnits, State } from '../../store/types/store-types';
import {
  TemperatureUnitPayload,
  setDisplayTemperatureUnits,
  setShowBothTemperatures as setShowBothTemperaturesStore,
} from '../../store/slices/user-preferences';

export type Return = {
  displayTemperatureUnit: TemperatureUnits;
  setTemperatureUnits: (unit: TemperatureUnits) => void;
  showBothTemperatures: boolean;
  setShowBothTemperatures: (flag: boolean) => void;
  temperaturesMigrated: boolean;
};

export const useUserPreferences = (): Return => {
  const displayTemperatureUnit = useSelector(
    (state: State) => state.userPreferences.displayTemperatureUnit
  );

  const temperaturesMigrated = useSelector(
    (state: State) => state.featureFlags.temperaturesMigrated
  );

  const showBothTemperatures = useSelector(
    (state: State) => state.userPreferences.showBothTemperatures
  );

  const dispatch = useDispatch();

  const setTemperatureUnits = useCallback(
    (unit: TemperatureUnits) => {
      if (unit !== displayTemperatureUnit) {
        const payload: TemperatureUnitPayload = { unit: unit };
        dispatch(setDisplayTemperatureUnits(payload));
      }
    },
    [displayTemperatureUnit, dispatch]
  );

  const setShowBothTemperatures = useCallback(
    (flag: boolean) => {
      dispatch(setShowBothTemperaturesStore(flag));
    },
    [dispatch]
  );

  return useMemo(
    () => ({
      displayTemperatureUnit,
      showBothTemperatures,
      setTemperatureUnits,
      setShowBothTemperatures,
      temperaturesMigrated,
    }),
    [
      displayTemperatureUnit,
      showBothTemperatures,
      setTemperatureUnits,
      setShowBothTemperatures,
      temperaturesMigrated,
    ]
  );
};
