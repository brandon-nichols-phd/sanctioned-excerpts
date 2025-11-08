import { useCallback, useMemo } from 'react'
import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import useSWR from 'swr'
import useSWRMutation, { type MutationFetcher } from 'swr/mutation'
import { kebabCase } from 'lodash'

import {
  API_URL_DIGITAL_PREP_ITEM_GET_DETAILS,
  API_URL_DIGITAL_PREP_ITEM_GET_UPLOAD,
  API_URL_DIGITAL_PREP_ITEM_SET_DETAILS,
} from '../../api/constants'
import { ItemFormValues, type ConfiguredItem, SavePayload, mapFormValuesToPayload, createEmptyConfig } from './item'

type UseItemProps = {
  itemId?: number
  customerId: string
}

type UseItemResponse = {
  initialValues: ItemFormValues
  save: (formValues: ItemFormValues, image: File | null) => Promise<ConfiguredItem>
  error: unknown
  isLoading: boolean
}

type UploadResponse = {
  url: string
  fields: Record<string, string>
}

const updateItemDetails: MutationFetcher<ConfiguredItem, string, SavePayload> =
  async (url, { arg }) => {
    const resp = await api.withAuth().url(url).post(arg).json().then(api.zjson);
    return (resp as { data: ConfiguredItem }).data;
  };

export const useItem = (props: UseItemProps): UseItemResponse => {
  const { authState } = useAuthContext()
  const { data, error, isLoading } = useSWR<ConfiguredItem>(
    props.itemId ? API_URL_DIGITAL_PREP_ITEM_GET_DETAILS(props.itemId) : null,
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
  const { trigger } = useSWRMutation(API_URL_DIGITAL_PREP_ITEM_SET_DETAILS, updateItemDetails)

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    try {
      // Get pre-signed URL
      const presignedResponse = await api
        .withAuth()
        .url(API_URL_DIGITAL_PREP_ITEM_GET_UPLOAD)
        .post({
          filename: file.name,
          contentType: file.type,
        })
        .json<UploadResponse>() // tell TS what you expect
        .then(api.zjson as <T>(x: T) => T);

      const { url, fields } = presignedResponse;
      // Create FormData for upload
      const formData = new FormData()
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(kebabCase(key), value)
      })
      formData.append('file', file)

      // Upload to S3
      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Return the final URL of the uploaded image
      return fields.key ?? ''
    } catch (error) {
      throw new Error('Failed to upload image')
    }
  }, [])

  const saveWithImage = useCallback(
    async (formValues: ItemFormValues, imageFile: File | null) => {
      // If there's an image file, upload it first
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile)
        formValues.picture = imageUrl
      }

      return trigger(mapFormValuesToPayload(formValues))
    },
    [trigger, uploadImage]
  )

  const initialValues = useMemo((): ItemFormValues => {
    if (!props.itemId || !data) {
      return {
        itemId: 0,
        description: '',
        active: true,
        customerId: parseInt(props.customerId, 10),
        categories: [],
        locationIds: null,
        picture: null,
        stackingType: 'by_id',
        configuredDoc: { '0': createEmptyConfig() },
      }
    }

    return {
      itemId: data.itemId,
      description: data.item.description,
      active: data.active,
      customerId: data.customerId,
      categories: data.categories.map((cat) => ({ label: cat.name, value: cat.id.toString() })),
      locationIds: data.locations,
      picture: data.picture,
      stackingType: data.stackingType,
      configuredDoc: data.configuredDoc,
    }
  }, [data, props.itemId, props.customerId])

  return useMemo(() => {
    return {
      initialValues,
      save: saveWithImage,
      error,
      isLoading,
    }
  }, [initialValues, saveWithImage, error, isLoading])
}
