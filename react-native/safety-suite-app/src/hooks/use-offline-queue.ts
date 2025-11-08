import { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { identity } from 'lodash';

import {
  addToQueue,
  removeMultipleFromQueue,
  updateInflightInQueue,
  updateRetriesInQueue,
} from '../../store/slices/offlineQueue';
import { State } from '../../store/types/store-types';
import { QueueItem } from '../../store/slices/offlineQueue';

export type ProcessState = 'idle' | 'syncing' | 'error';

export function useOfflineQueue() {
  const dispatch = useDispatch();
  const online = useSelector((state: State) => state.context.online);
  const queuedItems = useSelector((state: State) => state.offlineQueue.queue);
  const [processState, setProcessState] = useState<ProcessState>('idle');

  const addToOfflineQueue = useCallback(
    <T>(item: QueueItem<T>) => {
      dispatch(addToQueue(item));
    },
    [dispatch]
  );

  const nonInflightQueueItems = useMemo(() => {
    return queuedItems.filter((item) => !item.inflight);
  }, [queuedItems]);

  const processOfflineQueue = useCallback(
    async <T>(
      processItems: (
        items: QueueItem<T>[]
      ) => Promise<{ successes: QueueItem<T>['id'][]; failures: QueueItem<T>['id'][] }>,
      predicate: (item: QueueItem<T>) => boolean = identity
    ) => {
      if (online && nonInflightQueueItems.length > 0 && processState !== 'syncing') {
        setProcessState('syncing');
        try {
          const items = (nonInflightQueueItems as QueueItem<T>[]).filter(predicate);
          dispatch(updateInflightInQueue({ ids: items.map((i) => i.id) }));

          // Process all items in a single batch
          const processedIds = await processItems(items);
          if (processedIds.successes.length > 0) {
            dispatch(removeMultipleFromQueue({ ids: processedIds.successes }));
          }
          if (processedIds.failures.length > 0) {
            dispatch(updateRetriesInQueue({ ids: processedIds.failures }));
          }
          setProcessState('idle');
        } catch (error) {
          console.error('Error processing offline queue:', error);
          setProcessState('error');
        }
      }
    },
    [dispatch, online, nonInflightQueueItems, processState]
  );

  return useMemo(
    () => ({
      addToOfflineQueue,
      processOfflineQueue,
      processState,
      online,
    }),
    [addToOfflineQueue, processOfflineQueue, processState, online]
  );
}
