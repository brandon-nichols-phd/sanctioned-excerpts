import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import useSWRMutation, { MutationFetcher } from 'swr/mutation'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { API_URL_DIGIPREP_CATEGORY_GET_ALL, API_URL_DIGIPREP_CATEGORY_TOGGLE_ACTIVE } from '../../api/constants'
import { Category, CategoryForTable, mapCategoryToTableRow } from './category'

type UseCategoriesResponse = {
  categoriesForTable: CategoryForTable[]
  isLoading: boolean
  error: unknown
  toggleActiveStatus: (categoryId: number) => void
}

const updateCategoryActive: MutationFetcher<unknown, string, { categoryId: number; active: boolean }> = async (url, { arg }) => {
  return await api.withAuth().url(url).post(arg).json().then(api.zjson)
}

export const useCategories = (): UseCategoriesResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading, mutate } = useSWR<Category[]>(API_URL_DIGIPREP_CATEGORY_GET_ALL, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const { trigger } = useSWRMutation(API_URL_DIGIPREP_CATEGORY_TOGGLE_ACTIVE, updateCategoryActive)

  const rows = useMemo(() => {
    if (data) {
      return data.map(mapCategoryToTableRow)
    }
    return []
  }, [data])

  const toggleActiveStatus = useCallback(
    (categoryId: number) => {
      const categoryIndex = data?.findIndex((category) => category.id === categoryId) ?? -1
      if (categoryIndex === -1 || !data) {
        return
      }
      const category = data[categoryIndex] as Category
      const newCategory = { ...category, active: !category.active }
      const newData = [...data]
      newData[categoryIndex] = newCategory
      mutate(newData, { revalidate: false })
      trigger({ categoryId, active: newCategory.active })
    },
    [data, mutate, trigger]
  )

  return useMemo(
    () => ({
      categoriesForTable: rows,
      error,
      isLoading,
      toggleActiveStatus,
    }),
    [rows, error, isLoading, toggleActiveStatus]
  )
}
