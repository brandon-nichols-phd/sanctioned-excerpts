import { useCallback, useEffect, useRef, useState } from 'react';

export const useTimer = (cb: () => void, interval: number) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(cb);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    callbackRef.current = cb;
  }, [cb]);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        callbackRef.current();
      }, interval);
    }
  }, [interval, isRunning]);

  const stopTimer = useCallback(() => {
    if (isRunning && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setIsRunning(false);
    }
  }, [isRunning]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    startTimer,
    stopTimer,
    isRunning,
  };
};
