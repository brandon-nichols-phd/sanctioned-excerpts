import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import useSWRMutation, { MutationFetcher } from 'swr/mutation'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { API_URL_LABELS_ITEM_GET_ALL, API_URL_LABELS_ITEM_SET_ACTIVE } from '../../api/constants'
import { mapConfiguredItemToTableRows, PHASE_FLATTENED_KEY_PREFIX, type ItemForTable, type AllConfiguredItems, type PhaseKey } from './item'

type UseItemsResponse = {
  itemsForTable: ItemForTable[]
  extraColumnsForTable: Record<string, string>
  isLoading: boolean
  error: unknown
  toggleActiveStatus: (itemId: number) => void
}

const updateItemActive: MutationFetcher<unknown, string, { itemId: number; active: boolean }> = async (url, { arg }) => {
  return await api.withAuth().url(url).post(arg).json().then(api.zjson)
}

export const useItems = (): UseItemsResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading, mutate } = useSWR<AllConfiguredItems>(API_URL_LABELS_ITEM_GET_ALL, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const { trigger } = useSWRMutation(API_URL_LABELS_ITEM_SET_ACTIVE, updateItemActive)

  const { rows, phases } = useMemo(() => {
    return Array.from(Object.values(data ?? {})).reduce(
      (accum, confItem) => {
        const itemsForTable = mapConfiguredItemToTableRows(confItem)

        accum.rows.push(...itemsForTable)

        // Collect all the phases being used.
        itemsForTable
          .flatMap((itemForTable) => Object.keys(itemForTable))
          .filter((key) => key.indexOf(PHASE_FLATTENED_KEY_PREFIX) === 0 && !Object.hasOwn(accum.phases, key))
          .forEach((key) => (accum.phases[key] = key.substring(PHASE_FLATTENED_KEY_PREFIX.length)))

        return accum
      },
      { rows: [] as ItemForTable[], phases: {} as Record<string, string> }
    )
  }, [data])

  const toggleActiveStatus = useCallback(
    (itemId: number) => {
      if (!data) {
        return
      }

      const targetConfiguredItem = data[itemId]
      const newActiveStatus = !targetConfiguredItem!.item.active
      const newConfiguredItem = {
        ...targetConfiguredItem,
        item: {
          ...targetConfiguredItem!.item,
          active: newActiveStatus,
        },
      }
      const newDataList = { ...data, [itemId]: newConfiguredItem }

      mutate(newDataList as AllConfiguredItems, { revalidate: false });
      trigger({ itemId, active: newActiveStatus })
    },
    [data, mutate, trigger]
  )

  return useMemo(() => {
    // We purposely add any remaining phase to all the items for normalization purposes.
    // This has the added benefit of allowing those columns to be sortable by the CDataTable component.
    const phasesKeys = Object.keys(phases)
    rows.forEach((item) => {
      phasesKeys.forEach((phaseKey) => {
        if (!Object.hasOwn(item, phaseKey)) {
          item[phaseKey as PhaseKey] = null
        }
      })
    })

    return {
      itemsForTable: rows,
      extraColumnsForTable: phases,
      error,
      isLoading,
      toggleActiveStatus,
    }
  }, [rows, phases, error, isLoading, toggleActiveStatus])
}
