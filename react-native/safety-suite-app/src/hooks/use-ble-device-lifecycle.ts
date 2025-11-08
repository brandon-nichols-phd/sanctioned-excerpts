import { useEffect, useRef } from 'react';
import { BLEDeviceComState } from '../types/ble';
import { safeAsyncCleanup } from '../../utils/utils';

/**
 * Hook to manage a BLE device's lifecycle with async + cancellation support.
 */
export type DeviceLifecycleParams = {
  /** Async function to run once on mount */
  initialize: () => Promise<void>;

  /** Async function to run once on unmount */
  endConnection: () => Promise<void>;

  /** Optional current status of the device (e.g. "Searching", "Connected", "Notifying") */
  deviceStatus?: BLEDeviceComState;

  /**
   * If true (default), `initialize()` will be skipped if `deviceStatus === "Notifying"` or if deviceStatus === "Initialized".
   * NOTE: Must be read-safely (e.g., inside `initialize()` of the corresponding devices ble hook) to avoid race conditions.
   */
  skipIfReady?: boolean;
};

/**
 * Executes BLE device lifecycle logic tied to the component's mount/unmount phase.
 *
 * Adds support for async, try/catch, and cancellation.
 */
export const useBLEDeviceLifecycle = ({
  initialize,
  endConnection,
  deviceStatus,
}: DeviceLifecycleParams): void => {
  const initRef = useRef(initialize);
  const endRef = useRef(endConnection);
  const statusRef = useRef(deviceStatus);

  useEffect(() => {
    let cancelled = false;

    const runInitialize = async () => {
      const shouldInit = !['Initialized', 'Notifying'].includes(
        statusRef.current ? statusRef.current : 'False'
      );

      if (shouldInit) {
        try {
          await initRef.current();
        } catch (err) {
          if (!cancelled) {
            console.warn('[useDeviceLifecycle] initialize() failed:', err);
          }
        }
      }
    };

    safeAsyncCleanup(async () => await runInitialize())();

    return safeAsyncCleanup(async () => {
      cancelled = true;

      try {
        await endRef.current();
      } catch (err) {
        console.warn('[useDeviceLifecycle] endConnection() failed:', err);
      }
    })();
  }, []);
};
