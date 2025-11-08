import { API_URL_GET_FILTERS_FOR_SENSORS_GRAPH, API_URL_SENSORS } from '../../../../api/constants'
import { FiltersObject, stringifyQuery } from '../../../filter-bar/FiltersQueryString'
import { ApiPayload, UnzippedPayload } from '../../../../api/api.types'
import { api, fetchAndUnzip } from '../../../../api/api'
import { FilterBarComponentsState } from '../../../filter-bar/filters-bar.types'
import { formatFiltersForDataRequest } from '../../../filter-bar/filters.api'
import { SensorDataType, SensorGridItem } from '../../api/sensor-types'
import { SensorGraphDataPayload, SensorGraphDataSeries, SensorGraphDataSparsity } from './sensor-graphs.types'
import { reduceSensorGraphDataPayload } from './sensor-graphs.api'

export const getFiltersForSensorGraph = async (): Promise<ApiPayload<unknown>> => {
  const singleSensorFilters = await api.withAuth().url(`${API_URL_GET_FILTERS_FOR_SENSORS_GRAPH}`).get().json().then(api.zjson)
  return singleSensorFilters
}
export const singleSensorDataUrl = (filtersObject: FiltersObject, sensorId: string): string => {
  const stringifiedQuery = stringifyQuery(filtersObject)
  return `${API_URL_SENSORS}/${sensorId}?${stringifiedQuery}`
}
export const fetchSensorTimeSeriesData = async (
  filtersObject: FiltersObject,
  sensorId: string
): Promise<UnzippedPayload<SensorGraphDataPayload>> => {
  const sensorUrl = singleSensorDataUrl(filtersObject, sensorId)
  return fetchAndUnzip<SensorGraphDataPayload>(sensorUrl)
}

export const graphDataFetcher = async (
  filters: FilterBarComponentsState,
  sensorId: string | null,
  cardData: SensorGridItem | null
): Promise<SensorGraphDataSeries<SensorDataType, SensorGraphDataSparsity> | null> => {
  if (sensorId === null) {
    return null
  }
  const formattedFilters = formatFiltersForDataRequest(filters)
  const responseObj = await fetchSensorTimeSeriesData(formattedFilters, sensorId)
  console.debug('Sensor graph data was fetched. Response object is: ', responseObj)

  if (responseObj.data === null || cardData === null) {
    return null
  }

  const sensorGraphData = reduceSensorGraphDataPayload(responseObj.data, cardData)
  return sensorGraphData
}
