import wretch from 'wretch'

import { unzipb64Payload } from '../webapp-lib/pathspot-react'

import { ApiPayload, UnzippedPayload } from './api.types'

const controller = new AbortController()
export const abortController = controller

const w = wretch()
  .content('application/json')
  .catcher('AbortError', (err) => {
    //throw err;
  })
  .catcher('Error', (err) => {
    console.error('Error occured: ', err)
    throw err
  })
  .catcher('TypeError', (err) => {
    console.error('TypeError occured: ', err)
    throw err
  })
  .catcher(400, (err) => {
    console.error('400 Error occured - Access token not valid. ', err)
    throw err
  })
  .catcher(401, (err) => {
    console.error('401 Error occured: ', err)
    throw err
  })
  .catcher(500, (err) => {
    console.error('500 Error occured: ', err)
    throw err
  })
  .catcher(504, (err) => {
    console.error('504 Error occured: Failed to fetch due to timeout.', err)
    throw err
  })

export const api = {
  token: '',
  abortController: new AbortController(),

  setToken: function (token: string) {
    this.token = token
  },
  getToken: function () {
    return this.token
  },
  noAuth: function () {
    return w
  },

  withAuth: function () {
    return w.auth(this.token).signal(this.abortController)
  },

  withAuthAndNoSignal: function () {
    return w.auth(this.token)
  },

  abortAllRequests: function () {
    this.abortController.abort()
    this.abortController = new AbortController() //new controller needs to be set up to abort future requests
  },
  zjson<T>(json: ApiPayload<T>): UnzippedPayload<T> {
    if (json.data) {
      const unzippedData = typeof json.data === 'string' ? unzipb64Payload(json.data) : json.data
      return { data: (unzippedData ? unzippedData : json.data) as T }
    }
    return { data: null }
  },
}

export const authFetcher =
  <T>(token: string, decompress = true) =>
  (url: string): Promise<T> =>
    api
      .noAuth()
      .auth(token)
      .url(url)
      .get()
      .json()
      .then((resp) => (decompress ? api.zjson(resp) : resp))
      .then((resp) => resp.data)

export const fetchAndUnzip = async <T>(url: string): Promise<UnzippedPayload<T>> => {
  const payload = await api.withAuth().url(url).get().json<ApiPayload<T>>()
  return api.zjson<T>(payload)
}

export const fetchAndUnzipPOST = async <T, B>(url: string, postBody: B): Promise<UnzippedPayload<T>> => {
  const payload = await api.withAuth().url(url).post(postBody).json<ApiPayload<T>>()
  return api.zjson<T>(payload)
}
