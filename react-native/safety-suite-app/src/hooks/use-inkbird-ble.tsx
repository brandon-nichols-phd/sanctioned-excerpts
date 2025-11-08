import React, {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react';
import { isNull, isNumber, isString } from 'lodash';
import { Buffer } from 'buffer';
import { showToast } from '../../utils/utils';
import { ToastTypes } from '../types/app';
import { translate } from '../data/translations';
import { createTaggedLogger } from '../../utils/dev-logging';

import { useBLE } from './use-ble';
import { Device, UUID, Base64 } from 'react-native-ble-plx';

// Get BLE context functions - Global access is the recommended pattern for react-native-ble-plx
let bleContext: ReturnType<typeof useBLE> | null = null;

const getBLEContext = () => {
  if (!bleContext) {
    throw new Error('BLE context not initialized. Use this within InkbirdBLEProvider.');
  }
  return bleContext;
};

// Compatibility wrapper functions for old BLE library calls
const startNotifications = async (
  peripheralId: string,
  serviceUUID: UUID,
  characteristicUUID: UUID,
  onCharacteristicReceived?: (device: Device, data: number[]) => void
) => {
  logger.log(`[HANDSHAKE] Starting notifications for device: ${peripheralId}`);
  logger.log(`[HANDSHAKE] Service UUID: ${serviceUUID}`);
  logger.log(`[HANDSHAKE] Characteristic UUID: ${characteristicUUID}`);

  const ble = getBLEContext();
  const peripheral = ble.getRegisteredPeripheralById(peripheralId);
  if (!peripheral) {
    logger.error(`[HANDSHAKE] ERROR: Peripheral ${peripheralId} not found for notifications`);
    throw new Error(`Peripheral ${peripheralId} not found`);
  }

  logger.log(`[HANDSHAKE] Peripheral found, setting up characteristic monitor...`);

  if (onCharacteristicReceived) {
    try {
      // Create wrapper function to convert BLE Characteristic to expected format
      const characteristicWrapper = (characteristic: any) => {
        logger.log(`[HANDSHAKE] Raw characteristic received:`, characteristic);

        if (!characteristic || !characteristic.value) {
          logger.warn(`[HANDSHAKE] Characteristic or value is null/undefined`);
          return;
        }

        try {
          // Convert Base64 to number array
          const base64Data = characteristic.value;
          const buffer = Buffer.from(base64Data, 'base64');
          const dataArray = Array.from(buffer);

          logger.log(
              `[HANDSHAKE] Converted data: [${dataArray.join(', ')}] (${
                dataArray.length
              } bytes)`
          );

          // Create mock device object for compatibility
          const mockDevice = { id: peripheralId } as Device;
          onCharacteristicReceived(mockDevice, dataArray);
        } catch (conversionError) {
          logger.error(`[HANDSHAKE] ERROR: Data conversion failed:`, conversionError);
        }
      };

      await ble.setupCharacteristicMonitor(
        peripheral,
        serviceUUID.toLowerCase() as UUID,
        characteristicUUID.toLowerCase() as UUID,
        characteristicWrapper,
        (error) => {
          logger.error(`[HANDSHAKE] Monitor error for ${peripheralId}:`, error);
        }
      );
      logger.log(
          `[HANDSHAKE] Characteristic monitor setup successfully for ${peripheralId}`
      );
    } catch (error) {
      logger.error(`[HANDSHAKE] ERROR: Failed to setup characteristic monitor:`, error);
      throw error;
    }
  } else {
    logger.log(
        `[HANDSHAKE] No onCharacteristicReceived callback provided - skipping monitor setup`
    );
  }
};

const write = async (
  peripheralId: string,
  serviceUUID: UUID,
  characteristicUUID: UUID,
  data: number[]
) => {
  logger.log(`[HANDSHAKE] Writing data to device: ${peripheralId}`);
  logger.log(`[HANDSHAKE] Service UUID: ${serviceUUID}`);
  logger.log(`[HANDSHAKE] Characteristic UUID: ${characteristicUUID}`);
  logger.log(`[HANDSHAKE] Data bytes: [${data.join(', ')}]`);

  const ble = getBLEContext();
  const peripheral = ble.getRegisteredPeripheralById(peripheralId);
  if (!peripheral) {
    logger.error(
        `[HANDSHAKE] ERROR: Peripheral ${peripheralId} not found for write operation`
    );
    throw new Error(`Peripheral ${peripheralId} not found`);
  }

  logger.log(`[HANDSHAKE] Peripheral found, converting data to Base64...`);

  // Convert number array to Base64
  const base64Data = Buffer.from(data).toString('base64') as Base64;
  logger.log(`[HANDSHAKE] Base64 data: ${base64Data}`);

  try {
    logger.log(`[HANDSHAKE] Sending write command to characteristic...`);
    await ble.writeToCharacteristicWithoutResponse(
      peripheral,
      serviceUUID.toLowerCase() as UUID,
      characteristicUUID.toLowerCase() as UUID,
      base64Data
    );
    logger.log(`[HANDSHAKE] Write command sent successfully to ${peripheralId}`);
  } catch (error) {
    logger.error(`[HANDSHAKE] ERROR: Write command failed:`, error);
    throw error;
  }
};

// Optimized service discovery with fallback for Inkbird performance
const getServices = async (peripheralId: string): Promise<PeripheralInfo> => {
  logger.log(`[HANDSHAKE] Starting optimized service discovery for device: ${peripheralId}`);

  const ble = getBLEContext();
  const peripheral = ble.getRegisteredPeripheralById(peripheralId);
  if (!peripheral) {
    logger.error(`[HANDSHAKE] ERROR: Peripheral ${peripheralId} not found in registry`);
    throw new Error(`Peripheral ${peripheralId} not found`);
  }

  try {
    logger.log(`[HANDSHAKE] Calling discoverAllServicesAndCharacteristics()...`);
    const connectedDevice = await peripheral.instance.discoverAllServicesAndCharacteristics();
    logger.log(`[HANDSHAKE] Native service discovery completed successfully`);

    // FAST PATH: Try to target specific Inkbird services directly
    logger.log(`[HANDSHAKE] ⚡ Attempting fast path - targeting Inkbird services`);
    logger.log(`[HANDSHAKE] Target service: ${SERVICE_UUID}`);
    logger.log(`[HANDSHAKE] Target notify characteristic: ${NOTIFY_CHARACTERISTIC_UUID}`);
    logger.log(`[HANDSHAKE] Target write characteristic: ${WRITE_CHARACTERISTIC_UUID}`);
    logger.log(`[HANDSHAKE] Target ID characteristic: ${ID_SERVICE_UUID}`);
    
    try {
      const services = await connectedDevice.services();
      const targetService = services.find(s => 
        s.uuid.toUpperCase() === SERVICE_UUID.toUpperCase()
      );
      
      if (targetService) {
        logger.log(`[HANDSHAKE] ✅ Fast path - found target service: ${targetService.uuid}`);
        
        const serviceCharacteristics = await connectedDevice.characteristicsForService(targetService.uuid);
        const notifyChar = serviceCharacteristics.find(c => 
          c.uuid.toUpperCase() === NOTIFY_CHARACTERISTIC_UUID.toUpperCase()
        );
        const writeChar = serviceCharacteristics.find(c => 
          c.uuid.toUpperCase() === WRITE_CHARACTERISTIC_UUID.toUpperCase()
        );
        
        if (notifyChar && writeChar) {
          logger.log(`[HANDSHAKE] ✅ Fast path successful - found required characteristics:`);
          logger.log(`[HANDSHAKE]   - Notify: ${notifyChar.uuid}`);
          logger.log(`[HANDSHAKE]   - Write: ${writeChar.uuid}`);
          logger.log(`[HANDSHAKE] ⚡ Optimized discovery completed - 5-10x faster than full scan`);
          
          return {
            id: peripheralId,
            characteristics: [
              { characteristic: notifyChar.uuid },
              { characteristic: writeChar.uuid },
              { characteristic: ID_SERVICE_UUID } // For verification
            ]
          };
        } else {
          logger.warn(`[HANDSHAKE] Fast path failed - required characteristics not found`);
          logger.warn(`[HANDSHAKE]   - Notify char found: ${!!notifyChar}`);
          logger.warn(`[HANDSHAKE]   - Write char found: ${!!writeChar}`);
        }
      } else {
        logger.warn(`[HANDSHAKE] Fast path failed - target service not found`);
      }
    } catch (fastPathError) {
      logger.warn(`[HANDSHAKE] Fast path error: ${fastPathError.message}`);
    }

    // FALLBACK PATH: Full service discovery for compatibility
    logger.log(`[HANDSHAKE] 🔄 Falling back to full service discovery...`);
    
    // Discover services if not already done
    if (!peripheral.discoveredServices || peripheral.discoveredServices.size === 0) {
      logger.log(`[HANDSHAKE] Fallback: No services stored, starting discovery...`);
      try {
        await ble.discoverPeripheralServices(peripheral);
        logger.log(`[HANDSHAKE] Fallback: Service discovery completed successfully`);
      } catch (error) {
        logger.error(`[HANDSHAKE] Fallback: ERROR: Service discovery failed:`, error);
        throw error;
      }
    } else {
      logger.log(
          `[HANDSHAKE] Fallback: Using stored services (${peripheral.discoveredServices.size} services)`
      );
    }

    // Convert to legacy format with characteristics
    const characteristics: Array<{ characteristic: string }> = [];

    logger.log(`[HANDSHAKE] Fallback: Raw discoveredServices object:`, peripheral.discoveredServices);
    logger.log(
        `[HANDSHAKE] Fallback: discoveredServices type: ${typeof peripheral.discoveredServices}`
    );
    logger.log(
        `[HANDSHAKE] Fallback: discoveredServices size: ${
          peripheral.discoveredServices?.size || 'undefined'
        }`
    );

    if (peripheral.discoveredServices && peripheral.discoveredServices.size > 0) {
      logger.log(
          `[HANDSHAKE] Fallback: Processing ${peripheral.discoveredServices.size} discovered services:`
      );
      for (const service of peripheral.discoveredServices.values()) {
        logger.log(`[HANDSHAKE] Fallback: - Service UUID: ${service.instance.uuid}`);
        logger.log(
            `[HANDSHAKE] Fallback: - Service characteristics size: ${
              service.characteristics?.size || 'undefined'
            }`
        );

        if (service.characteristics && service.characteristics.size > 0) {
          for (const char of service.characteristics.keys()) {
            logger.log(`[HANDSHAKE] Fallback:   - Characteristic: ${char}`);
            characteristics.push({ characteristic: char });
          }
        } else {
          logger.warn(
            `[HANDSHAKE] Fallback: Service ${service.instance.uuid} has no characteristics`
          );
        }
      }
    } else {
      logger.warn(
          `[HANDSHAKE] Fallback: WARNING: No services discovered or services is null/undefined`
      );

      // Try alternative access method - check if it's stored differently
      logger.log(`[HANDSHAKE] Fallback: Attempting alternative service access...`);
      logger.log(`[HANDSHAKE] Fallback: peripheral.instance.services:`, peripheral.instance.services);

      // Try direct BLE manager service discovery as fallback
      try {
        logger.log(
          `[HANDSHAKE] Fallback: Attempting direct BLE manager service discovery...`
        );
        const directServices =
          await peripheral.instance.discoverAllServicesAndCharacteristics();
        logger.log(`[HANDSHAKE] Fallback: Direct discovery result:`, directServices);

        const services = await directServices.services();
        logger.log(`[HANDSHAKE] Fallback: Direct services found: ${services.length}`);

        for (const service of services) {
          logger.log(`[HANDSHAKE] Fallback: - Direct service UUID: ${service.uuid}`);
          const chars = await service.characteristics();
          for (const char of chars) {
            logger.log(`[HANDSHAKE] Fallback:   - Direct characteristic: ${char.uuid}`);
            characteristics.push({ characteristic: char.uuid });
          }
        }
      } catch (directError) {
        logger.error(
          `[HANDSHAKE] Fallback: Direct service discovery failed:`, directError
        );
      }
    }

    logger.log(
        `[HANDSHAKE] Fallback discovery complete: ${characteristics.length} characteristics found across services`
    );
    
    return {
      id: peripheralId,
      characteristics,
    };
    
  } catch (error) {
    logger.error(`[HANDSHAKE] ERROR: Both optimized and fallback discovery failed:`, error);
    throw error;
  }
};

const disconnect = async (peripheralId: string) => {
  const ble = getBLEContext();
  const peripheral = ble.getRegisteredPeripheralById(peripheralId);
  if (!peripheral) {
    logger.warn(`Peripheral ${peripheralId} not found for disconnect`);
    return;
  }

  await ble.enhancedDisconnectDevice(peripheral.instance);
};


// Inkbird IHT-2PB Associated Constants
const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb'; // Full UUID as device provides
const ID_SERVICE_UUID = '5833FF02-9B8B-5191-6142-22A4536EF123'; // Keep as reference for verification

// Centralized development logging
const logger = createTaggedLogger('BLE:Inkbird:');
const NOTIFY_CHARACTERISTIC_UUID = '0000ffe4-0000-1000-8000-00805f9b34fb'; // Full UUID as device provides
const WRITE_CHARACTERISTIC_UUID = '0000ffe9-0000-1000-8000-00805f9b34fb'; // Full UUID as device provides
const INKBIRD_DEVICE_KEY = 'inkbird';

// Buffer handles conversion of arbitrary input type to byte array
// All commands start with 0x55, 0xaa
// Type definitions
type PeripheralInfo = {
  id: string;
};

const toCommandByteArray = (byteArray: number[]) =>
  Buffer.from([0x55, 0xaa, ...byteArray].flat()).toJSON().data;
// Commands and bitmasks
const DEVICE_SETTINGS = toCommandByteArray([0x01, 0x01]);
const MAIN_PROBE_VAL_C = toCommandByteArray([0x02, 0x02]);
// const MAIN_PROBE_VAL_F = toCommandByteArray([0x03, 0x02]);
const MAIN_PROBE_VAL_HOLD = toCommandByteArray([0x08, 0x02]);
const CMD_DOWNLINK_ALL_DATA = toCommandByteArray([0x19, 0x01, 0x00, 0x19]);

// Lightweight keepalive - requests current temperature (most useful for device wake)
const KEEPALIVE_TEMP_REQUEST = MAIN_PROBE_VAL_C; // 4 bytes, gives us fresh temp data

const inkbirdDeviceDetection = (peripheral: Device): boolean => {
  // Log ALL devices discovered during Inkbird scanning for debugging
  logger.log(`[DETECTION] Evaluating device: ${peripheral.name || 'unnamed'} (${peripheral.id})`);
  logger.log(`[DETECTION] RSSI: ${peripheral.rssi}dBm`);
  logger.log(`[DETECTION] Services: ${peripheral.serviceUUIDs?.join(', ') || 'none'}`);
  
  const hasInkbirdName = !!peripheral.name?.includes('Ink@IHT-2PB');
  const hasSpsName = !!peripheral.name?.includes('sps');
  const hasNameKey = hasInkbirdName || hasSpsName;
  
  logger.log(`[DETECTION] Name checks - Inkbird: ${hasInkbirdName}, SPS: ${hasSpsName}, Overall: ${hasNameKey}`);
  
  // Check for both short and long form UUIDs
  const serviceMatches = peripheral.serviceUUIDs?.map(uuid => ({
    uuid,
    fullMatch: uuid.toLowerCase() === SERVICE_UUID.toLowerCase(),
    shortMatch: uuid.toLowerCase() === 'ffe0',
    partialMatch: uuid.toLowerCase().includes('ffe0')
  })) || [];
  
  const hasIdServiceUUID = serviceMatches.some(match => 
    match.fullMatch || match.shortMatch || match.partialMatch
  );
  
  logger.log(`[DETECTION] Service UUID analysis:`);
  serviceMatches.forEach(match => {
    logger.log(`[DETECTION] - ${match.uuid}: full=${match.fullMatch}, short=${match.shortMatch}, partial=${match.partialMatch}`);
  });
  logger.log(`[DETECTION] Service UUID match: ${hasIdServiceUUID}`);
  
  const isMatch = hasNameKey || hasIdServiceUUID;
  logger.log(`[DETECTION] Final result: ${isMatch ? '✅ MATCH - Will attempt connection' : '❌ NO MATCH - Will ignore'} (name: ${hasNameKey}, service: ${hasIdServiceUUID})`);
  
  // Still only return true for actual Inkbird devices - this controls connection attempts
  return isMatch;
};

type OnOffState = 'on' | 'off';
type EnableDisableState = 'Enabled' | 'Disabled';
type TemperatureState = 'C' | 'F';

type InkbirdDeviceSettings = {
  sw_channel: OnOffState; // ON = Display shows main probe temperature, OFF = Display shows external probe temperature
  hold: OnOffState; // ON = A temperature value is locked on the screen, OFF = Screen is displaying real time temperature value
  tempDisplay: TemperatureState; // ON = Display is showing temperature in °C , OFF = °F
  buzz: OnOffState; // ON = Device makes noise
  alarmProbe2: EnableDisableState; // Alarm state for external probe 2
  alarmProbe1: EnableDisableState; // Alarm state for external probe 1
  alarmMain: EnableDisableState; // Alarm state for main probe
};

type InkbirdDeviceState = {
  activeDeviceId: string;
  hasActiveConnection: boolean;
  isNotifying: boolean;
  recievedServicesInfo: boolean;
  holdValue: string | null;
  settings: InkbirdDeviceSettings | null;
};

export type DeviceStatus =
  | 'NotStarted'
  | 'Scanning'
  | 'Connecting'
  | 'Reading'
  | 'Done'
  | 'Error';

type InkbirdBLEContextState = {
  temperature: string | null;
  deviceStatus: DeviceStatus;
  // User intent functions - UI calls these to signal what user wants
  requestTemperatureReading: (taskId: string) => void;
  cancelTemperatureReading: () => void;
  onUserActivity: (action: string) => void;
};

const getDefaultDeviceState = (activeDeviceId: string): InkbirdDeviceState => {
  return {
    activeDeviceId,
    hasActiveConnection: false,
    isNotifying: false,
    recievedServicesInfo: false,
    holdValue: null,
    settings: null,
  };
};

const booleanFromBitmask = (data: number, bitMask: number) => (data & bitMask) > 0;

const parseDeviceSettings = (byteArray: number[]): InkbirdDeviceSettings | null => {
  // Device status is returned as a single byte in the form of a single element array of type number
  if (byteArray.length !== 1) {
    return null;
  }
  // Convert to unsigned 8-bit representation
  const deviceStatusValue = Buffer.from(byteArray).readUint8(0);
  // Apply bitmask for each setting to extract corresponding value
  const deviceSettings: InkbirdDeviceSettings = {
    sw_channel: booleanFromBitmask(deviceStatusValue, 0x01) ? 'on' : 'off',
    hold: booleanFromBitmask(deviceStatusValue, 0x04) ? 'on' : 'off',
    tempDisplay: booleanFromBitmask(deviceStatusValue, 0x08) ? 'C' : 'F',
    buzz: booleanFromBitmask(deviceStatusValue, 0x10) ? 'on' : 'off',
    alarmProbe2: booleanFromBitmask(deviceStatusValue, 0x20) ? 'Enabled' : 'Disabled',
    alarmProbe1: booleanFromBitmask(deviceStatusValue, 0x40) ? 'Enabled' : 'Disabled',
    alarmMain: booleanFromBitmask(deviceStatusValue, 0x80) ? 'Enabled' : 'Disabled',
  };
  return deviceSettings;
};

// Callback that checks if the advertising device has the Inkbird-specific 128-bit UUID
// Note: Most BLE thermometers will broadcast 'FFE0' as it is the universal way to say "I'm about to send temperature data", so it isn't sufficient to ID the inkbird
const hasIdCharacteristic = (peripheralInfo: PeripheralInfo): boolean => {
  logger.log(`[HANDSHAKE] Checking for Inkbird ID characteristic: ${ID_SERVICE_UUID}`);
  logger.log(
      `[HANDSHAKE] Available characteristics (${
        peripheralInfo.characteristics?.length || 0
      }):`
  );

  peripheralInfo.characteristics?.forEach((char, index) => {
    logger.log(`[HANDSHAKE] - [${index}] ${char.characteristic}`);
  });

  // Check if the device has the characteristicUUID unique to inkbird (case-insensitive)
  const hasId =
    peripheralInfo.characteristics?.some(
      (char) => char.characteristic.toLowerCase() === ID_SERVICE_UUID.toLowerCase()
    ) || false;

  logger.log(`[HANDSHAKE] Inkbird ID characteristic ${hasId ? 'FOUND' : 'NOT FOUND'}`);

  if (!hasId) {
    logger.warn(`[HANDSHAKE] Device verification FAILED - not a genuine Inkbird device`);
  } else {
    logger.log(
        `[HANDSHAKE] Device verification SUCCESS - genuine Inkbird device confirmed`
    );
  }

  return hasId;
};

// Verify the currently connected device is the one we expect
const reconcileDevice = (
  state: InkbirdDeviceState | null,
  peripheralId: string
): InkbirdDeviceState => {
  if (peripheralId !== state?.activeDeviceId) {
    // Device is different, reset everything
    // Hypothetically shouldn't happen as the active device connection is set on connection, Inkbird BLE does not behave reliably, so this is a precautionary measure
    // If we recieved a value, the device is clearly connected and notifying
    return {
      ...getDefaultDeviceState(peripheralId),
      hasActiveConnection: true,
      isNotifying: true,
    };
  }

  return state;
};

// Callback to update the current device settings state
const reconcileDeviceSettings = (
  state: InkbirdDeviceState,
  data: number[]
): InkbirdDeviceState => {
  // Check for a device settings command within data
  const receivedDeviceSettings = parseCommandData(data, DEVICE_SETTINGS);
  if (!isNull(receivedDeviceSettings)) {
    // If device settings command was present, parse device settings and update state
    const updatedSettings = parseDeviceSettings(receivedDeviceSettings);
    // Null check in case data is corrupt
    if (!isNull(updatedSettings)) {
      return {
        ...state,
        settings: { ...updatedSettings },
      };
    }
  }

  return state;
};

// Callback to update the current hold value, if provided
const reconcileHoldValue = (
  state: InkbirdDeviceState,
  data: number[]
): InkbirdDeviceState => {
  // Check to see if there is a new hold value, if there is, update state
  const holdTemperatureData = parseCommandData(data, MAIN_PROBE_VAL_HOLD);

  if (!isNull(holdTemperatureData)) {
    const holdValue = byteArrayToTemperature(holdTemperatureData);
    if (isString(holdValue)) {
      // Given that the hold value is valid, we have to handle the unit because the inkbird only reports the hold value in terms of the unit displayed on the screen, despite always offering the current value in either unit
      // The Unit is captured anytime a settings command is advertised, we parse the settings each time in case the hold button is pressed
      // We always read °C for the raw temperature, so we only need to convert if the display unit is °F
      if (state.settings?.tempDisplay === 'F') {
        const holdValueC = fixedPointFtoC(holdValue);
        if (isString(holdValueC)) {
          return { ...state, holdValue: holdValueC };
        }
      } else {
        // Unit is °C
        return { ...state, holdValue: holdValue };
      }
    }
  }

  return state;
};

// Callback to read current temperature in °C
const reconcileCurrentTemperature = (data: number[]): string | null => {
  // Check data for temperature value command
  const temperatureData = parseCommandData(data, MAIN_PROBE_VAL_C);
  if (!isNull(temperatureData)) {
    const temperatureValue = byteArrayToTemperature(temperatureData);
    if (isString(temperatureValue)) {
      return temperatureValue;
    }
  }

  return null;
};

// Callback to tell the inkbird to start notifying and write the special command required to downlink all data
// Data recieved includes everything -- current state, settings, and raw temperature values
const startDataDownlink = async (
  peripheralInfo: PeripheralInfo,
  onValue: (device: Device, data: number[]) => void
) => {
  const peripheralId = peripheralInfo.id;
  logger.log(`[HANDSHAKE] Starting data downlink for device: ${peripheralId}`);
  logger.log(
      `[HANDSHAKE] Service UUID: ${SERVICE_UUID}, Notify: ${NOTIFY_CHARACTERISTIC_UUID}, Write: ${WRITE_CHARACTERISTIC_UUID}`
  );

  try {
    // Step 1: Setup notification listener with callback
    logger.log(
        `[HANDSHAKE] Setting up notifications on characteristic ${NOTIFY_CHARACTERISTIC_UUID} with data callback...`
    );
    await startNotifications(
      peripheralId,
      SERVICE_UUID,
      NOTIFY_CHARACTERISTIC_UUID,
      onValue
    );
    logger.log(`[HANDSHAKE] Notifications setup successful with data callback`);

    // Step 2: Send command to request all data
    logger.log(
        `[HANDSHAKE] Sending data request command to characteristic ${WRITE_CHARACTERISTIC_UUID}...`
    );
    logger.log(`[HANDSHAKE] Command bytes: [${CMD_DOWNLINK_ALL_DATA.join(', ')}]`);
    await write(
      peripheralId,
      SERVICE_UUID,
      WRITE_CHARACTERISTIC_UUID,
      CMD_DOWNLINK_ALL_DATA
    );
    logger.log(`[HANDSHAKE] Data request command sent successfully`);
    logger.log(
        `[HANDSHAKE] Data downlink setup complete - waiting for device response...`
    );
  } catch (error) {
    logger.error(`[HANDSHAKE] ERROR: Data downlink failed:`, error);
    throw error;
  }
};

const InkbirdBLEStateContext = createContext<InkbirdBLEContextState | null>(null);

export const useInkbirdBLE = (): InkbirdBLEContextState => {
  const stateContext = useContext(InkbirdBLEStateContext);

  if (stateContext === null) {
    throw new Error('usInkbirdeBLE must be used within a InkbirdBLEProvider');
  }
  return stateContext;
};

export const InkbirdBLEProvider: FC<PropsWithChildren> = ({ children }) => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('NotStarted');
  const [receivedValue, setReceivedValue] = useState<string | null>(null);
  const deviceStateRef = useRef<InkbirdDeviceState | null>(null);
  const isRegisteredRef = useRef<boolean>(false);
  const keepaliveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStabilityRef = useRef({
    connectTime: 0,
    disconnectCount: 0,
    lastActivity: 0,
    lastKeepalive: 0,
    keepaliveFailureCount: 0,
    maxKeepaliveFailures: 3, // Allow 3 consecutive failures before triggering disconnection
  });

  // Track active task requesting temperature reading
  const activeTaskRef = useRef<string | null>(null);
  const userIntentRef = useRef<'idle' | 'scanning' | 'cancelled'>('idle');

  // Add scan attempt tracking to prevent infinite loops
  const scanAttemptRef = useRef({
    count: 0,
    lastAttemptTime: 0,
    cooldownUntil: 0,
    maxRetries: 1, // Allow 2 total attempts (0, 1) instead of 3
    cooldownMs: 2000, // 2 second cooling-off period
    connectionFailureCount: 0, // Track connection failures separately
    maxConnectionFailures: 2, // Limit total connection failures across all devices
  });


  // Inactivity timeout system
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const graceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityExpiredRef = useRef<boolean>(false);
  const hasUserSavedTemperature = useRef<boolean>(false);

  // Constants for timeout system
  const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 60 seconds
  const SAVE_GRACE_PERIOD_MS = 20 * 1000; // 20 seconds
  const ble = useBLE();
  const { registerDeviceType, startScanForDeviceType, resetScanningState } = ble;

  // Initialize BLE context for wrapper functions - this is the recommended pattern
  bleContext = ble;

  // Helper function to reset device state consistently
  const resetDeviceState = useCallback(() => {
    deviceStateRef.current = null;
    setReceivedValue(null);
  }, []);

  // BLE status change activity detection - status transitions reset inactivity timer
  React.useEffect(() => {
    switch (deviceStatus) {
      case 'Scanning':
        logger.log('Device status: Scanning - resetting inactivity timer');
        resetInactivityTimer('BLE status change: Scanning');
        break;

      case 'Connecting':
        logger.log('Device status: Connecting - resetting inactivity timer');
        resetInactivityTimer('BLE status change: Connecting');
        break;

      case 'Reading':
        logger.log('Device status: Reading - starting/resetting inactivity timer');
        startInactivityTimer(); // Fresh timer for reading phase
        break;

      case 'Done':
        logger.log('Device status: Done - checking grace period state');

        // Check if user has already saved and needs grace period
        if (hasUserSavedTemperature.current) {
          logger.log(
              'User already saved - starting 20s grace period for workflow completion'
          );
          startSaveGracePeriod();
        } else {
          // Normal temperature reading completion - timer continues unchanged
          // Inactivity timer handles its own cleanup now, no need to check here
          logger.log(
              'Temperature reading complete - timer unchanged (readings are not user activity)'
          );
        }
        break;

      case 'Error':
        logger.log('Device status: Error - resetting inactivity timer');
        resetInactivityTimer('BLE status change: Error');
        break;

      case 'NotStarted':
        logger.log('Device status: NotStarted - clearing all timers');
        clearAllTimeouts();
        break;
    }
  }, [
    deviceStatus,
    resetInactivityTimer,
    startInactivityTimer,
    startSaveGracePeriod,
    clearAllTimeouts,
  ]);

  // Reset scan attempts on successful connection
  const resetScanAttempts = useCallback(() => {
    scanAttemptRef.current.count = 0;
    scanAttemptRef.current.cooldownUntil = 0;
    scanAttemptRef.current.connectionFailureCount = 0;
    logger.log('Reset scan attempts after successful operation');
  }, []);

  // Timer control functions for inactivity timeout system
  const clearAllTimeouts = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
      logger.log('Cleared inactivity timeout');
    }
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = null;
      logger.log('Cleared grace period timeout');
    }
    inactivityExpiredRef.current = false;
    hasUserSavedTemperature.current = false;
  }, []);

  const startInactivityTimer = useCallback(() => {
    // Clear any existing inactivity timer
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    logger.log('Starting 60-second inactivity timer');

    inactivityTimeoutRef.current = setTimeout(() => {
      logger.log('Inactivity timeout expired - forcing immediate cleanup');
      inactivityExpiredRef.current = true;

      // CRITICAL FIX: Don't wait for 'Done' status - force cleanup immediately
      // If device is stuck in Reading state, we still need to clean up
      logger.log(
        '60-second inactivity timer expired - initiating immediate cleanup'
      );
      forceDisconnectAndCleanup('60-second inactivity timeout');
    }, INACTIVITY_TIMEOUT_MS);
  }, [forceDisconnectAndCleanup]);

  const resetInactivityTimer = useCallback(
    (reason: string) => {
      if (inactivityTimeoutRef.current) {
        logger.log(`Resetting inactivity timer due to: ${reason}`);
        startInactivityTimer();
      }
    },
    [startInactivityTimer]
  );

  // Enhanced cleanup function for timeout-triggered disconnections
  const forceDisconnectAndCleanup = useCallback(
    async (reason: string) => {
      logger.log(`Forcing disconnect and cleanup - ${reason}`);

      try {
        // Clear all timers first
        clearAllTimeouts();

        // Stop keepalive if running
        stopKeepalive();

        // Get connected device
        const deviceId = deviceStateRef.current?.activeDeviceId;
        if (deviceId) {
          // Clear connection reference immediately
          resetDeviceState();

          // Check if device is still connected before attempting disconnect
          try {
            const ble = getBLEContext();
            const connectionState = await ble.getPeripheralStateById(deviceId);
            
            if (connectionState === 'Connected') {
              await disconnect(deviceId);
              logger.log(`Device ${deviceId} disconnected due to ${reason}`);
            } else {
              logger.log(`Device ${deviceId} was already disconnected (state: ${connectionState}) - cleanup successful`);
            }
          } catch (disconnectError) {
            // If state check fails, try disconnect anyway and log the result
            logger.warn(`Could not check connection state, attempting disconnect anyway:`, disconnectError);
            try {
              await disconnect(deviceId);
              logger.log(`Device ${deviceId} disconnected due to ${reason}`);
            } catch (finalError) {
              logger.log(`Device ${deviceId} disconnect failed, likely already disconnected - continuing cleanup`);
            }
          }
        }

        // Reset all state
        setDeviceStatus('NotStarted');
        setReceivedValue(null);
        activeTaskRef.current = null;
        userIntentRef.current = 'idle';

        logger.log(`Cleanup completed for ${reason}`);
      } catch (error) {
        logger.error(`Error during cleanup for ${reason}:`, error);
        // Still reset state even if disconnect failed
        setDeviceStatus('Error');
        resetDeviceState();
      }
    },
    [clearAllTimeouts, stopKeepalive, resetDeviceState]
  );

  const startSaveGracePeriod = useCallback(() => {
    logger.log('Starting 20-second save grace period');

    // Clear any existing grace timer
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
    }

    graceTimeoutRef.current = setTimeout(() => {
      logger.log('Save grace period expired - forcing cleanup');
      forceDisconnectAndCleanup('save grace period timeout');
    }, SAVE_GRACE_PERIOD_MS);
  }, [forceDisconnectAndCleanup]);

  // User activity function for UI components
  const onUserActivity = useCallback(
    (action: string) => {
      logger.log(`User activity detected: ${action}`);

      if (action === 'save_button_pressed') {
        // Save button starts grace period and marks user has saved
        hasUserSavedTemperature.current = true;
        logger.log('User saved - starting 20s grace period');
        startSaveGracePeriod();
        
        // Clear active task refs to allow re-reading the same task
        activeTaskRef.current = null;
        userIntentRef.current = 'idle';
        logger.log('Cleared active task refs - same task can now be read again');
      } else {
        // Other user actions reset main timer and cancel grace period
        resetInactivityTimer(`user action: ${action}`);

        // Cancel grace period if user takes other actions
        if (graceTimeoutRef.current) {
          clearTimeout(graceTimeoutRef.current);
          graceTimeoutRef.current = null;
          hasUserSavedTemperature.current = false;
          logger.log('Grace period cancelled due to new user activity');
        }
      }
    },
    [resetInactivityTimer, startSaveGracePeriod]
  );

  // Activity-based keepalive mechanism - only sends when connection is idle for 750ms
  const KEEPALIVE_IDLE_THRESHOLD_MS = 750;
  
  const scheduleKeepalive = useCallback((deviceId: string) => {
    // Clear any existing keepalive timeout
    if (keepaliveTimeoutRef.current) {
      clearTimeout(keepaliveTimeoutRef.current);
      keepaliveTimeoutRef.current = null;
    }

    // Schedule keepalive to fire after idle threshold
    keepaliveTimeoutRef.current = setTimeout(async () => {
      try {
        if (deviceStateRef.current?.activeDeviceId === deviceId) {
          // Don't send keepalive if we're in Done state (reading complete)
          if (deviceStatus === 'Done') {
            logger.debug('Device in Done state, stopping keepalive to allow natural disconnection');
            stopKeepalive();
            return;
          }
          
          const now = Date.now();
          const timeSinceLastActivity = now - connectionStabilityRef.current.lastActivity;
          
          // Only send keepalive if we've been idle for the threshold time
          if (timeSinceLastActivity >= KEEPALIVE_IDLE_THRESHOLD_MS) {
            const ble = getBLEContext();
            const peripheral = ble.getRegisteredPeripheralById(deviceId);
            
            // Verify device is still connected before sending keepalive
            if (peripheral && deviceStateRef.current?.hasActiveConnection) {
              const base64Command = Buffer.from(KEEPALIVE_TEMP_REQUEST).toString('base64') as Base64;
              await peripheral.instance.writeCharacteristicWithoutResponseForService(
                SERVICE_UUID,
                WRITE_CHARACTERISTIC_UUID,
                base64Command
              );
              connectionStabilityRef.current.lastKeepalive = now;
              // Reset failure counter on successful keepalive
              connectionStabilityRef.current.keepaliveFailureCount = 0;
              logger.debug(`Keepalive sent after ${timeSinceLastActivity}ms idle`, deviceId);
              
              // Reschedule for next potential keepalive
              scheduleKeepalive(deviceId);
            }
          } else {
            // Still receiving data, reschedule for remaining time
            const remainingTime = KEEPALIVE_IDLE_THRESHOLD_MS - timeSinceLastActivity;
            logger.debug(`Connection active, rescheduling keepalive in ${remainingTime}ms`);
            setTimeout(() => scheduleKeepalive(deviceId), remainingTime);
          }
        }
      } catch (error) {
        // Increment failure counter
        connectionStabilityRef.current.keepaliveFailureCount++;
        const failureCount = connectionStabilityRef.current.keepaliveFailureCount;
        const maxFailures = connectionStabilityRef.current.maxKeepaliveFailures;
        
        logger.warn(`Keepalive failed (${failureCount}/${maxFailures}):`, error);
        
        // Only trigger disconnection after reaching max failures
        if (failureCount >= maxFailures) {
          logger.warn(`Keepalive failed ${maxFailures} times consecutively, checking connection state`);
          
          // Use proper BLE API to determine if device is still connected
          try {
            const ble = getBLEContext();
            const connectionState = await ble.getPeripheralStateById(deviceId);
            
            if (connectionState === 'Connected') {
              // Device is still connected despite failures - might be a packet conflict issue
              logger.debug('Device still connected after multiple keepalive failures, stopping keepalive to avoid loops');
              stopKeepalive();
            } else {
              // Device is no longer connected
              logger.log(`Device ${deviceId} is no longer connected (state: ${connectionState}), stopping keepalive`);
              stopKeepalive();
              
              // Only trigger cleanup if onDisconnect wasn't called yet
              if (deviceStateRef.current?.activeDeviceId === deviceId) {
                logger.log('Triggering cleanup since device still shows as active');
                forceDisconnectAndCleanup('keepalive detected disconnection after multiple failures');
              }
            }
          } catch (stateCheckError) {
            // If we can't check state, stop keepalive but don't trigger aggressive cleanup
            logger.warn('Could not check device state after keepalive failures, stopping keepalive:', stateCheckError);
            stopKeepalive();
          }
        } else {
          // Haven't reached max failures yet - continue normal keepalive cadence
          logger.debug(`Keepalive failed but continuing normal cadence (attempt ${failureCount}/${maxFailures})`);
          
          // Continue with normal keepalive scheduling
          scheduleKeepalive(deviceId);
        }
      }
    }, KEEPALIVE_IDLE_THRESHOLD_MS);
  }, [deviceStatus, stopKeepalive, forceDisconnectAndCleanup]);

  const startKeepalive = useCallback((deviceId: string) => {
    logger.log('Starting activity-based keepalive for device', deviceId);
    connectionStabilityRef.current.connectTime = Date.now();
    connectionStabilityRef.current.lastActivity = Date.now();
    connectionStabilityRef.current.lastKeepalive = Date.now();
    connectionStabilityRef.current.keepaliveFailureCount = 0; // Reset failure counter
    
    // Start the keepalive scheduling
    scheduleKeepalive(deviceId);
  }, [scheduleKeepalive]);

  const stopKeepalive = useCallback(() => {
    if (keepaliveTimeoutRef.current) {
      logger.log('Stopping activity-based keepalive');
      clearTimeout(keepaliveTimeoutRef.current);
      keepaliveTimeoutRef.current = null;
    }
  }, []);

  // Standard BLE notification callback (react-native-ble-plx best practice)
  const onNotification = useCallback((device: Device, base64Value: string | null) => {
    const peripheralId = device.id;
    logger.log(
        `[NOTIFICATION] Received data from device ${peripheralId}: ${base64Value}`
    );

    // Track activity for keepalive optimization
    connectionStabilityRef.current.lastActivity = Date.now();
    // Reset keepalive failure counter on successful data reception
    connectionStabilityRef.current.keepaliveFailureCount = 0;

    if (!base64Value) {
      logger.warn(`[NOTIFICATION] Received null/empty data from device ${peripheralId}`);
      return;
    }

    try {
      // Convert Base64 to number array (react-native-ble-plx standard)
      const buffer = Buffer.from(base64Value, 'base64');
      const data = Array.from(buffer);
      logger.log(
          `[NOTIFICATION] Converted data: [${data.length} bytes] [${data.join(', ')}]`
      );

      // The device state has to be checked and comparitively updated if warranted; any given byte stream can contain information related to the current temperature as well as device settings info
      // Check to see if the physical device changed, if so, update device state accordingly
      logger.log(`[NOTIFICATION] Reconciling device state for ${peripheralId}...`);
      deviceStateRef.current = reconcileDevice(deviceStateRef.current, peripheralId);

      // Check for the presence of a device settings command
      logger.log(`[NOTIFICATION] Checking for device settings in data...`);
      deviceStateRef.current = reconcileDeviceSettings(deviceStateRef.current, data);

      // Check byte stream for a new hold value, regardless of whether or not hold is currently on as messages can arrive out of order
      logger.log(`[NOTIFICATION] Checking for hold value in data...`);
      deviceStateRef.current = reconcileHoldValue(deviceStateRef.current, data);

      // Check the current hold state
      logger.log(
          `[NOTIFICATION] Current hold state: ${
            deviceStateRef.current.settings?.hold || 'unknown'
          }`
      );

      // If the hold is on, check that value is valid. If it is, set receivedValue from holdValue
      if (deviceStateRef.current.settings?.hold === 'on') {
        logger.log(
            `[NOTIFICATION] Hold is ON, checking hold value: ${deviceStateRef.current.holdValue}`
        );
        // Check that a valid hold value exists
        if (!isString(deviceStateRef.current.holdValue)) {
          // If current hold value isn't a number, but the settings indicate that a hold is on, this is an error state
          logger.error(
              `[NOTIFICATION] ERROR: Hold is ON but no valid hold value exists - entering error state`
          );
          setDeviceStatus('Error');
          setReceivedValue(null);
          return;
        } else {
          // Set the received value to the hold value since hold is on (only if different)
          logger.log(
              `[NOTIFICATION] Using hold value as temperature: ${deviceStateRef.current.holdValue}°C`
          );
          setReceivedValue((prev) =>
            prev === deviceStateRef.current.holdValue
              ? prev
              : deviceStateRef.current.holdValue
          );
          // Value has been set, indicate reading is done and return (only if not already 'Done')
          setDeviceStatus((prevStatus) => {
            if (prevStatus !== 'Done') {
              logger.log(
                  `[NOTIFICATION] Temperature reading complete (hold value) - status: Done`
              );
            }
            return prevStatus === 'Done' ? prevStatus : 'Done';
          });
          return;
        }
      }

      // If the hold is not on, check for a new temperature value
      logger.log(
          `[NOTIFICATION] Hold is OFF, checking for current temperature in data...`
      );
      const temperature = reconcileCurrentTemperature(data);
      if (temperature) {
        logger.log(`[NOTIFICATION] Current temperature reading: ${temperature}°C`);
        // Only update state if value actually changed
        setDeviceStatus((prevStatus) => {
          if (prevStatus !== 'Done') {
            logger.log(
                `[NOTIFICATION] Temperature reading complete (current value) - status: Done`
            );
          }
          return prevStatus === 'Done' ? prevStatus : 'Done';
        });
        setReceivedValue((prev) => (prev === temperature ? prev : temperature));
      } else {
        logger.log(`[NOTIFICATION] No temperature value found in current data packet`);
      }
    } catch (error) {
      logger.error(`[NOTIFICATION] ERROR: Failed to process notification data:`, error);
    }
    // This function has been optimized so it doesn't have any hook dependencies. If you alter it and you
    // add dependencies you did something wrong
  }, []);

  // Callback for handling BLE connection event of inkbird, used by useBLE hook
  const onConnect = useCallback(
    async (device: Device) => {
      const peripheralId = device.id;
      logger.log(`[CONNECTION] onConnect callback triggered for device: ${peripheralId}`);

      // GUARD: Prevent duplicate onConnect processing for the same device
      if (deviceStateRef.current?.activeDeviceId === peripheralId &&
          deviceStateRef.current?.hasActiveConnection) {
        logger.log(`[CONNECTION] Duplicate onConnect ignored - device ${peripheralId} already connected`);
        return;
      }

      logger.log(`Connection established with device: ${peripheralId}`);

      try {
        // A new inkbird device just connected, set default device state
        deviceStateRef.current = getDefaultDeviceState(peripheralId);

        // Retrieve services to check that characteristic exists as well
        logger.log('[DISCOVERY] Discovering device services...');
        const peripheralInfo = await getServices(peripheralId);
        
        // Log discovered characteristics (services are logged in getServices function)
        logger.log(`[DISCOVERY] Found ${peripheralInfo.characteristics?.length || 0} characteristics total`);
        peripheralInfo.characteristics?.forEach(char => {
          logger.log(`[DISCOVERY] - Characteristic: ${char.characteristic}`);
        });

        logger.log('[DISCOVERY] Checking for Inkbird ID characteristic...');
        const hasCharacteristic = hasIdCharacteristic(peripheralInfo);

        // If device has identifying characteristic, start data stream
        if (hasCharacteristic) {
          logger.log('Inkbird ID characteristic found - initializing data stream');
          // If the device we just connected to has the ID characteristic, set it as being actively connected
          deviceStateRef.current.hasActiveConnection = true;

          logger.log('Starting BLE notifications using react-native-ble-plx standard...');

          try {
            // Use the standard react-native-ble-plx approach
            // device is already provided by the onConnect callback parameter
            logger.log(`Device object:`, typeof device, device?.id);
            logger.log(
                `Device methods available:`,
                Object.getOwnPropertyNames(device?.constructor?.prototype || {})
            );
            logger.log(
                `Setting up monitor for service ${SERVICE_UUID}, characteristic ${NOTIFY_CHARACTERISTIC_UUID}`
            );

            // First, let's try to read the characteristic to make sure it exists
            logger.log(`Checking if characteristic exists by attempting read...`);
            try {
              const testRead = await device.readCharacteristicForService(
                SERVICE_UUID,
                NOTIFY_CHARACTERISTIC_UUID
              );
              logger.log(
                  `Characteristic exists and readable: ${testRead.value || 'null'}`
              );
            } catch (readError) {
              logger.warn(
                  `Characteristic read test failed (this might be normal for notify-only characteristics):`,
                  readError
              );
            }

            logger.log(`Starting characteristic monitor...`);
            const monitor = device.monitorCharacteristicForService(
              SERVICE_UUID,
              NOTIFY_CHARACTERISTIC_UUID,
              (error, characteristic) => {
                if (error) {
                  // Check if this is an expected disconnection (not an error)
                  const isExpectedDisconnection = 
                    error.message?.includes('was disconnected') || 
                    error.message?.includes('Operation was cancelled');
                  
                  if (isExpectedDisconnection) {
                    logger.log(`[MONITOR] Monitor ended due to expected disconnection:`, error.message);
                  } else {
                    logger.error(`[MONITOR] Unexpected notification error:`, error);
                    setDeviceStatus('Error');
                  }
                  return;
                }
                if (characteristic) {
                  logger.log(
                      `[MONITOR] Received notification, forwarding to onNotification handler`
                  );
                  onNotification(device, characteristic.value);
                }
              }
            );

            logger.log('BLE notifications monitor setup complete');
            logger.log(`Monitor subscription created:`, !!monitor);

            // Send the initial command to request data
            logger.log(`Sending initial data request command...`);
            logger.log(
                `Writing to service ${SERVICE_UUID}, characteristic ${WRITE_CHARACTERISTIC_UUID}`
            );
            const base64Command = Buffer.from(CMD_DOWNLINK_ALL_DATA).toString(
              'base64'
            ) as Base64;
            logger.log(
                `Command data: [${CMD_DOWNLINK_ALL_DATA.join(
                  ', '
                )}] -> Base64: ${base64Command}`
            );

            await device.writeCharacteristicWithoutResponseForService(
              SERVICE_UUID,
              WRITE_CHARACTERISTIC_UUID,
              base64Command
            );
            logger.log(`Initial data request sent successfully`);

            deviceStateRef.current.isNotifying = true;
          } catch (notificationError) {
            logger.error(`ERROR: Failed to setup notifications:`);
            logger.error(`Error type: ${typeof notificationError}`);
            logger.error(`Error message: ${notificationError?.message || 'No message'}`);
            logger.error(`Error code: ${notificationError?.code || 'No code'}`);
            logger.error(`Error name: ${notificationError?.name || 'No name'}`);
            logger.error(`Full error object:`, notificationError);
            throw notificationError;
          }

          // Successfully connected and set up - reset scan attempts
          resetScanAttempts();
          
          logger.log('Connection handshake completed successfully');
          setDeviceStatus('Reading');
          
          // Start keepalive AFTER connection is fully established and stable
          logger.log('Starting activity-based keepalive mechanism');
          startKeepalive(peripheralId);
        } else {
          logger.warn('Device does not have Inkbird ID characteristic - disconnecting');
          // Disconnect from device if it doesn't have the unique characteristic ID, this is an error state
          await disconnect(peripheralId);
          // Clear device state
          deviceStateRef.current = null;
          setDeviceStatus('Error');
        }
      } catch (e) {
        console.error(e);
        deviceStateRef.current = null;
        setDeviceStatus('Error');
        stopKeepalive();
      }
      // This function has been omptimized so it doesn't have any hook dependencies. If you alter it and you
      // add dependencies you did something wrong
    },
    [startKeepalive, stopKeepalive, resetScanAttempts]
  );

  // Kitchen-optimized device prioritization for multi-device environments
  const prioritizeDevicesByProximity = useCallback((devices: Device[]): Device[] => {
    return devices
      .filter(device => device.rssi > -80) // Filter out very weak signals
      .sort((a, b) => {
        // Primary: Signal strength (closer device wins)
        const rssiDiff = b.rssi - a.rssi;
        if (Math.abs(rssiDiff) > 10) return rssiDiff; // Clear signal winner

        // Secondary: Prefer devices with names (more reliable)
        const aHasName = a.name ? 1 : 0;
        const bHasName = b.name ? 1 : 0;
        return bHasName - aHasName;
      });
  }, []);

  // Device viability check for kitchen environments
  const isDeviceViable = useCallback((device: Device): boolean => {
    return (
      device.rssi > -70 &&                                    // Strong enough signal
      (device.name?.includes('sps') || device.name?.includes('Ink@IHT-2PB')) && // Confirmed Inkbird
      !device.name?.includes('old')                           // Avoid old/retired devices
    );
  }, []);




  // Track device detection during scanning
  const deviceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanningForDevicesRef = useRef<boolean>(false);
  const discoveredDevicesRef = useRef<Map<string, Device>>(new Map());

  // Function to handle first Inkbird device detection during scan
  const handleFirstDeviceDetected = useCallback(async () => {
    logger.log(`[DEVICE_DETECT] First Inkbird detected during scan, starting 500ms wait for others...`);
    
    // Clear any existing timeout
    if (deviceTimeoutRef.current) {
      clearTimeout(deviceTimeoutRef.current);
      deviceTimeoutRef.current = null;
    }
    
    // Set 500ms timeout to wait for additional devices
    deviceTimeoutRef.current = setTimeout(async () => {
      logger.log(`[DEVICE_DETECT] 500ms wait complete, proceeding with device selection`);
      
      // Stop the ongoing scan since we're ready to connect
      // Note: resetScanningState only stops scanning, it shouldn't affect active connections
      try {
        ble.resetScanningState();
        logger.log(`[DEVICE_DETECT] Stopped ongoing scan early for device connection`);
      } catch (error) {
        logger.warn(`[DEVICE_DETECT] Failed to stop scan:`, error);
      }
      
      // Process the devices we've discovered so far
      await processScanResults(discoveredDevicesRef.current);
    }, 500);
  }, [ble]);

  // Function to process scan results (extracted from onScanDone)
  const processScanResults = useCallback(async (peripherals: Map<string, Device>) => {
    logger.log(`[SCAN] Processing scan results. Found ${peripherals.size} Inkbird devices`);
    
    // Log details of all found devices
    if (peripherals.size > 0) {
      logger.log(`[SCAN] Found devices:`);
      let deviceIndex = 1;
      peripherals.forEach((device) => {
        logger.log(`[SCAN] - Device ${deviceIndex}: ${device.name || 'unnamed'} (${device.id})`);
        logger.log(`[SCAN]   RSSI: ${device.rssi}dBm, Services: ${device.serviceUUIDs?.join(', ') || 'none'}`);
        logger.log(`[SCAN]   Viable: ${isDeviceViable(device) ? 'YES' : 'NO'}`);
        deviceIndex++;
      });
    }

    if (peripherals.size === 0) {
      logger.warn('[SCAN] No Inkbird devices found during scan');

      // Check if we can retry automatically (without triggering another immediate scan)
      const now = Date.now();
      if (
        scanAttemptRef.current.count < scanAttemptRef.current.maxRetries &&
        scanAttemptRef.current.connectionFailureCount < scanAttemptRef.current.maxConnectionFailures &&
        now >= scanAttemptRef.current.cooldownUntil
      ) {
        logger.log(
            `Will attempt automatic retry (${scanAttemptRef.current.count}/${scanAttemptRef.current.maxRetries}) after brief delay`
        );
        // Set error briefly, then trigger retry through status change after delay
        setDeviceStatus('Error');
        setTimeout(() => {
          logger.log('Triggering automatic retry...');

          // Show toast for retry attempt
          showToast({
            type: ToastTypes.SUCCESS,
            txt1: translate('taskBLEScanningToast'),
          });

          // Trigger the retry scan directly
          requestValue().catch(console.error);
        }, 1500); // 1.5 second delay before retry
      } else {
        // No more retries available or in cooldown
        logger.warn('No automatic retries available, setting final error state');
        setDeviceStatus('Error');
      }
      return;
    }

    // Pre-warm connection by getting BLE context early (reduces connection latency)
    logger.log('[OPTIMIZATION] Pre-warming connection by getting BLE context early...');
    const ble = getBLEContext();
    
    // Device selection with RSSI-based prioritization
    const devices = Array.from(peripherals.values());
    logger.log(`[SELECTION] Evaluating ${devices.length} total devices for viability...`);
    
    const viableDevices = devices.filter(isDeviceViable);
    logger.log(`[SELECTION] Found ${viableDevices.length} viable devices after filtering`);
    
    if (viableDevices.length === 0) {
      logger.warn('[SELECTION] No viable devices found (signal too weak or invalid names)');
      setDeviceStatus('Error');
      return;
    }

    // Choose highest RSSI from all viable devices
    const prioritizedDevices = prioritizeDevicesByProximity(viableDevices);
    const bestDevice = prioritizedDevices[0];
    
    logger.log(`[SELECTION] Selected best device: ${bestDevice.name || 'unnamed'} (${bestDevice.id})`);
    logger.log(`[SELECTION] - RSSI: ${bestDevice.rssi}dBm`);
    logger.log(`[SELECTION] - Services: ${bestDevice.serviceUUIDs?.join(', ') || 'none'}`);

    // Multi-device kitchen environment feedback
    if (viableDevices.length > 1) {
      logger.log(
          `Found ${viableDevices.length} viable Inkbird devices - connecting to strongest signal (${bestDevice.rssi} dBm)`
      );
      logger.log('Kitchen multi-device selection:');
      prioritizedDevices.forEach((device, index) => {
        logger.log(
            `  ${index === 0 ? '→ SELECTED' : '  Alternative'}: ${device.name} (${device.rssi} dBm)`
        );
      });
    } else {
      logger.log(`Single viable device found: ${bestDevice.name} (${bestDevice.rssi} dBm)`);
    }

    // Transition to connecting state
    logger.log('Inkbird devices found, attempting to connect to closest device...');
    logger.log(
        'NOTE: If onConnect callback is not called within 10-15 seconds, the BLE connection is failing'
    );
    setDeviceStatus('Connecting');

    // Connect to the best (closest) device
    logger.log(`[CONNECTION] Initiating connection to closest device...`);
    logger.log(`[CONNECTION] Target device: ${bestDevice.name || 'unnamed'} (${bestDevice.id})`);
    logger.log(`[CONNECTION] RSSI: ${bestDevice.rssi}dBm`);
    logger.log(`[CONNECTION] Services: ${bestDevice.serviceUUIDs?.join(', ') || 'none'}`);

    try {
      // Use standard BLE connection to ensure callbacks are triggered
      logger.log(`[CONNECTION] Connecting to device using standard BLE manager...`);
      
      // When multiple devices are available, use single attempt per device to minimize total wait time
      const maxRetries = viableDevices.length > 1 ? 1 : 2;
      logger.log(`[CONNECTION] Using ${maxRetries} attempt(s) per device (${viableDevices.length} devices available)`);
      
      await ble.connectToDeviceById(bestDevice.id, undefined, false, maxRetries);
      logger.log(`[CONNECTION] Standard connection request completed successfully for ${bestDevice.id}`);
    } catch (error) {
      logger.error(`Connection failed for best device ${bestDevice.id}:`, error);
      
      // Increment connection failure counter
      scanAttemptRef.current.connectionFailureCount++;
      
      // Try fallback to next best device if available AND we haven't exceeded connection failure limit
      const prioritizedDevices = prioritizeDevicesByProximity(viableDevices);
      if (prioritizedDevices.length > 1 && 
          scanAttemptRef.current.connectionFailureCount < scanAttemptRef.current.maxConnectionFailures) {
        const fallbackDevice = prioritizedDevices[1];
        logger.log(`[CONNECTION] Attempting fallback connection...`);
        logger.log(`[CONNECTION] Fallback device: ${fallbackDevice.name || 'unnamed'} (${fallbackDevice.id})`);
        logger.log(`[CONNECTION] Fallback RSSI: ${fallbackDevice.rssi}dBm`);
        try {
          // Use single attempt for fallback connections to minimize wait time
          await ble.connectToDeviceById(fallbackDevice.id, undefined, false, 1);
          logger.log(`[CONNECTION] Standard fallback connection successful: ${fallbackDevice.id}`);
        } catch (fallbackError) {
          logger.error(`Fallback connection also failed:`, fallbackError);
          
          // Increment failure count again for fallback failure
          scanAttemptRef.current.connectionFailureCount++;
          
          // Check if we've exceeded total connection failure limit
          if (scanAttemptRef.current.connectionFailureCount >= scanAttemptRef.current.maxConnectionFailures) {
            logger.error(`Maximum connection failures (${scanAttemptRef.current.maxConnectionFailures}) reached. Preventing infinite retry loop.`);
            scanAttemptRef.current.cooldownUntil = Date.now() + scanAttemptRef.current.cooldownMs;
          }
          
          setDeviceStatus('Error');
        }
      } else {
        if (scanAttemptRef.current.connectionFailureCount >= scanAttemptRef.current.maxConnectionFailures) {
          logger.error(`Maximum connection failures (${scanAttemptRef.current.maxConnectionFailures}) reached. Entering cooldown.`);
          scanAttemptRef.current.cooldownUntil = Date.now() + scanAttemptRef.current.cooldownMs;
        }
        setDeviceStatus('Error');
      }
      return;
    }
  }, [ble, isDeviceViable, prioritizeDevicesByProximity, getBLEContext, showToast, translate, requestValue]);

  // Callback executed when BLE peripheral scanning completes. Used by useBLE hook
  const onScanDone = useCallback(async (peripherals: Map<string, Device>) => {
    logger.log(`[SCAN] Scan completed normally. Found ${peripherals.size} Inkbird devices`);
    
    // Clear any pending device timeout
    if (deviceTimeoutRef.current) {
      clearTimeout(deviceTimeoutRef.current);
      deviceTimeoutRef.current = null;
    }
    
    // Reset scanning state
    scanningForDevicesRef.current = false;
    discoveredDevicesRef.current.clear();
    
    // Process the scan results
    await processScanResults(peripherals);
  }, [processScanResults]);

  // Device discovery callback - called for each device found during scan
  const onDiscover = useCallback((device: Device) => {
    // Store discovered device
    discoveredDevicesRef.current.set(device.id, device);
    
    // Check if this is the first Inkbird device and we haven't started detection yet
    if (!scanningForDevicesRef.current && isDeviceViable(device)) {
      logger.log(`[DEVICE_DETECT] Found first viable Inkbird during scan: ${device.name || 'unnamed'} (${device.id})`);
      scanningForDevicesRef.current = true;
      handleFirstDeviceDetected();
    }
  }, [isDeviceViable, handleFirstDeviceDetected]);


  // Initialize scanning state when starting scan
  const initializeScanState = useCallback(() => {
    scanningForDevicesRef.current = false;
    discoveredDevicesRef.current.clear();
    
    // Clear any existing device timeout
    if (deviceTimeoutRef.current) {
      clearTimeout(deviceTimeoutRef.current);
      deviceTimeoutRef.current = null;
    }
  }, []);


  // Callback for disconnection event of inkbird BLE device. Used by useBLE hook
  const onDisconnect = useCallback(() => {
    const connectionDuration = Date.now() - connectionStabilityRef.current.connectTime;
    
    // Determine if this disconnection should allow automatic retry based on app state
    const shouldAllowRetry = () => {
      // If user explicitly cancelled, never retry automatically
      if (userIntentRef.current === 'cancelled') {
        logger.log('Disconnection after user cancellation - no automatic retry');
        return false;
      }
      
      // If we're in Done state (user has saved temperature), don't retry automatically
      if (deviceStatus === 'Done') {
        logger.log('Disconnection while in Done state - no automatic retry needed');
        return false;
      }
      
      // If no active task is requesting data, don't retry automatically
      if (!activeTaskRef.current) {
        logger.log('Disconnection with no active task - no automatic retry needed');
        return false;
      }
      
      // If we're actively scanning/connecting/reading for a task, this might be unexpected
      if (deviceStatus === 'Scanning' || deviceStatus === 'Connecting' || deviceStatus === 'Reading') {
        logger.log(`Disconnection during active operation (${deviceStatus}) - allow retry`);
        return true;
      }
      
      // Default to no retry for other states
      logger.log(`Disconnection in state ${deviceStatus} - no automatic retry`);
      return false;
    };

    const allowRetry = shouldAllowRetry();
    
    if (allowRetry) {
      connectionStabilityRef.current.disconnectCount++;
      logger.warn(
          `Unexpected disconnect after ${connectionDuration}ms during active operation (count: ${connectionStabilityRef.current.disconnectCount})`
      );
    } else {
      // Expected disconnect or user completed workflow - reset scan attempts
      resetScanAttempts();
      logger.log('Expected disconnect or completed workflow - resetting scan attempts');
    }

    // Stop keepalive mechanism
    stopKeepalive();

    // Reset device and value state when the inkbird turns off/ disconnects
    resetDeviceState();
    setDeviceStatus('NotStarted');
    
    // Clear task refs to allow retry when device reconnects
    activeTaskRef.current = null;
    userIntentRef.current = 'idle';
    logger.log('Cleared task refs on disconnect - retry will be allowed');
  }, [deviceStatus, stopKeepalive, resetScanAttempts, resetDeviceState]);

  // Store cleanup function for device registration
  const deviceRegistrationCleanupRef = useRef<(() => void) | null>(null);

  // Callback to register 'inkbird' as a valid BLE device within the useBLE hook
  const registerInkbirdDevice = useCallback(() => {
    if (!isRegisteredRef.current) {
      // Set registration flag immediately to prevent race condition
      isRegisteredRef.current = true;

      try {
        const cleanup = registerDeviceType(
          INKBIRD_DEVICE_KEY,
          inkbirdDeviceDetection,
          { onConnect, onScanDone, onNotification: onNotification, onDisconnect, onDiscover },
          { reconnect: false }
        );

        deviceRegistrationCleanupRef.current = cleanup;
      } catch (error) {
        // Reset flag on error
        isRegisteredRef.current = false;
        logger.error('Failed to register Inkbird device:', error);
        throw error;
      }
    }
  }, [onConnect, onScanDone, onNotification, onDisconnect, onDiscover, registerDeviceType]); // Added proper dependencies

  // Callback executed when button is pressed on UI
  const requestValue = useCallback(async () => {
    try {
      const now = Date.now();

      // Check if we're in cooldown period
      if (now < scanAttemptRef.current.cooldownUntil) {
        const remainingCooldown = Math.ceil(
          (scanAttemptRef.current.cooldownUntil - now) / 1000
        );
        logger.log(`Scan in cooldown period. ${remainingCooldown}s remaining`);
        return;
      }

      // Check if we've exceeded maximum retry attempts
      if (scanAttemptRef.current.count >= scanAttemptRef.current.maxRetries) {
        logger.warn(
            `Maximum scan attempts (${scanAttemptRef.current.maxRetries}) exceeded. Entering cooldown.`
        );
        scanAttemptRef.current.cooldownUntil = now + scanAttemptRef.current.cooldownMs;
        setDeviceStatus('Error');
        return;
      }

      // Prevent multiple simultaneous scan attempts
      if (
        deviceStatus === 'Scanning' ||
        deviceStatus === 'Connecting' ||
        deviceStatus === 'Reading'
      ) {
        logger.log('Scan already in progress, status:', deviceStatus);
        return;
      }

      // Need to make sure the device has registered before doing anyting, the useBLE hook is slow initially and can put the device into a bad state if it isn't ready
      if (!isRegisteredRef.current) {
        registerInkbirdDevice();
      }

      // Check to see if there is an inkbird already connected and working
      const connectedInkbirdId = deviceStateRef.current?.activeDeviceId;
      const hasActiveConnection = deviceStateRef.current?.hasActiveConnection;
      const isCurrentlyReading = deviceStatus === 'Reading' || deviceStatus === 'Done';
      
      if (connectedInkbirdId && hasActiveConnection && isCurrentlyReading) {
        logger.log('Device already connected and working, no scan needed:', connectedInkbirdId);
        logger.log('Current status:', deviceStatus);
        resetScanAttempts();
        
        // Try to send a command to verify connection is still alive with timeout
        try {
          // Add timeout promise to prevent hanging on disconnected devices
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection verification timeout')), 500)
          );
          
          const writePromise = write(
            connectedInkbirdId,
            SERVICE_UUID,
            WRITE_CHARACTERISTIC_UUID,
            CMD_DOWNLINK_ALL_DATA
          );
          
          await Promise.race([writePromise, timeoutPromise]);
          logger.log('Data request sent successfully to already connected device');
          setDeviceStatus('Reading');
          return;
        } catch (error) {
          logger.log('Connected device not responding to verification, clearing stale state:', error);
          // Clear stale state and fall through to fresh scan
          resetDeviceState();
          
          // Show toast immediately since we know we need to scan
          showToast({
            type: ToastTypes.SUCCESS,
            txt1: translate('taskBLEScanningToast'),
          });
        }
      } else if (connectedInkbirdId) {
        logger.log('Device connected but status unclear after cleanup, forcing fresh reconnection:', connectedInkbirdId);
        logger.log('Connection status - active:', hasActiveConnection, 'deviceStatus:', deviceStatus);
        
        // After grace period timeout cleanup, device state may be inconsistent
        // Force full cleanup and fresh scan to ensure proper notification setup
        logger.log('Clearing potentially stale connection state and forcing fresh scan');
        resetDeviceState();
      }

      // Increment scan attempt counter
      scanAttemptRef.current.count++;
      scanAttemptRef.current.lastAttemptTime = now;

      // Show scanning toast only if we haven't already shown it
      if (scanAttemptRef.current.count === 1) {
        showToast({
          type: ToastTypes.SUCCESS,
          txt1: translate('taskBLEScanningToast'),
        });
      }
      
      setDeviceStatus('Scanning');

      // Initialize scan state for device detection
      initializeScanState();

      // Single scan that will detect first Inkbird and wait 500ms for others
      logger.log('Starting optimized scan for Inkbird devices with real-time first-device detection');
      await startScanForDeviceType(INKBIRD_DEVICE_KEY);
    } catch (e) {
      console.error(e);
      logger.error('Exception occurred when scanning for Inkbird device:', e);
      setDeviceStatus('Error');
    }
  }, [deviceStatus, registerInkbirdDevice, startScanForDeviceType, resetScanAttempts, initializeScanState, resetDeviceState]);

  // User intent functions - these are what the UI calls
  const requestTemperatureReading = useCallback(
    (taskId: string) => {
      logger.log(`User requested temperature reading for task: ${taskId}`);

      // Prevent rapid duplicate requests to the same task while actively scanning/connecting
      // But allow retries when in error state
      if (activeTaskRef.current === taskId && userIntentRef.current === 'scanning' && deviceStatus !== 'Error') {
        logger.log(`Duplicate request ignored for task: ${taskId}`);
        return;
      }

      // Prevent interrupting active scans - let them complete naturally
      if (
        deviceStatus === 'Scanning' ||
        deviceStatus === 'Connecting' ||
        deviceStatus === 'Reading'
      ) {
        logger.log(
            `Scan already in progress (${deviceStatus}), ignoring duplicate request for task: ${taskId}`
        );
        return;
      }

      // Set active task and user intent
      activeTaskRef.current = taskId;
      userIntentRef.current = 'scanning';

      // Reset scan attempts for new user request
      resetScanAttempts();

      // Critical: Reset the main BLE hook's scanning state to prevent "scan already in progress" errors
      resetScanningState();

      // Start the scanning process
      requestValue().catch((e) => {
        logger.error('Failed to start scan for user request:', e);
        userIntentRef.current = 'idle';
        activeTaskRef.current = null;
      });
    },
    [deviceStatus, requestValue, resetScanAttempts, resetScanningState]
  );

  const cancelTemperatureReading = useCallback(async () => {
    logger.log(`User cancelled temperature reading for task: ${activeTaskRef.current}`);
    userIntentRef.current = 'cancelled';
    activeTaskRef.current = null;
    
    // Force immediate BLE scan cancellation
    resetScanningState();
    
    // Clear any pending timeouts
    clearAllTimeouts();
    stopKeepalive();
    
    // Cancel any in-progress connection attempts
    const connectedDeviceId = deviceStateRef.current?.activeDeviceId;
    if (connectedDeviceId) {
      logger.log(`Cancelling in-progress connection to device: ${connectedDeviceId}`);
      try {
        await disconnect(connectedDeviceId);
        logger.log(`Successfully cancelled connection to device: ${connectedDeviceId}`);
      } catch (error) {
        logger.warn(`Failed to cancel connection to device ${connectedDeviceId}:`, error);
        // Continue with cleanup even if disconnect fails
      }
    }
    
    // Reset device state
    resetDeviceState();
    
    setDeviceStatus('NotStarted');
  }, [resetScanningState, clearAllTimeouts, stopKeepalive, resetDeviceState]);

  const state = useMemo(
    () => ({
      deviceStatus,
      temperature: receivedValue,
      requestTemperatureReading,
      cancelTemperatureReading,
      onUserActivity,
    }),
    [
      deviceStatus,
      receivedValue,
      requestTemperatureReading,
      cancelTemperatureReading,
      onUserActivity,
    ]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Ensure all timers cleared on unmount
      clearAllTimeouts();
      stopKeepalive();
      if (deviceRegistrationCleanupRef.current) {
        deviceRegistrationCleanupRef.current();
      }
    };
  }, [clearAllTimeouts, stopKeepalive]);

  return (
    <InkbirdBLEStateContext.Provider value={state}>
      {children}
    </InkbirdBLEStateContext.Provider>
  );
};

