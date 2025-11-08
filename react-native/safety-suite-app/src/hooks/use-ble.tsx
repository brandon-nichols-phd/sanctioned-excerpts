import React, {
  FC,
  PropsWithChildren,
  createContext,
  useRef,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  BleError,
  BleErrorCode,
  BleManager,
  Device,
  State as ControllerState,
  type DeviceId,
  type TransactionId,
  type UUID,
  type Characteristic,
  type Service,
  type Base64,
} from 'react-native-ble-plx';
import { createTaggedLogger } from '../../utils/dev-logging';

import {
  hasBLEPermissions,
  showErrorToast,
  showSuccessToast,
} from '../../utils/ble-utils';

import { safeAsyncCleanup } from '../../utils/utils';
import {
  BLEControllerScanState,
  BLEDeviceComState,
  BLEListeners,
  BLEDeviceOptions,
  BLEDeviceTypeModel,
  BLEPeripheral,
  BLEDeviceType,
  BlePlxCharacteristic,
} from '../types/ble';

/**
 * Note on BLE:
 * Pairing vs Bonding vs Connecting
 * Connecting = temporary session (no credentials).
 * Pairing = exchanging encryption keys (for secure communication).
 * Bonding = saving those keys for future use.
 * BLE doesn't require pairing unless the data is sensitive.
 */

const BleCustomErrorText = {
  NotConnected: 'BLE Device not connected.',
  NotAuthorized:
    'Not authorized to use bluetooth devices. Please check device settings to enable bluetooth for this application.',
  NoneRegistered:
    'Attempt to get registered peripherals by device type failed: No devices have been registered.',
  ServiceDeviceNotFound: 'Unable to get services for peripheral by ID, no device found.',
  ServiceCharacteristicDeviceNotFound:
    'Unable to get service charactersticj for peripheral by ID, no device found.',
};

type BLEContextState = {
  scanningStatus: BLEControllerScanState;
  getPeripheralStateById: (peripheralId: DeviceId) => Promise<BLEDeviceComState>;
  connectToDeviceById: (peripheralId: DeviceId) => Promise<void>;
  disconnectDeviceById: (peripheralId: DeviceId) => Promise<void>;
  startScanForDeviceType: (
    deviceType: BLEDeviceType,
    serviceUUIDs?: string[]
  ) => Promise<void>;
  endAllConnectionsByDeviceType: (deviceType: BLEDeviceType) => Promise<void>;
  hasCharacteristicByPeripheralId: (
    peripheralId: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID
  ) => Promise<boolean>;
  registerDeviceType: (
    deviceType: BLEDeviceType,
    detection: (instance: Device) => boolean,
    listeners: BLEListeners,
    options?: BLEDeviceOptions
  ) => () => void;
  resetScanningState: () => void;
  // Additional utility functions
  readCharacteristicValue: (
    peripheral: BLEPeripheral,
    serviceUUID: UUID,
    characteristicUUID: UUID
  ) => Promise<Characteristic>;
  writeCharacteristicWithResponseForDevice: (
    peripheral: BLEPeripheral,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    data: Base64
  ) => Promise<Characteristic>;
  writeToCharacteristicWithoutResponse: (
    peripheral: BLEPeripheral,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    data: Base64
  ) => Promise<void>;
  setupCharacteristicMonitor: (
    peripheral: BLEPeripheral,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    onCharacteristicReceived: (characteristic: Characteristic) => void,
    onError: (error: Error) => void,
    transactionId?: TransactionId,
    hideErrorDisplay?: boolean
  ) => Promise<any>;
  discoverPeripheralServices: (peripheral: BLEPeripheral) => Promise<boolean | undefined>;
  cleanupPeripheralMonitors: (peripheral: BLEPeripheral) => void;
  enhancedDisconnectDevice: (device: Device) => Promise<void>;
  getRegisteredPeripheralById: (peripheralId: DeviceId) => BLEPeripheral | null;
};

const BLEStateContext = createContext<BLEContextState | null>(null);

export const useBLE = (): BLEContextState => {
  const stateContext = useContext(BLEStateContext);
  if (stateContext === null) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return stateContext;
};

/**
 * Default BLE Timeout Constants
 */
export const BLE_TIMEOUT_SECONDS = 10;
export const BLE_TIMEOUT_MS = 1000 * BLE_TIMEOUT_SECONDS;

/**
 * BLE Controller Singleton Pattern - Recommended by react-native-ble-plx
 * Global singleton access is the official best practice for this library
 */
