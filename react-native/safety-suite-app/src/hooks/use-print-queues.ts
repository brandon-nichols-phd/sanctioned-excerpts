import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getPrintQueues } from '../../api/labels';
import { defaultParams } from '../../api/utils';
import { State } from '../../store/types/store-types';
import {
  LabelConfig,
  Label,
  PrintLabel,
  PrintQueue,
  getExpirationDate,
  getPrintLabel,
  ExpirationTypes,
} from '../data/label';

export type Return = {
  fetchingQueues: boolean;
  queues: PrintQueue[];
  fetchQueues: () => void;
  getQueueLabels: (queueId: number) => PrintLabel[];
};

export const usePrintQueues = () => {
  const [printQueueList, setPrintQueueList] = useState<PrintQueue[]>([]);
  const fetchStatus = useRef({ isRunning: false });

  const contextState = useSelector((state: State) => state.context);
  const currUser = useSelector((state: State) => state.user.currUser);

  const callFetch = useCallback(() => {
    if (fetchStatus.current.isRunning || !currUser?.id) {
      return;
    }

    fetchStatus.current.isRunning = true;
    const requestParams = defaultParams(contextState, currUser);

    if (!requestParams) {
      setPrintQueueList([]);
      fetchStatus.current.isRunning = false;
      return;
    }

    getPrintQueues(requestParams)
      .then((resp) => {
        if (resp?.data) {
          setPrintQueueList(resp.data);
        } else {
          setPrintQueueList([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching print queues:', err);
      })
      .finally(() => {
        fetchStatus.current.isRunning = false;
      });
    // we only want this to trigger on context.locationId
    // instead all of context state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextState.locationId, currUser?.id]);

  useEffect(() => {
    if (contextState.online) {
      callFetch();
    }
  }, [callFetch, contextState.online]);

  /**
   *
   * @param selectedQueue - queue id
   */
  const getQueueLabels = useCallback(
    (queueId: number): PrintLabel[] | null => {
      const tqueue: PrintQueue | undefined = printQueueList.find((q) => q.id === queueId);
      if (!tqueue) {
        return null;
      }

      // We are hardcoding for now
      const dontSubtract =
        contextState.customerId !== null &&
        [1144,1150,1625,1629,1630,1631,1619,1692].includes(contextState.customerId);

      const printableLabels: PrintLabel[] = tqueue.contents_doc.reduce(
        (plabels: PrintLabel[], labelConfig: LabelConfig) => {
          const newDate = getExpirationDate(
            labelConfig.expiration_type,
            labelConfig.expiration_type,
            dontSubtract,
            labelConfig.custom_date
          );
          const expirationAdditionalDate = getExpirationDate(
            labelConfig.expiration_additional,
            labelConfig.expiration_additional,
            dontSubtract,
            labelConfig.custom_date
          );

          const label = mapQueueApiToLabel(labelConfig);

          plabels.push(
            getPrintLabel(
              label,
              labelConfig.count,
              labelConfig.description,
              labelConfig.context,
              labelConfig.expiration_type,
              {
                id: labelConfig.phase_id,
                templateId: labelConfig.template_id,
                printerInfo: labelConfig.printer_info,
                useAllExpirations: labelConfig.use_all_expirations,
              },
              newDate,
              labelConfig.expiration,
              labelConfig.expiration_format,
              expirationAdditionalDate,
              labelConfig.expiration_additional,
              labelConfig.expiration_additional_format,
              labelConfig.use_all_expirations
            )
          );
          return plabels;
        },
        []
      );
      return printableLabels;
    },
    [printQueueList, contextState.customerId]
  );

  return useMemo(
    () => ({
      fetchingQueues: fetchStatus.current.isRunning,
      queues: printQueueList,
      fetchQueues: callFetch,
      getQueueLabels: getQueueLabels,
    }),
    [printQueueList, getQueueLabels, callFetch]
  );
};

/** maps partial print label data that comes from queue document obj */
const mapQueueApiToLabel = (labelConfig: LabelConfig): Label => {
  return {
    id: `${labelConfig.item_name}-${labelConfig.category_name}`,
    itemId: labelConfig.item_id,
    name: labelConfig.item_name,
    count: labelConfig.count,
    categoryId: labelConfig.category_id,
    category: labelConfig.category_name,
    phases: [
      {
        id: labelConfig.phase_id,
        name: labelConfig.context,
        templateId: labelConfig.template_id,
        printerInfo: labelConfig.printer_info,

        // Dummy Phase values.
        expiration: ExpirationTypes.DEFAULT,
        tabbed: false,
        expirationCustom: false,
        expirationAdditional: labelConfig.expiration_additional,
        expirationFormat: labelConfig.expiration_format,
        expirationAdditionalFormat: labelConfig.expiration_additional_format,
        useAllExpirations: labelConfig.use_all_expirations,

        //new values for configured doc
        optionalFields: {
          nutrition: labelConfig.nutrition,
          notes: labelConfig.notes,
          prepTime: labelConfig.prep_time,
          shift: labelConfig.shift,
          lotNumber: labelConfig.lot_number?.toString(),
          instructions: labelConfig.instructions,
          referenceId: labelConfig.reference_id?.toString(),
          status: labelConfig.status,
          signature: labelConfig.signature,
        },
      },
    ],
    code: labelConfig.code ?? null,
    description: labelConfig.description,
    ingredients: labelConfig.ingredients,

    // Dummy Label values.
    configuredItemId: 0,
    allergen: '',
    textColor: '',
    colorBackground: '',
  };
};
