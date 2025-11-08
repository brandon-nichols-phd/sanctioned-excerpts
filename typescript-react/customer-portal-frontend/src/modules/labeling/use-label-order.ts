import { useMemo } from 'react'
import { api } from '../../api/api'
import useSWRMutation, { type MutationFetcher } from 'swr/mutation'
import { API_URL_LABELS_ORDER_SET_DETAILS } from '../../api/constants'
import { AllOptions, LabelOrderFormValues, LabelOrderRequest, createBlankOrderForForm, mapFormValuesToLabelOrder } from './order'

type UseLabelOrderProps = {
  customers: AllOptions['customers']
}

type UseLabelOrderResponse = {
  initialValues: LabelOrderFormValues
  request: (formValues: LabelOrderFormValues) => Promise<string>
}

const requestLabelOrder: MutationFetcher<string, string, LabelOrderRequest> = async (url, { arg }) => {
  return await api
    .withAuth()
    .url(url)
    .post(arg)
    .json()
    .then(api.zjson)
    .then((resp) => resp.data as string)
}

export const useLabelOrder = (props: UseLabelOrderProps): UseLabelOrderResponse => {
  const { trigger } = useSWRMutation(API_URL_LABELS_ORDER_SET_DETAILS, requestLabelOrder)

  return useMemo(() => {
    const availableCustomers = Object.values(props.customers)
    const singleCustomerId = availableCustomers.length === 1 ? availableCustomers[0]!.id : undefined

    return {
      initialValues: createBlankOrderForForm(singleCustomerId),
      request: (formValues: LabelOrderFormValues) => trigger(mapFormValuesToLabelOrder(formValues)),
    }
  }, [props.customers, trigger])
}