const BLEManager = new BleManager({
  restoreStateIdentifier: 'pathspot-ble-manager',
  restoreStateFunction: (restoredState) => {
    console.log('BLE state restored:', restoredState);
  },
});

// Centralized development logging
const logger = createTaggedLogger('hook: use-ble:');

/**
 * Independent Functions ---------------------------------------------------------------
 */

/**
 * Connection retry with exponential backoff
 */
const connectWithRetry = async (
  deviceId: DeviceId,
  options: { timeout?: number; maxRetries?: number } = {}
): Promise<Device> => {
  const { timeout = BLE_TIMEOUT_MS, maxRetries = 2 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.debug(
        `Connection attempt ${attempt + 1}/${maxRetries} for device ${deviceId}`
      );

      const device = await BLEManager.connectToDevice(deviceId, {
        timeout: timeout, // Consistent timeout for each attempt
        autoConnect: attempt > 0, // Auto-connect on retries for better reliability
      });

      logger.debug(
        `Successfully connected to device ${deviceId} on attempt ${attempt + 1}`
      );
      return device;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      logger.warn(
        `Connection attempt ${attempt + 1} failed:${error.message}`
      );

      if (isLastAttempt) {
        logger.error(
          `All ${maxRetries} connection attempts failed for device ${deviceId}`
        );
        throw error;
      }

      // Exponential backoff delay: 1s, 2s, 4s...
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      logger.debug(`Waiting ${delay}ms before retry...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to throw in loop
  throw new Error(`Failed to connect to device ${deviceId} after ${maxRetries} attempts`);
};

const isPeripheralConnected = async (peripheral: BLEPeripheral) => {
  if (peripheral.instance.id) {
    try {
      return await BLEManager.isDeviceConnected(peripheral.instance.id);
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  return false;
};

export const BLEProvider: FC<PropsWithChildren> = (props) => {
  const [scanningStatus, setScanningStatus] =
    useState<BLEControllerScanState>('NotStarted');
  const registeredDevicesRef = useRef(new Map<BLEDeviceType, BLEDeviceTypeModel>());
  const [startedBLE, setStartedBLE] = useState<boolean>(false);
  const scanningInProgressRef = useRef<boolean>(false);
  const currentScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /**
   * Hook to cleanup after dismount - React 18 StrictMode compatible
   */
  useEffect(() => {
    let isDestroyed = false;

    return safeAsyncCleanup(async () => {
      if (!isDestroyed) {
        isDestroyed = true;
        try {
          // Clear scanning timeout and reset state
          if (currentScanTimeoutRef.current) {
            clearTimeout(currentScanTimeoutRef.current);
            currentScanTimeoutRef.current = null;
          }
          scanningInProgressRef.current = false;

          await BLEManager.stopDeviceScan();
          if (BLEManager) {
            await BLEManager.destroy();
          }
        } catch (error) {
          console.warn('BLE cleanup failed:', error);
        }
      }
    });
  }, []);

  const checkBluetoothPermission = async () => {
    const hasPermissions = await hasBLEPermissions();
    if (!hasPermissions) {
      setScanningStatus('Error');
      return false;
    }
    return true;
  };

  const initializeBLE = async () =>
    new Promise<void>((resolve) => {
      const subscription = BLEManager.onStateChange(async (state: ControllerState) => {
        switch (state) {
          case ControllerState.Unsupported:
            showErrorToast(
              'Bluetooth low energy connections are not supported by this device. Please contact PathSpot support.'
            );
            break;
          case ControllerState.PoweredOff:
            onBluetoothPowerOff();
            BLEManager.enable().catch(async (error: BleError) => {
              if (error.errorCode === BleErrorCode.BluetoothUnauthorized) {
                try {
                  const hasPermissions = await checkBluetoothPermission();
                  if (!hasPermissions) {
                    showErrorToast(BleCustomErrorText.NotAuthorized);
                  }
                } catch (permissionError) {
                  logger.error(
                    'Failed to check Bluetooth permissions in enable catch:',
                    permissionError
                  );
                  showErrorToast(BleCustomErrorText.NotAuthorized);
                }
              }
            });
            break;
          case ControllerState.Unauthorized:
            try {
              const hasPermissions = await checkBluetoothPermission();
              if (!hasPermissions) {
                showErrorToast(BleCustomErrorText.NotAuthorized);
              }
            } catch (permissionError) {
              logger.error(
                'Failed to check Bluetooth permissions in unauthorized case:',
                permissionError
              );
              showErrorToast(BleCustomErrorText.NotAuthorized);
            }
            break;
          case ControllerState.PoweredOn:
            resolve();
            subscription.remove();
            break;
          default:
            logger.error('Unknown BLE controller state: ', state);
        }
      }, true);
    });

  /**
   * Registration ------------------------------------------------------------------------
   */
  const registerDeviceType = useCallback(
    (
      deviceType: BLEDeviceType,
      detection: (peripheral: Device) => boolean,
      listeners: BLEListeners,
      options?: BLEDeviceOptions
    ) => {
      if (!registeredDevicesRef.current.has(deviceType)) {
        registeredDevicesRef.current.set(deviceType, {
          deviceType,
          detection,
          listeners,
          identifiedDevices: new Map(),
          options,
        });
      }
      return () => {
        registeredDevicesRef.current.delete(deviceType);
      };
    },
    []
  );

  const getRegisteredPeripheralsByDeviceType = (
    deviceType: BLEDeviceType
  ): Map<DeviceId, BLEPeripheral> | null => {
    if (registeredDevicesRef.current.size === 0) {
      logger.error(BleCustomErrorText.NoneRegistered);
      throw new Error(BleCustomErrorText.NoneRegistered);
    }
    const deviceTypeModel = registeredDevicesRef.current.get(deviceType);
    if (deviceTypeModel) {
      const deviceMap = deviceTypeModel.identifiedDevices;
      logger.debug(
        `Found registered devices for device type ${deviceType}} are: `,
        deviceMap
      );
      return deviceMap;
    }
    return null;
  };

  const getRegisteredPeripheralById = (peripheralId: DeviceId): BLEPeripheral | null => {
    const entry = Array.from(registeredDevicesRef.current.values()).find((deviceType) =>
      deviceType.identifiedDevices.has(peripheralId)
    );

    return entry?.identifiedDevices.get(peripheralId) ?? null;
  };

  const updateRegisteredPeripheralById = (
    peripheralId: DeviceId,
    newPeripheral: BLEPeripheral
  ): void => {
    for (const deviceType of registeredDevicesRef.current.values()) {
      if (deviceType.identifiedDevices.has(peripheralId)) {
        deviceType.identifiedDevices.set(peripheralId, newPeripheral);
        return; // stop once updated
      }
    }
  };

  /**
   * Scanning  ---------------------------------------------------------------------------
   */
  const scanForDevices = useCallback(
    (
      onDeviceFound: (device: Device) => void,
      UUIDs: UUID[] | null = null,
      legacyScan?: boolean
    ) => {
      BLEManager.startDeviceScan(
        UUIDs,
        { legacyScan },
        (error: BleError | null, device: Device | null) => {
          if (error) {
            console.error(error);
            logger.error('Scan error:', error.message);

            // Critical fix: Reset scanning flag when scan fails
            scanningInProgressRef.current = false;
            setScanningStatus('Error');

            // Clear timeout since scan failed early
            if (currentScanTimeoutRef.current) {
              clearTimeout(currentScanTimeoutRef.current);
              currentScanTimeoutRef.current = null;
            }

            BLEManager.stopDeviceScan()
              .then(() => console.debug('Scan stopped successfully...'))
              .catch((reason) =>
                logger.error('Failed to stop scanning:', reason)
              );
            return;
          }
          if (device) {
            onDeviceFound(device);
          }
        }
      )
        .then(() => {})
        .catch(console.error);
    },
    [setScanningStatus]
  );
  const stopScan = useCallback(async () => {
    // Clear any existing timeout
    if (currentScanTimeoutRef.current) {
      clearTimeout(currentScanTimeoutRef.current);
      currentScanTimeoutRef.current = null;
    }

    // Reset scanning state
    scanningInProgressRef.current = false;

    try {
      await BLEManager.stopDeviceScan();
      setScanningStatus('Done');
    } catch (reason) {
      logger.error('Unable to stop ble scan:', reason);
    }
  }, [setScanningStatus]);

  // TODO: Validate correct handling of timeout
  const startScanForDeviceType = useCallback(
    async (deviceType: BLEDeviceType, serviceUUIDs: string[] = []) => {
      // Prevent concurrent scans
      if (scanningInProgressRef.current) {
        logger.warn(
          `Scan already in progress, ignoring new scan request for ${deviceType}`
        );
        return;
      }

      try {
        // Set scanning in progress flag
        scanningInProgressRef.current = true;

        // Check that the device type has already been registered
        const deviceInfo = registeredDevicesRef.current.get(deviceType);
        if (!deviceInfo) {
          logger.error('An attempt was made to scan for a device with unregistered device type:', deviceType);
          scanningInProgressRef.current = false;
          return;
        }

        if (!startedBLE) {
          await initializeBLE();
          const hasPermissions = await checkBluetoothPermission();
          setStartedBLE(hasPermissions);
          if (!hasPermissions) {
            logger.error('BLE permissions not granted');
            scanningInProgressRef.current = false;
            return;
          }
        }

        setScanningStatus('Scanning');

        // Track devices discovered in this scan (not from cache)
        const currentScanDevices = new Map<DeviceId, Device>();

        // Check already connected devices first
        const connectedDevices = await BLEManager.connectedDevices([]);
        connectedDevices.forEach((peripheral: Device) => {
          if (deviceInfo.detection(peripheral)) {
            // Add connected devices to current scan results since they're actively available
            currentScanDevices.set(peripheral.id, peripheral);
            
            if (!deviceInfo.identifiedDevices.has(peripheral.id)) {
              const blePeripheral = {
                instance: peripheral,
              };
              deviceInfo.identifiedDevices.set(peripheral.id, blePeripheral);
              deviceInfo.listeners.onDiscover?.(peripheral);
            }
          }
        });

        // Start actual scanning
        scanForDevices(
          (device: Device) => {
            logger.log(
              `[SCAN] Discovered device: ${device.name || 'unnamed'} (${device.id}) RSSI: ${device.rssi}dBm Services: ${device.serviceUUIDs?.join(', ') || 'none'}`
            );
            
            const isMatch = deviceInfo.detection(device);
            logger.log(
              `[SCAN] Device ${isMatch ? '✅ MATCHES' : '❌ REJECTED by'} ${deviceType} detection logic`
            );
            
            if (isMatch) {
              // Always track device discovered in current scan with fresh RSSI/data
              currentScanDevices.set(device.id, device);
              
              if (!deviceInfo.identifiedDevices.has(device.id)) {
                logger.log(
                  `[SCAN] Adding new ${deviceType} device to identified list: ${device.id}`
                );
                const blePeripheral = {
                  instance: device,
                };
                deviceInfo.identifiedDevices.set(device.id, blePeripheral);
                deviceInfo.listeners.onDiscover?.(device);
              } else {
                logger.log(
                  `[SCAN] Device ${device.id} already in identified list, updating with fresh data`
                );
                // Update cached device with fresh scan data (including current RSSI)
                const blePeripheral = {
                  instance: device,
                };
                deviceInfo.identifiedDevices.set(device.id, blePeripheral);
              }
            }
          },
          serviceUUIDs,
          deviceInfo.options?.scanOptions?.legacyScan
        );

        // Auto-stop scanning after timeout
        currentScanTimeoutRef.current = setTimeout(async () => {
          logger.log(
            `[SCAN] Scan timeout reached (${BLE_TIMEOUT_MS}ms), stopping scan for ${deviceType}`
          );
          await stopScan(); // Make sure stopScan completes before calling onScanDone
          
          // UNIFIED FIX: Pass actively discovered devices directly (no stale devices, no instance confusion)
          logger.log(
            `[SCAN] Scan completed for ${deviceType} - found ${currentScanDevices.size} actively responding devices`
          );
          
          if (currentScanDevices.size > 0) {
            logger.log(`[SCAN] Fresh actively responding devices:`);
            currentScanDevices.forEach((device, id) => {
              logger.log(
                `[SCAN] - ${device.name || 'unnamed'} (${id}) RSSI: ${device.rssi}dBm [ACTIVE]`
              );
            });
          } else {
            logger.log(`[SCAN] No actively responding devices found`);
          }
          
          deviceInfo.listeners.onScanDone?.(currentScanDevices);
        }, BLE_TIMEOUT_MS);
      } catch (e) {
        logger.error('Attempt to scan for BLE devices failed:', e);
        setScanningStatus('Error');

        // Reset scanning state on error to prevent getting stuck
        scanningInProgressRef.current = false;

        // Clean up timeout on error
        if (currentScanTimeoutRef.current) {
          clearTimeout(currentScanTimeoutRef.current);
          currentScanTimeoutRef.current = null;
        }
      }
    },
    [
      startedBLE,
      setScanningStatus,
      initializeBLE,
      checkBluetoothPermission,
      scanForDevices,
      stopScan,
    ]
  );

  // stopScan moved above startScanForDeviceType to fix declaration order

  /**
   * Discovery
   */
  const discoverPeripheralServices = useCallback(async (peripheral: BLEPeripheral) => {
    const isConnected = await peripheral.instance.isConnected();
    if (!isConnected) {
      showErrorToast(BleCustomErrorText.NotConnected);
      return;
    }
    try {
      const newInstance = await BLEManager.discoverAllServicesAndCharacteristicsForDevice(
        peripheral.instance.id
      );

      if (newInstance && newInstance.id === peripheral.instance.id) {
        const newPeripheral = { ...peripheral, instance: newInstance };
        updateRegisteredPeripheralById(peripheral.instance.id, newPeripheral);
        logger.debug(
          'Successfully discovered services for device:',
          newInstance.id
        );
        return true;
      } else {
        logger.error('Service discovery failed or returned invalid device');
        return false;
      }
    } catch (error) {
      logger.error('Service discovery error:', error);
      return false;
    }
  }, []);

  /**
   * Connecting  -----------------------------------------------------------------------
   */
  const connectToDeviceById = useCallback(
    async (deviceId: DeviceId, timeout?: number, ignoreError = false, maxRetries?: number): Promise<void> => {
      return new Promise(async (resolve, reject) => {
        try {
          // Check that the BLEManager isn't currently scanning
          const scanState = await BLEManager.state();
          if (scanState !== ControllerState.PoweredOn) {
            if (
              scanState === ControllerState.Resetting ||
              scanState === ControllerState.Unknown
            ) {
              logger.debug(
                'In attempt to connect BLE device, controller was not in powered on state, stopping device scan for completeness: ',
                scanState
              );
              await BLEManager.stopDeviceScan();
            } else {
              const error =
                'Attempt to connect to BLE device failed. BLE controller not ready...';
              reject(new Error(error));
              return;
            }
          }

          const device = await connectWithRetry(deviceId, {
            timeout: timeout || BLE_TIMEOUT_MS,
            maxRetries: maxRetries || 2,
          });

          // Find the registered peripheral and call its onConnect handler
          const peripheral = getRegisteredPeripheralById(deviceId);
          if (peripheral) {
            const deviceTypeModel = Array.from(
              registeredDevicesRef.current.values()
            ).find((model) => model.identifiedDevices.has(deviceId));

            if (deviceTypeModel?.listeners.onConnect) {
              await deviceTypeModel.listeners.onConnect(device);
            }
          }

          resolve();
        } catch (error: any) {
          if (error.errorCode === BleErrorCode.DeviceAlreadyConnected) {
            // Device already connected, this is fine
            resolve();
          } else {
            if (!ignoreError) {
              logger.error('Connect failed:', error);
              showErrorToast(`Failed to connect to device: ${error.message}`);
            }
            reject(error);
          }
        }
      });
    },
    []
  );

  const isDeviceWithIdConnected = async (id: DeviceId): Promise<boolean> => {
    try {
      return await BLEManager.isDeviceConnected(id);
    } catch (error) {
      logger.error('isDeviceConnected failed:', error);
      return false;
    }
  };

  const disconnectDeviceById = useCallback(
    (id: DeviceId) =>
      BLEManager.cancelDeviceConnection(id)
        .then(() => showSuccessToast('Device disconnected'))
        .catch((error: BleError) => {
          if (error.errorCode !== BleErrorCode.DeviceDisconnected) {
            console.error(error);
          }
        }),
    []
  );

  const disconnectDevice = useCallback(async (device: Device) => {
    const isConnected = await device.isConnected();
    if (!isConnected) {
      const errorText = `Error disconnecting from device: ${JSON.stringify(
        device
      )}. ${BleCustomErrorText.NotConnected}`;
      logger.error(errorText);
      showErrorToast(BleCustomErrorText.NotConnected);
      throw new Error(errorText);
    }
    return disconnectDeviceById(device.id);
  }, []);

  const endAllConnectionsByDeviceType = useCallback(
    async (deviceType: BLEDeviceType) => {
      try {
        const peripherals = getRegisteredPeripheralsByDeviceType(deviceType);
        if (peripherals) {
          // Use Array.from to handle Map iteration properly with await
          const peripheralArray = Array.from(peripherals.values());
          for (const bleDevice of peripheralArray) {
            try {
              await disconnectDevice(bleDevice.instance);
            } catch (error) {
              logger.error('Failed to disconnect device:', error);
            }
          }
        }
      } catch (error) {
        logger.error('endAllConnectionsByDeviceType failed:', error);
      }
    },
    [disconnectDevice]
  );

  const readCharacteristicValue = useCallback(
    async (peripheral: BLEPeripheral, serviceUUID: UUID, characteristicUUID: UUID) => {
      try {
        const isConnected = await isPeripheralConnected(peripheral);
        if (!isConnected) {
          showErrorToast(BleCustomErrorText.NotConnected);
          throw new Error(BleCustomErrorText.NotConnected);
        }

        const characteristic = await BLEManager.readCharacteristicForDevice(
          peripheral.instance.id,
          serviceUUID,
          characteristicUUID
        );

        return characteristic;
      } catch (error) {
        logger.error('readCharacteristicValue failed:', error);
        throw error;
      }
    },
    []
  );

  const writeCharacteristicWithResponseForDevice = useCallback(
    async (
      peripheral: BLEPeripheral,
      serviceUUID: UUID,
      characteristicUUID: UUID,
      time: Base64
    ) => {
      const isConnected = await isPeripheralConnected(peripheral);
      if (!isConnected) {
        showErrorToast(BleCustomErrorText.NotConnected);
        throw new Error(BleCustomErrorText.NotConnected);
      }
      return BLEManager.writeCharacteristicWithResponseForDevice(
        peripheral.instance.id,
        serviceUUID,
        characteristicUUID,
        time
      ).catch((error) => {
        console.error(error);
        throw error;
      });
    },
    []
  );

  const writeToCharacteristicWithoutResponse = async (
    peripheral: BLEPeripheral,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    time: Base64
  ) => {
    if (!peripheral.instance) {
      showErrorToast(BleCustomErrorText.NotConnected);
      throw new Error(BleCustomErrorText.NotConnected);
    }
    return BLEManager.writeCharacteristicWithoutResponseForDevice(
      peripheral.instance.id,
      serviceUUID,
      characteristicUUID,
      time
    ).catch((error) => {
      console.error(error);
      throw error;
    });
  };

  const updatePeripheralCharacteristicAttributes = <T extends keyof BlePlxCharacteristic>(
    peripheral: BLEPeripheral,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    characteristicAttribute: T,
    attributeValue: BlePlxCharacteristic[T]
  ) => {
    const service = peripheral.discoveredServices?.get(serviceUUID);
    const matchedCharacteristic = service?.characteristics.get(characteristicUUID);

    if (matchedCharacteristic && service) {
      service.characteristics.set(characteristicUUID, {
        ...matchedCharacteristic,
        [characteristicAttribute]: attributeValue,
      });
    }
  };

  const setupCharacteristicMonitor = async (
    peripheral: BLEPeripheral,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    onCharacteristicReceived: (characteristic: Characteristic) => void,
    onError: (error: Error) => void,
    transactionId?: TransactionId,
    hideErrorDisplay?: boolean
  ) => {
    try {
      const isConnected = await isDeviceWithIdConnected(peripheral.instance.id);
      if (isConnected !== true) {
        showErrorToast(BleCustomErrorText.NotConnected);
        throw new Error(BleCustomErrorText.NotConnected);
      }

      // Clean up any existing monitor first with proper error handling
      const cleanupExistingMonitor = async () => {
        const existingMonitor = peripheral.discoveredServices
          ?.get(serviceUUID)
          ?.characteristics.get(characteristicUUID)?.characteristicMonitor;

        if (existingMonitor) {
          try {
            // Mark as expected disconnect to prevent error logging
            updatePeripheralCharacteristicAttributes(
              peripheral,
              serviceUUID,
              characteristicUUID,
              'isCharacteristicMonitorDisconnectExpected',
              true
            );
            existingMonitor.remove();

            // Clear the monitor reference to prevent memory leaks
            updatePeripheralCharacteristicAttributes(
              peripheral,
              serviceUUID,
              characteristicUUID,
              'characteristicMonitor',
              null
            );

            logger.debug('Cleaned up existing monitor');
          } catch (error) {
            logger.warn('Failed to cleanup existing monitor:', error);
          }
        }
      };

      await cleanupExistingMonitor();

      // Generate transaction ID if not provided
      const txId =
        transactionId ||
        `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const characteristicMonitor = BLEManager.monitorCharacteristicForDevice(
        peripheral.instance.id,
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            const isDisconnectExpected = peripheral.discoveredServices
              ?.get(serviceUUID)
              ?.characteristics.get(
                characteristicUUID
              )?.isCharacteristicMonitorDisconnectExpected;

            if (
              error.errorCode === BleErrorCode.OperationCancelled &&
              isDisconnectExpected
            ) {
              const attr: keyof BlePlxCharacteristic =
                'isCharacteristicMonitorDisconnectExpected';
              updatePeripheralCharacteristicAttributes(
                peripheral,
                serviceUUID,
                characteristicUUID,
                attr,
                false
              );

              // Clear monitor reference on cancellation to prevent memory leaks
              updatePeripheralCharacteristicAttributes(
                peripheral,
                serviceUUID,
                characteristicUUID,
                'characteristicMonitor',
                null
              );
              return;
            }

            // For other errors, also clean up monitor to prevent memory leaks
            logger.error('Monitor error:', error);
            updatePeripheralCharacteristicAttributes(
              peripheral,
              serviceUUID,
              characteristicUUID,
              'characteristicMonitor',
              null
            );

            if (!hideErrorDisplay) {
              showErrorToast(`Monitor error: ${error.message}`);
            }
            onError(error);
            return;
          }
          if (characteristic) {
            onCharacteristicReceived(characteristic);
          }
        },
        txId
      );

      // Store transaction ID for potential cancellation
      updatePeripheralCharacteristicAttributes(
        peripheral,
        serviceUUID,
        characteristicUUID,
        'transactionId' as any,
        txId
      );

      updatePeripheralCharacteristicAttributes(
        peripheral,
        serviceUUID,
        characteristicUUID,
        'characteristicMonitor',
        characteristicMonitor
      );

      return characteristicMonitor;
    } catch (error) {
      logger.error('setupCharacteristicMonitor failed:', error);
      throw error;
    }
  };

  const getServicesForPeripheralById = useCallback(
    async (peripheralId: string): Promise<Service[]> => {
      const peripheral = getRegisteredPeripheralById(peripheralId);
      if (!peripheral) {
        logger.error(BleCustomErrorText.ServiceDeviceNotFound, peripheralId);
        return Promise.reject(BleCustomErrorText.ServiceDeviceNotFound);
      }
      try {
        return await BLEManager.servicesForDevice(peripheral.instance.id);
      } catch (error) {
        console.error(error);
        return Promise.reject(
          `Unable to get services for device with id: ${peripheralId}}`
        );
      }
    },
    []
  );

  const hasCharacteristicByPeripheralId = useCallback(
    async (
      peripheralId: DeviceId,
      serviceUUID: UUID,
      characteristicUUID: UUID
    ): Promise<boolean> => {
      try {
        // Input validation
        if (!peripheralId || !serviceUUID || !characteristicUUID) {
          logger.warn(
            'Invalid parameters provided to hasCharacteristicByPeripheralId'
          );
          return false;
        }

        // Check if device is still connected first
        const isConnected = await isDeviceWithIdConnected(peripheralId);
        if (!isConnected) {
          logger.debug(
            `Device ${peripheralId} not connected, cannot check characteristics`
          );
          return false;
        }

        // First check if peripheral is registered and has discovered services
        const peripheral = getRegisteredPeripheralById(peripheralId);
        if (peripheral?.discoveredServices) {
          const service = peripheral.discoveredServices.get(serviceUUID);
          if (service?.characteristics.has(characteristicUUID)) {
            // Validate the characteristic actually exists and is accessible
            const characteristic = service.characteristics.get(characteristicUUID);
            if (characteristic?.instance) {
              return true;
            }
          }
        }

        // Fallback to checking via BLE manager with better error handling
        try {
          const services = await getServicesForPeripheralById(peripheralId);
          for (const service of services) {
            if (service.uuid.toLowerCase() === serviceUUID.toLowerCase()) {
              const characteristics = await BLEManager.characteristicsForDevice(
                peripheralId,
                serviceUUID
              );
              const hasCharacteristic = characteristics.some(
                (char) => char.uuid.toLowerCase() === characteristicUUID.toLowerCase()
              );

              if (hasCharacteristic) {
                logger.debug(
                  `Found characteristic ${characteristicUUID} in service ${serviceUUID} for device ${peripheralId}`
                );
                return true;
              }
            }
          }
        } catch (fallbackError) {
          logger.error(
            'Fallback characteristic check failed:',
            fallbackError
          );
          // Continue to return false rather than throw
        }

        logger.debug(
          `Characteristic ${characteristicUUID} not found in service ${serviceUUID} for device ${peripheralId}`
        );
        return false;
      } catch (error) {
        logger.error('hasCharacteristicByPeripheralId failed:', error);
        return false;
      }
    },
    []
  );

  const getPeripheralStateById = useCallback(
    async (peripheralId: DeviceId): Promise<BLEDeviceComState> => {
      try {
        const peripheral = getRegisteredPeripheralById(peripheralId);
        if (!peripheral) {
          return 'Unknown';
        }

        const isConnected = await BLEManager.isDeviceConnected(peripheralId);
        if (!isConnected) {
          return 'Disconnected';
        }

        // Check if device has discovered services
        if (peripheral.discoveredServices && peripheral.discoveredServices.size > 0) {
          // Check if any characteristics are being monitored (notifying)
          const hasActiveMonitors = Array.from(
            peripheral.discoveredServices.values()
          ).some((service) =>
            Array.from(service.characteristics.values()).some(
              (char) => char.characteristicMonitor !== null
            )
          );

          if (hasActiveMonitors) {
            return 'Notifying';
          }
          return 'Initialized';
        }

        return 'Connected';
      } catch (error) {
        logger.error('getPeripheralStateById failed:', error);
        return 'Error';
      }
    },
    []
  );

  const onBluetoothPowerOff = () => {
    showErrorToast(
      'Bluetooth service is disabled. Navigate to device settings to enable bluetooth and restart the application.'
    );
  };

  // Cleanup function to remove all monitors for a peripheral
  const cleanupPeripheralMonitors = useCallback((peripheral: BLEPeripheral) => {
    if (peripheral.discoveredServices) {
      for (const service of Array.from(peripheral.discoveredServices.values())) {
        for (const characteristic of Array.from(service.characteristics.values())) {
          if (characteristic.characteristicMonitor) {
            // Always clear the reference regardless of removal success
            const monitor = characteristic.characteristicMonitor;
            characteristic.characteristicMonitor = null;

            try {
              // Mark as expected disconnect to prevent error logging
              characteristic.isCharacteristicMonitorDisconnectExpected = true;
              monitor.remove();
              logger.debug('Successfully removed monitor');
            } catch (error) {
              logger.warn(
                'Failed to remove monitor (reference cleared):',
                error
              );
              // Monitor reference is already cleared above, so no memory leak
            } finally {
              // Reset the disconnect expected flag
              characteristic.isCharacteristicMonitorDisconnectExpected = false;
            }
          }
        }
      }
    }
  }, []);

  // Enhanced disconnect that cleans up monitors
  const enhancedDisconnectDevice = useCallback(
    async (device: Device) => {
      try {
        const peripheral = getRegisteredPeripheralById(device.id);
        if (peripheral) {
          // Clean up monitors first
          cleanupPeripheralMonitors(peripheral);

          // Call device-specific onDisconnect handler
          const deviceTypeModel = Array.from(registeredDevicesRef.current.values()).find(
            (model) => model.identifiedDevices.has(device.id)
          );
          if (deviceTypeModel?.listeners.onDisconnect) {
            deviceTypeModel.listeners.onDisconnect(device);
          }
        }

        await disconnectDevice(device);
      } catch (error) {
        logger.error('enhancedDisconnectDevice failed:', error);
        throw error;
      }
    },
    [disconnectDevice, cleanupPeripheralMonitors]
  );

  // Function to reset scanning state - useful for device-specific hooks
  const resetScanningState = useCallback(() => {
    logger.debug('Resetting scanning state');

    // Clear any existing timeout
    if (currentScanTimeoutRef.current) {
      clearTimeout(currentScanTimeoutRef.current);
      currentScanTimeoutRef.current = null;
    }

    // Reset scanning state
    scanningInProgressRef.current = false;
    setScanningStatus('NotStarted');

    // Stop any active scan
    BLEManager.stopDeviceScan()
      .then(() => logger.debug('Stopped active scan during reset'))
      .catch((error) =>
        logger.warn('Failed to stop scan during reset:', error)
      );
  }, [setScanningStatus]);

  return (
    <BLEStateContext.Provider
      value={{
        scanningStatus,
        registerDeviceType,
        connectToDeviceById,
        endAllConnectionsByDeviceType,
        startScanForDeviceType,
        disconnectDeviceById,
        getPeripheralStateById,
        hasCharacteristicByPeripheralId,
        resetScanningState,
        // Additional utility functions
        readCharacteristicValue,
        writeCharacteristicWithResponseForDevice,
        writeToCharacteristicWithoutResponse,
        setupCharacteristicMonitor,
        discoverPeripheralServices,
        cleanupPeripheralMonitors,
        enhancedDisconnectDevice,
        getRegisteredPeripheralById,
      }}
    >
      {props.children}
    </BLEStateContext.Provider>
  );
};
