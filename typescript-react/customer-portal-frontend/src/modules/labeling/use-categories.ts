import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import useSWRMutation, { MutationFetcher } from 'swr/mutation'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { API_URL_LABELS_CATEGORY_GET_ALL, API_URL_LABELS_CATEGORY_SET_ACTIVE } from '../../api/constants'
import {
  mapExpandedItemCategoryToTableRow,
  PHASE_FLATTENED_KEY_PREFIX,
  type PhaseKey,
  type AllExpandedCategories,
  type CategoryForTable,
} from './item'

type UseCategoriesResponse = {
  itemsForTable: CategoryForTable[]
  extraColumnsForTable: Record<string, string>
  isLoading: boolean
  error: unknown
  toggleActiveStatus: (categoryId: number) => void
}

const updateCategoryActive: MutationFetcher<unknown, string, { categoryId: number; active: boolean }> = async (url, { arg }) => {
  return await api.withAuth().url(url).post(arg).json().then(api.zjson)
}

export const useCategories = (): UseCategoriesResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading, mutate } = useSWR<AllExpandedCategories>(
    API_URL_LABELS_CATEGORY_GET_ALL,
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
  const { trigger } = useSWRMutation(API_URL_LABELS_CATEGORY_SET_ACTIVE, updateCategoryActive)

  const { rows, phases } = useMemo(() => {
    return (data ?? []).reduce(
      (accum, expandedCategory) => {
        const categoryForTable = mapExpandedItemCategoryToTableRow(expandedCategory)

        accum.rows.push(categoryForTable)

        // Collect all the phases being used.
        Object.keys(categoryForTable)
          .filter((key) => key.indexOf(PHASE_FLATTENED_KEY_PREFIX) === 0 && !Object.hasOwn(accum.phases, key))
          .forEach((key) => (accum.phases[key] = key.substring(PHASE_FLATTENED_KEY_PREFIX.length)))

        return accum
      },
      { rows: [] as CategoryForTable[], phases: {} as Record<string, string> }
    )
  }, [data])

  const toggleActiveStatus = useCallback(
    (categoryId: number) => {
      if (!data) {
        return
      }

      const targetCategoryIndex = data.findIndex((category) => category.id === categoryId)
      const targetCategory = data[targetCategoryIndex]
      const newActiveStatus = !targetCategory?.active
      const newCategory = ({
        ...targetCategory,
        active: newActiveStatus,
        ...(!newActiveStatus && { itemsCount: 0 }),
      }) as AllExpandedCategories[number];
      const newDataList = [...data]
      newDataList.splice(targetCategoryIndex, 1, newCategory)

      mutate(newDataList, { revalidate: false })
      trigger({ categoryId, active: newActiveStatus })
    },
    [data, mutate, trigger]
  )

  return useMemo(() => {
    // We purposely add any remaining phase to all the items for normalization purposes.
    // This has the added benefit of allowing those columns to be sortable by the CDataTable component.
    const phasesKeys = Object.keys(phases)
    rows.forEach((row) => {
      phasesKeys.forEach((phaseKey) => {
        if (!Object.hasOwn(row, phaseKey)) {
          row[phaseKey as PhaseKey] = null
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