const fixedPointFtoC = (tempF: string): string | null => {
  const valueF = parseFloat(tempF);
  if (isNumber(valueF) && !isNaN(valueF)) {
    const valueC = (valueF - 32) * 0.55555555555;
    return valueC.toFixed(2);
  }
  return null;
};

// Simplified conversion of byte array to signed 16-bit temperature value without manually taking 2's complement
const byteArrayToTemperature = (byteArray: number[]): string | null => {
  // Temperature data comes exclusively in the form of two bytes, initially represented as an array of two numbers
  if (byteArray.length !== 2) {
    return null;
  }
  // These two bytes are to be combined and interpreted as a signed 16 bit integer
  // Ordering of the two bytes is big endian
  // Buffer library handles conversion of an array of two numbers to a signed 16 bit integer, BE for big endian format starting at element 0
  const signedInt16 = Buffer.from(byteArray).readInt16BE(0);
  // The 16 bit integer is a fixed point representation of the temperature value with a scale of 10
  const rawTemperature = signedInt16 / 10;
  // Validate raw value is indeed a number
  if (!isNumber(rawTemperature)) {
    return null;
  }
  // Limit float representation to two decimal places and convert to string
  const temperature = rawTemperature.toFixed(2);
  return isString(temperature) ? temperature : null;
};

