import { NativeModules } from 'react-native';
import { ShowToastProps } from '../utils/utils';

export type PrinterConfig = {
  brand: 'zebra' | 'brother' | 'bixolon' | 'bixolonupos';
  connection: 'wifi' | 'bluetooth' | 'ble';
  extra?: Record<string, string>;
};

export type PrinterError = {
  code: number;
  message: string;
  overrideToast?: boolean;
  override?: ShowToastProps;
};

export type Printer<T> = {
  id: string;
  name: string;
  extra: T;
};

export type BrotherPrinterExtra = {
  serial: string;
};

export type ZebraBLEPrinterExtra = {
  writeCharacteristic: Characteristic | null;
};

export type NoExtra = unknown;

export type SupportedPrinter =
  | Printer<BrotherPrinterExtra>
  | Printer<ZebraBLEPrinterExtra>
  | Printer<NoExtra>;

const PathSpotPrinterModule = NativeModules.PathSpotPrinterModule as unknown as {
  search: <T>(config: PrinterConfig) => Promise<T>;
  printLabel: (config: PrinterConfig, id: string, data: string) => Promise<string[]>;
};

export const { search, printLabel } = PathSpotPrinterModule;
