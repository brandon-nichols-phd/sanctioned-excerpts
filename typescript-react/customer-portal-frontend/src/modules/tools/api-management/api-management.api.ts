import { api } from '../../../api/api'
import { API_URL_API_MANAGEMENT } from '../../../api/constants'

export const generateAPIAccessToken = async ({ ...values }) => {
  return await api
    .withAuth()
    .url(`${API_URL_API_MANAGEMENT}`)
    .post({ ...values })
    .json()
  //.then(api.zjson)
}

export const getAccessTokens = async () => {
  return await api.withAuth().url(`${API_URL_API_MANAGEMENT}`).get().json().then(api.zjson)
}

export const updateAccessTokens = async (values: any) => {
  const { id, ...rest } = values
  return await api
    .withAuth()
    .url(`${API_URL_API_MANAGEMENT}/${id}`)
    .post({ ...rest })
    .json()
    .then(api.zjson)
}
