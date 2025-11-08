import { useMemo } from 'react'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import useSWR from 'swr'
import useSWRMutation, { type MutationFetcher } from 'swr/mutation'
import { API_URLF_LABELS_CATEGORY_GET_DETAILS, API_URL_LABELS_CATEGORY_SET_DETAILS } from '../../api/constants'

import {
  type CategoryUpdateOptions,
  type CategoryFormValues,
  type CategoryUpdate,
  createBlankCategoryForForm,
  mapFormValuesToCategory,
  mapCategoryToFormValues,
  type CategoryDetails,
  type AllOptions,
  type NumericString,
} from './item'

type UseCategoryProps = {
  categoryId?: number
  customerId?: NumericString | ''
  options: AllOptions
}

type UseCategoryResponse = {
  initialValues: CategoryFormValues
  save: (formValues: CategoryFormValues, updateOptions: CategoryUpdateOptions) => Promise<CategoryDetails>
  error: unknown
  isLoading: boolean
}

const updateCategoryDetails: MutationFetcher<CategoryDetails, string, CategoryUpdate> = async (url, { arg }) => {
  return await api
    .withAuth()
    .url(url)
    .post(arg)
    .json()
    .then(api.zjson)
    .then((resp) => resp.data as CategoryDetails)
}

export const useCategory = (props: UseCategoryProps): UseCategoryResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading } = useSWR<CategoryDetails>(
    API_URLF_LABELS_CATEGORY_GET_DETAILS(props.categoryId),
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
  const { trigger } = useSWRMutation(API_URL_LABELS_CATEGORY_SET_DETAILS, updateCategoryDetails)

  return useMemo(() => {
    if (!props.categoryId || !data) {
      const customerId = props.customerId ? parseInt(props.customerId, 10) : undefined
      return {
        initialValues: createBlankCategoryForForm(props.options, customerId),
        save: (formValues: CategoryFormValues, updateOptions: CategoryUpdateOptions) =>
          trigger(mapFormValuesToCategory(formValues, updateOptions)),
        error,
        isLoading,
      }
    }

    return {
      initialValues: mapCategoryToFormValues(data),
      save: (formValues: CategoryFormValues, updateOptions: CategoryUpdateOptions) =>
        trigger(mapFormValuesToCategory(formValues, updateOptions)),
      error,
      isLoading,
    }
  }, [props.categoryId, props.customerId, props.options, data, trigger, error, isLoading])
}
