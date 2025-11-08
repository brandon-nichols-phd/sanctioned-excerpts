import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import useSWRMutation, { MutationFetcher } from 'swr/mutation'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { API_URL_DIGIPREP_ITEM_GET_ALL, API_URL_DIGIPREP_ITEM_TOGGLE_ACTIVE } from '../../api/constants'
import { Item, ItemForTable, mapItemToTableRows } from './item'

type UseItemsResponse = {
  itemsForTable: ItemForTable[]
  isLoading: boolean
  error: unknown
  toggleActiveStatus: (itemId: number) => void
}

const updateItemActive: MutationFetcher<unknown, string, { itemId: number; active: boolean }> = async (url, { arg }) => {
  return await api.withAuth().url(url).post(arg).json().then(api.zjson)
}

export const useItems = (): UseItemsResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading, mutate } = useSWR<Item[]>(API_URL_DIGIPREP_ITEM_GET_ALL, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const { trigger } = useSWRMutation(API_URL_DIGIPREP_ITEM_TOGGLE_ACTIVE, updateItemActive)

  const rows = useMemo(() => {
    if (data) {
      return data.map(mapItemToTableRows)
    }
    return []
  }, [data])

  const toggleActiveStatus = useCallback(
    (itemId: number) => {
      const itemIndex = data?.findIndex((item) => item.id === itemId) ?? -1
      if (itemIndex === -1 || !data) {
        return
      }
      const item = data[itemIndex] as Item
      const newItem = { ...item, active: !item.active }
      const newData = [...data]
      newData[itemIndex] = newItem
      mutate(newData, { revalidate: false })
      trigger({ itemId, active: newItem.active })
    },
    [data, mutate, trigger]
  )

  return useMemo(
    () => ({
      itemsForTable: rows,
      error,
      isLoading,
      toggleActiveStatus,
    }),
    [rows, error, isLoading, toggleActiveStatus]
  )
}
