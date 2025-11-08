import { api, fetchAndUnzip, fetchAndUnzipPOST } from '../../../api/api'
import {
  API_URL_GET_FILTERS_FOR_SENSORS_GRAPH,
  API_URL_GET_FILTERS_FOR_SENSOR_OVERVIEW,
  API_URL_SENSORS,
  API_URL_SENSORS_PERMISSIONS,
  API_URL_SENSORS_GET_LIST,
  API_URL_SENSORS_GET_MODELS,
  API_URL_SENSORS_USERS_BY_LOCATION,
  API_URL_SENSORS_CRUD,
  API_URL_SENSORS_TEMPLATES,
  API_URL_SENSORS_ALERTS,
  API_URL_SENSORS_GET_UNIT_TYPES,
} from '../../../api/constants'

import { FiltersObject, stringifyQuery } from '../../filter-bar/FiltersQueryString'

import { unzipb64Payload } from '../../../webapp-lib/pathspot-react'
import { isNullOrUndefined } from '../../../webapp-lib/pathspot-react/api/types/type-utils'
import { SensorsOverviewPayload } from './sensor-types'
import { ApiPayload, UnzippedPayload } from '../../../api/api.types'
import { SensorPermType, SensorActionPermType, SensorPerms } from './sensor-types'
import { SensorDetailPayload, SensorDetailsPOSTPayload } from '../crud/containers/SensorDetailContainer'

export const fetchSensorAlertData = async (filtersObject: FiltersObject): Promise<ApiPayload<unknown>> => {
  const stringifiedQuery = stringifyQuery(filtersObject)
  const alertData = await api.withAuth().url(`${API_URL_SENSORS_ALERTS}?${stringifiedQuery}`).get().json().then(api.zjson)
  return alertData
}

//Overview Requests
export const getFiltersForSensorOverview = async (): Promise<ApiPayload<unknown>> => {
  const overviewResponse = await api.withAuth().url(`${API_URL_GET_FILTERS_FOR_SENSOR_OVERVIEW}`).get().json().then(api.zjson)
  return overviewResponse
}
export const fetchSensorOverviewData = async (filtersObject: FiltersObject): Promise<UnzippedPayload<SensorsOverviewPayload> | null> => {
  const stringifiedQuery = `?${stringifyQuery(filtersObject)}`
  try {
    const overviewData = await fetchAndUnzip<SensorsOverviewPayload>(`${API_URL_SENSORS}-overview${stringifiedQuery}`)
    return overviewData.data ? overviewData : null
  } catch (e) {
    console.warn('Sensor data overview request was quit or unsuccessful. ', e)
    return null
  }
}

export const getSensorTableData = async (): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS_GET_LIST}`).get().json().then(api.zjson)
}

export const sensorPermissionsUrl = () => {
  return `${API_URL_SENSORS_PERMISSIONS}`
}

export const sensorModelsUrl = () => {
  return `${API_URL_SENSORS_GET_MODELS}`
}
export const sensorUnitTypeUrl = () => {
  return `${API_URL_SENSORS_GET_UNIT_TYPES}`
}

export const getSensorPermissions = async (): Promise<UnzippedPayload<SensorPerms>> => {
  const perms = fetchAndUnzip<SensorPerms>(`${API_URL_SENSORS_PERMISSIONS}`)
  return perms
}

const getActionType = (perm: SensorPermType): SensorActionPermType => {
  switch (perm) {
    case 'viewSensorsAndActions':
    case 'view_sensors_and_actions':
      return 'viewSensor'
    case 'editSensors':
    case 'edit_sensors':
      return 'editSensor'
    default:
      return 'editAction'
  }
}

const isSensorPermType = (key: string): key is SensorPermType => {
  return ['viewSensorsAndActions', 'view_sensors_and_actions', 'editSensors', 'edit_sensors', 'edit_actions', 'editActions'].includes(key)
}

export const getPermissions = async () => {
  const res = await getSensorPermissions()
  const perms: SensorPerms = {}
  if (res.data === null) {
    return Promise.reject()
  }
  const resObject = res.data

  Object.entries(resObject).forEach(([perm, locations]) => {
    if (isSensorPermType(perm)) {
      // Type guard ensures `perm` is a valid SensorPermType
      const p: SensorActionPermType = getActionType(perm)
      perms[p] = locations
    }
  })
  return perms
}

export const getSensorModels = async (): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS_GET_MODELS}`).get().json().then(api.zjson)
}

export const getSensorUnitTypes = async (): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS_GET_UNIT_TYPES}`).get().json().then(api.zjson)
}

export const sensorByIdUrl = (sensorId: string) => {
  return `${API_URL_SENSORS_CRUD}/${sensorId}`
}

export const usersByLocationIdUrl = (locationId: number) => {
  return `${API_URL_SENSORS_USERS_BY_LOCATION}/${locationId}`
}

export const getReportTemplates = async (): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS_TEMPLATES}`).get().json().then(api.zjson)
}

export const createNewSensor = async (
  sensor: SensorDetailsPOSTPayload
): Promise<ApiPayload<Record<string, SensorDetailPayload> | null>> => {
  const newSensorResponse = await fetchAndUnzipPOST<Record<string, SensorDetailPayload>, SensorDetailsPOSTPayload>(
    API_URL_SENSORS_CRUD,
    sensor
  )

  // api.withAuth().url(`${API_URL_SENSORS_CRUD}`).post(sensor).json().then(api.zjson)
  //#TODO: The return structure for creating a sensor is incorrect on the backend; there is an additional 'data' index
  if (newSensorResponse.data) {
    const newSensorKey = Object.keys(newSensorResponse.data)[0]
    if (!isNullOrUndefined(newSensorKey)) {
      const newSensorInfo = newSensorResponse.data[newSensorKey]
      if (newSensorInfo) {
        return { ...newSensorResponse }
      }
    }
  }
  return Promise.reject()
}

export const editSensor = async (sensorId: string, params: unknown): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS_CRUD}/${sensorId}`).post(params).json().then(api.zjson)
}

export const saveAlertSuppressionRequest = async (sensorId: string, params: unknown): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS}/suppress/${sensorId}`).post(params).json()
}

export const downloadReportPDF = async (userId: string, params: unknown): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS_CRUD}/${userId}`).post(params).json().then(api.zjson)
}

export const fetchSensorDocumentList = async (userId: string, params: unknown): Promise<ApiPayload<unknown>> => {
  return await api.withAuth().url(`${API_URL_SENSORS_CRUD}/${userId}`).post(params).json().then(api.zjson)
}
