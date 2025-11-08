import { useMemo } from 'react'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import useSWR from 'swr'
import useSWRMutation, { type MutationFetcher } from 'swr/mutation'
import { API_URLF_LABELS_ITEM_GET_DETAILS, API_URL_LABELS_ITEM_SET_DETAILS } from '../../api/constants'

import {
  createBlankItemForForm,
  mapConfiguredItemToFormValues,
  mapFormValuesToConfiguredItem,
  type ConfiguredItem,
  type ItemFormValues,
  type ConfiguredItemUpdate,
  type ConfiguredItemUpdateOptions,
  type NumericString,
} from './item'

type UseItemProps = {
  itemId?: number
  customerId?: NumericString | ''
}

type UseItemResponse = {
  initialValues: ItemFormValues
  save: (formValues: ItemFormValues, updateOptions: ConfiguredItemUpdateOptions) => Promise<ConfiguredItem>
  error: unknown
  isLoading: boolean
}

const updateItemDetails: MutationFetcher<ConfiguredItem, string, ConfiguredItemUpdate> = async (url, { arg }) => {
  return await api
    .withAuth()
    .url(url)
    .post(arg)
    .json()
    .then(api.zjson)
    .then((resp) => resp.data as ConfiguredItem)
}

export const useItem = (props: UseItemProps): UseItemResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading } = useSWR<ConfiguredItem>(
    API_URLF_LABELS_ITEM_GET_DETAILS(props.itemId),
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
  const { trigger } = useSWRMutation(API_URL_LABELS_ITEM_SET_DETAILS, updateItemDetails)

  return useMemo(() => {
    if (!props.itemId || !data) {
      const customerId = props.customerId ? parseInt(props.customerId, 10) : undefined
      return {
        initialValues: createBlankItemForForm(customerId),
        save: (formValues: ItemFormValues, updateOptions: ConfiguredItemUpdateOptions) =>
          trigger(mapFormValuesToConfiguredItem(formValues, updateOptions)),
        error,
        isLoading,
      }
    }

    return {
      initialValues: mapConfiguredItemToFormValues(data),
      save: (formValues: ItemFormValues, updateOptions: ConfiguredItemUpdateOptions) =>
        trigger(mapFormValuesToConfiguredItem(formValues, updateOptions)),
      error,
      isLoading,
    }
  }, [props.itemId, props.customerId, data, trigger, error, isLoading])
}
