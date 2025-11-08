import { useMemo } from 'react'
import useSWR from 'swr'
import useSWRMutation, { type MutationFetcher } from 'swr/mutation'

import { API_URL_DIGITAL_PREP_CATEGORY_GET_DETAILS, API_URL_DIGITAL_PREP_CATEGORY_SET_DETAILS } from '../../api/constants'
import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { CategoryFormValues, AllOptions } from './category'

type Category = {
  id: number
  name: string
  active: boolean
  customerId: number
  locationId: number | null
  order: number
  color: string
}

type UseCategoryProps = {
  categoryId?: number
  customerId?: string | ''
  options: AllOptions
}

type UseCategoryResponse = {
  initialValues: CategoryFormValues
  save: (formValues: CategoryFormValues, options?: { categoryId?: number }) => Promise<Category>
  error: unknown
  isLoading: boolean
}

type SavePayload = {
  id?: number
  name: string
  customerId: number
  locationId: number | null
  order: number
  color: string
  active: boolean
}

const updateCategoryDetails: MutationFetcher<Category, string, SavePayload> = async (url, { arg }) => {
  return await api
    .withAuth()
    .url(url)
    .post(arg)
    .json()
    .then(api.zjson)
    .then((resp) => resp.data as Category)
}

export const useCategory = (props: UseCategoryProps): UseCategoryResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading } = useSWR<Category>(
    props.categoryId ? API_URL_DIGITAL_PREP_CATEGORY_GET_DETAILS(props.categoryId) : null,
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
  const { trigger } = useSWRMutation(API_URL_DIGITAL_PREP_CATEGORY_SET_DETAILS, updateCategoryDetails)

  const initialValues = useMemo(() => {
    if (!props.categoryId || !data) {
      return {
        name: '',
        active: true,
        customerId: props.customerId ? parseInt(props.customerId, 10) : 0,
        locationId: null,
        order: 0,
        color: '#000000',
      }
    }

    return {
      id: data.id,
      name: data.name,
      active: data.active,
      customerId: data.customerId,
      locationId: data.locationId,
      order: data.order,
      color: data.color,
    }
  }, [data, props.categoryId, props.customerId])

  const mapFormValuesToPayload = (values: CategoryFormValues): SavePayload => {
    return {
      ...(values.id && { id: values.id }),
      name: values.name,
      customerId: values.customerId,
      locationId: values.locationId,
      order: values.order,
      color: values.color,
      active: values.active,
    }
  }

  return useMemo(() => {
    return {
      initialValues,
      save: (values: CategoryFormValues) => trigger(mapFormValuesToPayload(values)),
      error,
      isLoading,
    }
  }, [initialValues, trigger, error, isLoading])
}
