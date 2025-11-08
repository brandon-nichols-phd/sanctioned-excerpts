import { formatSensorOverviewPayload, convertTemperatureSensorGridItems } from './../api/sensor-api.api'
import { fetchSensorOverviewData } from '../api/sensor-requests.api'
import { formatFiltersForDataRequest } from '../../filter-bar/filters.api'
import { SensorGridItem, SensorTemperatureUnit } from '../api/sensor-types'
import { FilterBarComponentsState } from '../../filter-bar/filters-bar.types'

export const updateLocalStorageFavorite = (sensorId: string, isFavorited: boolean) => {
  const storedFavorites = localStorage.getItem('storedSensorFavorites') ?? ''
  const sensorIdStr = `_${sensorId}_`

  if (isFavorited) {
    localStorage.setItem('storedSensorFavorites', storedFavorites + sensorIdStr)
  } else {
    localStorage.setItem('storedSensorFavorites', storedFavorites.replace(sensorIdStr, ''))
  }
}

export const sensorOverviewFetcher = async (
  filters: FilterBarComponentsState,
  tempInC: boolean
): Promise<{
  sensorGridItems: SensorGridItem[]
  sensorCategories: string[]
}> => {
  const formattedFilters = formatFiltersForDataRequest(filters)
  const responseObj = await fetchSensorOverviewData(formattedFilters)
  console.debug('Sensor overview data was fetched. Response object is: ', responseObj)

  if (!responseObj?.data?.sensors.length) {
    return {
      sensorGridItems: [],
      sensorCategories: [],
    }
  }

  const { formattedSensorData, sensorCategories } = formatSensorOverviewPayload(responseObj.data)
  const unit = tempInC ? 'C' : 'F'
  return {
    sensorGridItems: convertTemperatureSensorGridItems(unit, formattedSensorData),
    sensorCategories,
  }
}
