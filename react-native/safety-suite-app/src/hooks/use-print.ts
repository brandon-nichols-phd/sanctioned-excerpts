import { useCallback, useMemo } from 'react';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { isMatch, omit, cloneDeep } from 'lodash';

import {
  BrotherPrinterExtra,
  Printer,
  PrinterError,
  SupportedPrinter,
  printLabel as nativePrintLabel,
  PrinterConfig,
  ZebraBLEPrinterExtra,
} from '../../native-modules/PathSpotPrinterModule';
import {
  State,
  LabelOfflineQueue,
  PrintRecordPayload,
} from '../../store/types/store-types';
import { showToast } from '../../utils/utils';
import { ToastTypes } from '../types/app';
import { TECH_DEBT, templateProcessor, PrintLabel, PrintRecord } from '../data/label';
import { DefaultAPIParams, defaultParams } from '../../api/utils';
import { handleCheckBluetoothPermission } from '../../utils/ble-utils';
import { addToOfflineQueue } from '../../store/slices/labelSlice';
import { print as blePrint } from './use-zebra-ble';
import { printerToastErrorFromCode } from '../data/printer-errors';
import { translate } from '../data/translations';

const decodeEscapedCharacters = (str: string): string => {
  return str
    .replace(/\\u{([0-9A-Fa-f]+)}/g, (_match, p1) => {
      return String.fromCodePoint(parseInt(p1 as string, 16));
    })
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n');
};

const findPrinter = (
  config: PrinterConfig,
  printers: SupportedPrinter[],
  label: PrintLabel
): SupportedPrinter | null => {
  switch (config.brand) {
    case 'brother': {
      const bpSerialToFind = label.printerInfo?.serial;
      return (
        printers.find((bp) => {
          const brotherPrinter = bp as Printer<BrotherPrinterExtra>;
          return brotherPrinter.extra.serial === bpSerialToFind;
        }) ?? null
      );
    }
    case 'bixolon':
    case 'bixolonupos':
    case 'zebra': {
      const dnsNameToFind = label.printerInfo?.dnsName;
      const foundPrinter = printers.find((printer) => {
        return printer.name === dnsNameToFind;
      });

      return foundPrinter ?? printers[0] ?? null;
    }
  }
};

type Props = {
  printers: SupportedPrinter[];
  printerConfig: PrinterConfig;
  isSearching: boolean;
};

const getPrintRecordLabel = (label: PrintLabel): PrintRecord => {
  return {
    item_name: label.name,
    category_name: label.category,
    phase_name: label.context || '',
    phase_id: label.phaseId,
    print_when: moment().valueOf(),
    print_count: label.count || 1,
    expiration_when: label.expirationDate || null,
    has_expiration: label.expirationType !== 'No Expiration',
  };
};

