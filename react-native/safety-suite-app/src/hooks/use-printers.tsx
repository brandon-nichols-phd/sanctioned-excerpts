import React, {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useSelector } from 'react-redux';
import { omit } from 'lodash';

import {
  SupportedPrinter,
  search,
  PrinterConfig,
} from '../../native-modules/PathSpotPrinterModule';
import { State } from '../../store/types/store-types';
import { showToast } from '../../utils/utils';
import { ToastTypes } from '../types/app';
import { useZebraBLE } from './use-zebra-ble';
import { handleCheckBluetoothPermission } from '../../utils/ble-utils';
import { useZebraConfig } from './use-zebra-config';
import { translate } from '../data/translations';
import { defaultParams } from '../../api/utils';
import { updateLocationPrinterConfig, } from '../../api/labels';

type UpdatePrinterConfigArgs = {
  locationId: number | null;
  printer_brand: string;
  printer_connection: string;
};

type PrintersContextState = {
  printerConfig: PrinterConfig;
  printers: SupportedPrinter[];
  userShouldSearchPrinters: boolean;
  searchPrinters: () => void;
  dateOfLastSearch: Date | null;
  isWifiEnabled: boolean;
  isSearching: boolean;
  updatePrinterConfig: (args: UpdatePrinterConfigArgs) => Promise<void>;
};

const PrintersContext = createContext<PrintersContextState | null>(null);

export const usePrinters = (): PrintersContextState => {
  const stateContext = useContext(PrintersContext);
  if (stateContext === null) {
    throw new Error('usePrinters must be used within a PrintersProvider');
  }
  return stateContext;
};

