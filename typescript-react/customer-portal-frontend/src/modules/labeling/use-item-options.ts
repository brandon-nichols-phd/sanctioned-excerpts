import { useMemo } from 'react'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher } from '../../api/api'
import { API_URL_LABELS_ITEM_GET_OPTIONS } from '../../api/constants'
import useSWR from 'swr'

import type { AllOptions } from './item'

type UseItemResponse = {
  optionsPerCustomer: AllOptions
  error: unknown
  isLoading: boolean
}

export const useItemOptions = (): UseItemResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading } = useSWR<AllOptions>(API_URL_LABELS_ITEM_GET_OPTIONS, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  return useMemo(() => {
    return {
      optionsPerCustomer: data ?? {},
      error,
      isLoading,
    }
  }, [data, error, isLoading])
}