export const usePrint = (props: Props) => {
  const currUser = useSelector((state: State) => state.user.currUser);
  const contextState = useSelector((state: State) => state.context);
  const templates = useSelector((state: State) => state.printer.templates);
  const labelSize = useSelector((state: State) => state.labels.labelSize);
  const dispatch = useDispatch();

  const recordPrintedLabels = useCallback(
    (printedLabels: PrintLabel[]) => {
      if (!printedLabels.length) {
        return;
      }

      const reqParams: DefaultAPIParams | null = defaultParams(contextState, currUser);
      if (!reqParams) {
        return;
      }

      const labelRecords: PrintRecord[] = printedLabels.map((label: PrintLabel) =>
        getPrintRecordLabel(label)
      );

      const apiParams: PrintRecordPayload = {
        ...reqParams,
        labels: labelRecords,
      };

      const payload: LabelOfflineQueue = {
        type: 'printLabels',
        params: apiParams,
      };
      dispatch(addToOfflineQueue(payload));
    },
    [contextState, dispatch, currUser]
  );

  const _printLabel = useCallback(
    async (label: PrintLabel) => {
      if (props.isSearching) {
        return Promise.reject({
          code: 1003,
          message: translate('alreadySearching'),
        });
      }
      const hasPrinters = props.printers.length > 0;
      if (!hasPrinters) {
        return Promise.reject({
          code: 2004,
          message: translate('noPrinter'),
        });
      }
      // TECH DEBT: First of his kind, printer of brother, summons bluetooth connectivity
      if (
        props.printerConfig.brand === 'brother' &&
        props.printerConfig.connection === 'bluetooth'
      ) {
        const firstPrinter = props.printers.at(0);
        label.printerInfo = { model: firstPrinter?.name, serial: firstPrinter?.id };
      }
      const printer = findPrinter(props.printerConfig, props.printers, label);
      if (!printer) {
        return Promise.reject({
          code: 2004,
          overrideToast: true,
          override: {
            type: ToastTypes.ERROR,
            txt1: translate('noPrinterInfo') + label.name,
            txt2: translate('contact'),
          },
        });
      }

      switch (props.printerConfig.brand) {
        case 'brother':
        case 'bixolon':
        case 'bixolonupos':
        case 'zebra': {
          if (!currUser || !contextState.customerId) {
            return Promise.reject('This should never happen');
          }

          const labelTraits = {
            ...label,
            size: labelSize,
          };
          const matchedTemplates = templates.filter(
            (template) => !template.criteria || isMatch(labelTraits, template.criteria)
          );
          if (matchedTemplates.length === 0) {
            return Promise.reject({
              code: 9001,
              message: 'Could not find template',
            });
          }

          const targetTemplate = matchedTemplates.reduce((reduced, template) => {
            if (
              template.criteria &&
              Object.keys(template.criteria).length >
                Object.keys(reduced.criteria ?? {}).length
            ) {
              return template;
            }
            return reduced;
          });
          const locs = contextState.locations || [];
          const selectedLocationName =
            (locs.find((l: any) => l?.id === contextState.locationId)?.locationName) ??
            (locs.find((l: any) => l?.locationId === contextState.locationId)?.locationName) ??
            '';

          const lookupDictionary = {
            ...label,
            ...TECH_DEBT.EXTRA_TEMPLATE_IDENTIFIERS[0]?.(label, currUser),
            ...TECH_DEBT.EXTRA_TEMPLATE_IDENTIFIERS[contextState.customerId]?.(
              label,
              currUser
            ),
            nutrition: label.nutrition,
            notes: label.notes,
            prepTime: label.prepTime,
            shift: label.shift,
            lotNumber: label.lotNumber,
            instructions: label.instructions,
            referenceId: label.referenceId,
            status: label.status,
            signature: label.signature,
            locationName: selectedLocationName,
          };
          Object.entries(lookupDictionary).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim().toLowerCase() === 'custom') {
              (lookupDictionary as unknown as Record<string, string | number | undefined>)[key] = '';
            }
          });
          console.log('[print] context.locationId =', contextState.locationId, '; locationName =', selectedLocationName);

          const labelData = templateProcessor(
            targetTemplate.content,
            lookupDictionary
          ).repeat(label.count);

          if (props.printerConfig.connection === 'ble') {
            return blePrint(
              printer.id,
              printer as Printer<ZebraBLEPrinterExtra>,
              labelData
            );
          } else {
            const extra = { modelName: printer.name };
            return nativePrintLabel(
              { ...props.printerConfig, extra },
              printer.id,
              decodeEscapedCharacters(labelData)
            );
          }
        }
      }
    },
    [
      props.printerConfig,
      props.printers,
      props.isSearching,
      contextState.customerId,
      currUser,
      labelSize,
      templates,
    ]
  );

  const printLabel = useCallback(
    async (label: PrintLabel) => {
      if (props.printerConfig.connection === 'bluetooth') {
        await handleCheckBluetoothPermission();
      }

      showToast({
        type: ToastTypes.INFO,
        txt1: `Printing ${label.name}...`,
      });

      try {
        const message = await _printLabel(label);
        showToast({
          type: ToastTypes.SUCCESS,
          txt1: translate('printingSuccess'),
          txt2: message.join(','),
        });

        recordPrintedLabels([label]);
      } catch (e) {
        const printerError = e as PrinterError;
        if (printerError.code === 1002) {
          // No printer found error
          console.debug('Printer metric', {
            metric: 'no_printers_on_print',
            value: 1,
            tags: { ...omit(props.printerConfig, 'extra') },
          });
        } else {
          console.error(JSON.stringify(printerError));
        }
        const toastError = printerToastErrorFromCode[printerError.code];

        if (printerError.overrideToast && printerError.override) {
          showToast({ ...printerError.override });
        } else if (toastError) {
          showToast({ ...toastError });
        } else {
          showToast({
            type: ToastTypes.ERROR,
            txt1: translate('notPrint'),
            txt2: translate('tryAgain')
          });
        }

        return Promise.reject(e);
      }
    },
    [props.printerConfig, _printLabel, recordPrintedLabels]
  );

  const printCart = useCallback(
    async (labels: PrintLabel[]): Promise<[PrintLabel[], PrintLabel[]]> => {
      const succeeded: PrintLabel[] = [];
      const failed: PrintLabel[] = [];
      showToast({
        type: ToastTypes.INFO,
        txt1: translate('printingQueue')
      });

      type ReturnType = [PrinterError | null, PrintLabel];

      const printedLabels = await labels.reduce<Promise<ReturnType[]>>(
        async (accP, label) => {
          const acc = await accP;
          try {
            //TECH DEBT: This clone deep is here because the print cart comes from redux, and in the case of brother bluetooth, the object needs to be modified to print the label, and that isn't allowed when it originates from the redux state (its protected, and an error gets thrown, so you can't use the print queue with a brother bluetooth printer without this hack.)
            const tempLabel = cloneDeep(label);
            await _printLabel(tempLabel);
            acc.push([null, label] as ReturnType);
          } catch (e) {
            acc.push([e as PrinterError, label] as ReturnType);
          }
          return acc;
        },
        Promise.resolve([])
      );

      printedLabels.forEach(([error, label]) => {
        if (error) {
          failed.push(label);
        } else {
          succeeded.push(label);
        }
      });
      return [succeeded, failed];
    },
    [_printLabel]
  );

  return useMemo(
    () => ({
      printLabel: printLabel,
      printCart: printCart,
      recordPrintedLabels: recordPrintedLabels,
    }),
    [printLabel, printCart, recordPrintedLabels]
  );
};
