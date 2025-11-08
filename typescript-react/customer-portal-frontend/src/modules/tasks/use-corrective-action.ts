import { useMemo } from 'react'
import useSWR from 'swr'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher } from '../../api/api'
import { API_URLF_TASKS_GET_CA } from '../../api/constants'
import { CorrectiveAction } from './data/task'

type UseCorrectiveActionProps = {
  customerId: number
}

type UseCorrectiveActionResponse = {
  correctiveActions: CorrectiveAction[] | undefined
  isLoading: boolean
  error: unknown
}

export const useCorrectiveAction = (props: UseCorrectiveActionProps): UseCorrectiveActionResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading } = useSWR<CorrectiveAction[]>(
    API_URLF_TASKS_GET_CA(props.customerId),
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  return useMemo(
    () => ({
      correctiveActions: data,
      error,
      isLoading,
    }),
    [data, error, isLoading]
  )
}