export const PrintersProvider: FC<PropsWithChildren> = (props) => {
  const [printers, setPrinters] = useState<SupportedPrinter[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [dateOfLastSearch, setDateOfLastSearch] = useState<Date | null>(null);
  const [userShouldSearchPrinters, setUserShouldSearchPrinters] =
    useState<boolean>(false);

  const currUser = useSelector((state: State) => state.user.currUser);
  const contextState = useSelector((state: State) => state.context);

  const currentLocation = currUser?.locations.find(
    (loc) => loc.locationId === contextState.locationId
  );
  const printerConfigFromLocation = useMemo<PrinterConfig>(() => {
    return {
      brand: (currentLocation?.printerConfig?.printerBrand as PrinterConfig['brand']) ?? 'zebra',
      connection:(currentLocation?.printerConfig?.printerConnection as PrinterConfig['connection']) ?? 'bluetooth',
    };
  }, [currentLocation?.printerConfig?.printerBrand, currentLocation?.printerConfig?.printerConnection]);
  
  const [printerConfigLocal, setPrinterConfigLocal] = useState<PrinterConfig | null>(null);
  
  useEffect(() => {
    setPrinterConfigLocal(null);
  }, [currentLocation?.locationId]);

  const printerConfig: PrinterConfig = printerConfigLocal ?? printerConfigFromLocation;
  const isWifiEnabled = printerConfig.connection === 'wifi';

  const {
    scanningStatus,
    startScan,
    printers: blePrinters,
  } = useZebraBLE({
    active: printerConfig.brand === 'zebra' && printerConfig.connection === 'ble',
  });
  const { configs, getConfigs } = useZebraConfig();

  useEffect(() => {
    if (configs != null) {
      console.warn('Config for printer', {
        tags: {
          locationId: currentLocation?.locationId,
          ...omit(printerConfig, 'extra'),
        },
        extra: {
          ...configs,
        },
      });
    }
  }, [currentLocation?.locationId, printerConfig, configs]);

  useEffect(() => {
    if (printerConfig.connection === 'ble') {
      setPrinters(blePrinters);
    }
  }, [blePrinters, printerConfig]);

  useEffect(() => {
    if (printerConfig.connection === 'ble') {
      switch (scanningStatus) {
        case 'NotStarted':
          setIsSearching(false);
          setUserShouldSearchPrinters(true);
          break;
        case 'Scanning':
          // Handled in the searchPrinters function
          break;
        case 'Done': {
          searchPromiseRef.current = null;
          setIsSearching(false);
          const foundPrinters = blePrinters.length > 0;

          setUserShouldSearchPrinters(!foundPrinters);

          if (!foundPrinters) {
            console.debug('No BLE printers found', {
              tags: {
                locationId: currentLocation?.locationId,
                ...omit(printerConfig, 'extra'),
              },
            });
            showToast({
              type: ToastTypes.INFO,
              txt1: translate('printersnotfound'),
              txt2: translate('checkDevice'),
            });
          } else {
            showToast({
              type: ToastTypes.SUCCESS,
              txt1: `${translate('found')} ${translate('foundBLE')}`,
              txt2: translate('readyPrint'),
            });
          }
          break;
        }
        case 'Error':
          showToast({
            type: ToastTypes.INFO,
            txt1: translate('errorSearch'),
            txt2: translate('tryAgain'),
          });

          searchPromiseRef.current = null;
          setIsSearching(false);
          setUserShouldSearchPrinters(true);
          break;
      }
    }
  }, [scanningStatus, blePrinters, printerConfig, currentLocation?.locationId]);

  const searchPromiseRef = useRef<Promise<void> | null>(null);
  const searchPrinters = useCallback(async () => {
    if (searchPromiseRef.current) {
      return searchPromiseRef.current;
    }

    if (printerConfig.connection === 'ble' && scanningStatus !== 'Scanning') {
      showToast({
        type: ToastTypes.INFO,
        txt1: translate('searchingPrinters'),
      });
      setIsSearching(true);
      setUserShouldSearchPrinters(false);
      searchPromiseRef.current = startScan();
      
      console.debug('Printer metric', {
        metric: 'printers_search',
        value: 1,
        tags: {
          locationId: currentLocation?.locationId,
          ...omit(printerConfig, 'extra'),
        },
      });
    } else if (printerConfig.connection !== 'ble') {
      showToast({
        type: ToastTypes.INFO,
        txt1: translate('searchingPrinters'),
      });

      setPrinters(null);
      setIsSearching(true);
      setUserShouldSearchPrinters(false);
      if (printerConfig.connection === 'bluetooth') {
        await handleCheckBluetoothPermission();
      }

      console.debug('Printer metric', {
        metric: 'printers_search',
        value: 1,
        tags: {
          locationId: currentLocation?.locationId,
          ...omit(printerConfig, 'extra'),
        },
      });

      searchPromiseRef.current = search<SupportedPrinter[]>(printerConfig)
        .then((foundPrinters) => {
          if (foundPrinters.length) {
            setPrinters(foundPrinters);
            if (['wifi'].includes(printerConfig.connection)) {
              showToast({
                type: ToastTypes.SUCCESS,
                txt1: `${translate('found')} ${foundPrinters.length} ${translate('foundWifi')}`,
                txt2: translate('readyPrint'),
              });
            } else if (['ble', 'bluetooth'].includes(printerConfig.connection)) {
              showToast({
                type: ToastTypes.SUCCESS,
                txt1: `${translate('found')} ${translate('foundBLE')}`,
                txt2: translate('readyPrint'),
              });
            }
          } else {
            if (printerConfig.connection === 'wifi') {
              showToast({
                type: ToastTypes.INFO,
                txt1: translate('printersnotfound'),
                txt2: translate('checkNetwork'),
              });
            } else if (printerConfig.connection === 'bluetooth') {
              showToast({
                type: ToastTypes.INFO,
                txt1: translate('printersnotfound'),
                txt2: translate('checkDevice'),
              });
            } else {
              showToast({
                type: ToastTypes.INFO,
                txt1: translate('printersnotfound'),
                txt2: translate('checkconfiguration'),
              });
            }

            console.debug('No printers found', {
              metric: 'no_printers_on_search',
              value: 1,
              tags: {
                locationId: currentLocation?.locationId,
                ...omit(printerConfig, 'extra'),
              },
            });
            setUserShouldSearchPrinters(true);

            // While we implement full printer config, let's track what configs we find
            if (printerConfig.brand === 'zebra' && printerConfig.connection !== 'ble') {
              getConfigs();
            }
          }
        })
        .catch((e) => {
          showToast({
            type: ToastTypes.INFO,
            txt1: translate('errorSearch'),
            txt2: translate('tryAgain'),
          });
          console.error(
            'Encountered the following error searching for printers: ',
            JSON.stringify(e)
          );
          console.error(JSON.stringify(e));
          setUserShouldSearchPrinters(true);

          // While we implement full printer config, let's track what configs we find
          if (printerConfig.brand === 'zebra' && printerConfig.connection !== 'ble') {
            getConfigs();
          }
        })
        .finally(() => {
          searchPromiseRef.current = null;
          setIsSearching(false);
          setDateOfLastSearch(new Date());
        });
    }

    return searchPromiseRef.current;
  }, [getConfigs, currentLocation?.locationId, printerConfig, startScan, scanningStatus]);

  const updatePrinterConfig = useCallback(
    async ({ locationId, printer_brand, printer_connection }: UpdatePrinterConfigArgs) => {
      if (!locationId) {
      throw new Error('Missing locationId for printer config update');
      }

      const params = defaultParams(contextState, currUser);
      if (!params) {
        throw new Error('Missing default API params (user/context)');
      }

      const res = await updateLocationPrinterConfig({
        ...params,
        locationId,
        printerBrand: printer_brand,
        printerConnection: printer_connection,
      });

      if (!res || typeof res.status !== 'number' || res.status < 200 || res.status >= 300) {
        console.error('Printer config update failed: ', res);
        throw new Error(`Failed to update printer config: status ${res?.status}`);
      }

      setPrinterConfigLocal({
        brand: printer_brand as PrinterConfig['brand'],
        connection: printer_connection as PrinterConfig['connection'],
      });
    },
    [contextState, currUser]
  );

  const state = useMemo(
    () => ({
      printerConfig,
      printers: printers ?? [],
      userShouldSearchPrinters: userShouldSearchPrinters,
      searchPrinters: searchPrinters,
      dateOfLastSearch: dateOfLastSearch,
      isWifiEnabled: isWifiEnabled,
      isSearching: isSearching,
      updatePrinterConfig,
    }),
    [
      printerConfig,
      printers,
      userShouldSearchPrinters,
      searchPrinters,
      dateOfLastSearch,
      isWifiEnabled,
      isSearching,
      updatePrinterConfig,
    ]
  );

  return (
    <PrintersContext.Provider value={state}>{props.children}</PrintersContext.Provider>
  );
};
