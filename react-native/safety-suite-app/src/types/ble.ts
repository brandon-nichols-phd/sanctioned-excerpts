import {
  ScanOptions,
  BleIOSErrorCode,
  ConnectionOptions,
  Device,
  type DeviceId,
  type UUID,
  type Characteristic,
  type Service,
  type Subscription,
} from 'react-native-ble-plx';

/**
 * iOs error keys from BLE Manager
 */
export type BLEiOsError = keyof typeof BleIOSErrorCode;
/**
 * Type corresponding to the kind or category of device to be used as a key in the Map of registered devices.
 * Currently overrides string type but implementing now with expectation that this will change to a set of string
 * literals in the future. Something like 'Inkbird' | 'ThermoPen' | 'DishTempBlue' | 'BrotherPrinter', and so on.
 */
export type BLEDeviceType = string;

/** Wrapper for plx 'DeviceId'
 */
export type BLEDeviceId = DeviceId;

/** Wrapper for plx 'Device'
 */
export type BLEDevice = Device;
/**
 * Custom device options for features outside of the ble manager options.
 */
export type BLEDeviceOptions = {
  /**
   * Connection options for ble manager specific to device (if default is not adequate.)
   */
  connectionOptions: ConnectionOptions;
  /**
   * Scanning options for ble manager specific to device (if default is not adequate.)
   */
  scanOptions: ScanOptions;
  /**
   *  Connection timeout parameters
   */
  connectionTimeout?: BLETimeout;
};

export type BLEListeners = {
  /**
   * Optional handler for post discovery logic
   */
  onDeviceRegistration?: (device: Device) => void;
  /**
   * Optional handler for post discovery logic
   */
  onDiscover?: (device: Device) => void;
  /**
   * Callback to handle setup after a device connects.
   */
  onConnect: (device: Device) => Promise<void>;
  /**
   * Optional cleanup when a device disconnects.
   */
  onDisconnect?: (device: Device) => void;
  /**
   * Optional handler for notifications (if subscribed to characteristics).
   */
  onNotification?: (device: Device, base64Value: string | null) => void;
  /**
   * Optional handler for post ble scanning complete logic
   */
  onScanDone?: (peripherals: Map<BLEDeviceId, Device>) => void;
  /**
   * Optional handler for keep alive logic for devices that go to sleep
   */
  onInactivityTimeout?: (device: Device) => void;
  /**
   * Optional handler for connection logic for devices that fail to connect in time
   * Should be used to increase power or try alternate identifiers
   */
  onConnectionTimeout?: (device: Device) => void;
};

/**
 * State type to describe what the BLE Manager is currently doing
 */
export type BLEControllerScanState = 'NotStarted' | 'Scanning' | 'Done' | 'Error';

/**
 * State type to keep track of specifc device
 */
export type BLEDeviceComState =
  | 'Unknown'
  | 'Restoring' //This is an iOs only feature
  | 'Searching'
  | 'Discovered'
  | 'Connecting'
  | 'Connected'
  | 'Initialized' //implies that services have beem found and command has been sent to start notifying, if applicable. Equivalent to an 'idle' state
  | 'Disconnected'
  | 'Reading'
  | 'Notifying'
  | 'Error';

/**
 * General structure of data that is specific to a BLE device that is set by the manufacturer, such as the model,
 * battery, mac obfuscation, and so on. BLE has strict packet size limits (max 31 bytes for advertisement + 31 bytes for scan response). So, not everything can be included, and manufacturers choose what to prioritize.
 */
export type ManufacturerData = {
  name?: string;
  serviceUUID?: UUID;
  idServiceUUID?: UUID;
  data?: string;
  identifier?: UUID;
  peripheralId?: UUID;
  localName?: string;
};

/**
 * General structure of data that is broadcast by a BLE device that is not yet connected.
 */
export type AdvertisingPacket = {
  deviceName?: string;
  manufacturerData?: ManufacturerData;
  advertisedServices?: UUID[];
  rssi?: number;
  connectable?: boolean;
};

export enum BLECharacteristicPropertyEnum {
  READ = 'READ',
  WRITE = 'WRITE',
  NOTIFY = 'NOTIFY',
}
export type BLECharacteristicPropertyType = keyof typeof BLECharacteristicPropertyEnum;

export type BLECharacteristicProperties = Partial<
  Record<BLECharacteristicPropertyType, string | Array<string>>
>;

export type BLECharacteristic = {
  name?: string;
  descriptor?: string;
  uuid: UUID;
  properties: BLECharacteristicProperties;
};

export type BLEServiceGATT = {
  serviceUUID: string;
  isPrimary: boolean;
  name?: string;
  genericAccessUUID?: UUID;
  genericAttributeUUID?: UUID;
  characteristics?: Record<UUID, BLECharacteristic>;
};

export type GATTProfile = {
  deviceName: string;
  localName?: string;
  services: Record<UUID, BLEServiceGATT>;
};

export type BLEPeripheralServiceProfile = {
  advertised: AdvertisingPacket;
  connected: GATTProfile;
};

export type BlePlxCharacteristic = {
  instance: Characteristic;
  characteristicMonitor: Subscription | null;
  isCharacteristicMonitorDisconnectExpected: boolean;
  transactionId?: string;
};

export type BlePlxService = {
  instance: Service;
  characteristics: Map<UUID, BlePlxCharacteristic>;
};

export type BLEPeripheral = {
  instance: Device;
  serviceProfile?: BLEPeripheralServiceProfile;
  discoveredServices?: Map<UUID, BlePlxService>;
};

export type BLEDeviceTypeModel = {
  /**
   * The kind of device the peripheral is, i.e. Inkbird | ThermoPen, etc.
   */
  deviceType: BLEDeviceType;
  /**
   * Matches a device by name, localName, manufacturerData or other identifying property.
   */
  detection: (device: Device) => boolean;
  /**
   * Set of callbacks to handle setup and value reads that require device specific logic
   */
  listeners: BLEListeners;
  /**
   * Set dd
   */
  identifiedDevices: Map<BLEDeviceId, BLEPeripheral>;
  /**
   * Custom device options
   */
  options?: BLEDeviceOptions;
};

export type BLEDeviceContextState<
  T = number[],
  P extends object = Record<string, never>
> = {
  latestNotificationValue?: T | null;
  resetInactivityTimeout: () => Promise<void>;
  deviceConnectionState: BLEDeviceComState;
  activePeripheralState: ActiveBLEPeripheralState<P>;
};

export type BLETimeout = {
  startEpoch: number;
  durationSeconds: number;
  secondsUntilTimeout: number;
  onTimeout?: () => Promise<void>;
};

/**
 * State type for quickly checking whether or not the device has changed and what the state of the current connection
 * is. This is to be used (potentially extended) in each BLE device hook to rapidly handle the target device connection state
 */
export type ActiveBLEPeripheralState<T extends object = Record<string, never>> = T & {
  activeDeviceId: string;
  isRegistered: boolean;
  hasActiveConnection: boolean;
  recievedServicesInfo: boolean;
  isInitialized: boolean;
  isNotifying: boolean;
  inactivityTimeout: BLETimeout; // in seconds
};
