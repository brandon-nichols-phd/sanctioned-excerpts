import React, { useEffect } from 'react';
import amplitude, { ensureAmplitudeInit } from './amplitude';
import { useAmplitudePageTracking } from './useAmplitudePageTrackings';

const AmplitudePageTracker: React.FC = () => {
  useEffect(() => {
    ensureAmplitudeInit();
  }, []);

  useAmplitudePageTracking(); // your existing page-view hook
  return null;
};

export default AmplitudePageTracker;