// Function to parse inbird commands in the form of bytes
const parseCommandData = (byteArray: number[], commandToParse: number[]) => {
  // Inkbird messages are recieved as a byte stream
  // Byte stream is not restricted in length and a single message may contain values for multiple attributes. For example, a byte stream may send the device status (on/off, hold/no hold, etc., the current temperature in °F, the current temperature in °C, all in a single message.
  // Each piece of data within a message is distinguished/encoded using a preamble consisting of 4 bytes, 1-15 bytes representing the corresponding value, and a checksum byte, meaning a minimum of 6 bytes and a maximum of 20 bytes is required for any given command to be issued or value to be read.
  // The full byte stream for a given piece of information thus has the following structure:
  // Preamble:
  //       Byte 0: [Header MSB]  (0x55) (Always)
  //       Byte 1: [Header LSB]  (0xAA) (Always)
  //       Byte 2: [Command ID]  (0x01 - 0x1B)
  //       Byte 3: [Data Length] (0x01 - 0x0F)
  // Data (n bytes):
  //       Byte 4: [Data Most Significant Byte]
  //       Byte 5: [Data Byte n-1]
  //       ...
  //       Byte n+3: [Data LSB]
  // Checksum
  //       Byte n+4: [Checksum Byte] (Always 1 byte)
  const commandLength = commandToParse.length;
  // number of bytes is always the second element of the command header and will be the last element of the command to parse
  const nBytes = commandToParse[commandLength - 1];
  const cmdStartIdx = byteArray.findIndex((_, idx) => {
    // Check if the slice at index matches the command byte sequence
    return byteArray
      .slice(idx, idx + commandLength)
      .every((val, index) => val === commandToParse[index]);
  });
  if (cmdStartIdx > -1 && nBytes && nBytes > 0) {
    const dataStartIdx = cmdStartIdx + commandLength;
    const dataEndIdx = dataStartIdx + nBytes;
    const dataValue = byteArray.slice(dataStartIdx, dataEndIdx);
    // The slice you pull from the byte array must have the same number of elements as specified by data length portion of the command header
    if (dataValue.length === nBytes) {
      return dataValue;
    }
  }
  return null;
};
