import { useMemo } from 'react'
import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher } from '../../api/api'
import { API_URL_DIGIPREP_CATEGORY_GET_OPTIONS } from '../../api/constants'
import useSWR from 'swr'
import type { AllOptions } from './category'

export const useCategoryOptions = () => {
  const { authState } = useAuthContext()
  const { data, error, isLoading } = useSWR<AllOptions>(API_URL_DIGIPREP_CATEGORY_GET_OPTIONS, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  return useMemo(
    () => ({
      optionsPerCustomer: data ?? {},
      error,
      isLoading,
    }),
    [data, error, isLoading]
  )
}
