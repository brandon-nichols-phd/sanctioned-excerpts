import { useMemo } from 'react'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher } from '../../api/api'
import { API_URL_LABELS_ORDER_GET_OPTIONS } from '../../api/constants'
import useSWR from 'swr'

import type { AllOptions } from './order'

type UseLabelOrderOptionsResponse = AllOptions & {
  isLoading: boolean
}

export const useLabelOrderOptions = (): UseLabelOrderOptionsResponse => {
  const { authState } = useAuthContext()
  const { data, isLoading } = useSWR<AllOptions>(API_URL_LABELS_ORDER_GET_OPTIONS, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  return useMemo(() => {
    return {
      customers: data?.customers ?? [],
      materials: data?.materials ?? [],
      isLoading,
    }
  }, [data, isLoading])
}
