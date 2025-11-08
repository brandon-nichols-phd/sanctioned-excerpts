import moment from 'moment'
import { emptyFilterComponentsState } from '../../filter-bar/filters.api'
import {
  InboundOverviewSensor,
  InboundOverviewSensorData,
  InboundSensorAction,
  ReducedSensorAction,
  SensorAlertCriticality,
  SensorCategory,
  SensorDataType,
  SensorDataTypeEnum,
  SensorDataTypeUnitType,
  SensorDataUnitEnum,
  SensorDataUnitType,
  SensorGridItem,
  SensorsOverviewPayload,
  SensorTemperatureUnit,
} from './sensor-types'
import { Time, time } from '../../../webapp-lib/pathspot-react'
import { isNumber } from 'lodash'

export const celsiusToFarenheit = (tc: number, sf = 100) => Math.round((tc * 1.8 + 32) * sf) / sf
export const farenheitToCelsus = (tf: number, sf = 100) => Math.round((tf - 32) * (5 / 9) * sf) / sf

export const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value)
}
export const toNullNumericArray = (dataVector: Array<unknown>): Array<number | null> => {
  return dataVector.map((value) => (isFiniteNumber(value) ? value : null))
}
export const isSensorDataTypeKey = (key: string): key is SensorDataType => {
  return key in SensorDataTypeEnum
}
export const isSensorDataUnit = (key: string): key is SensorDataUnitType => {
  return Object.keys(SensorDataUnitEnum).some((dataKey) => dataKey.toLowerCase() === key.toLowerCase())
}
export const getSensorDataUnit = (key: string): SensorDataUnitType => {
  const unitKey = Object.keys(SensorDataUnitEnum).find((dataKey) => dataKey.toLowerCase() === key.toLowerCase())
  return unitKey ? (unitKey as SensorDataUnitType) : 'C'
}

export const convertDataPointToUnit = <T extends SensorDataType>(
  dataType: T,
  dataValue: number | null,
  currentUnit: SensorDataUnitType | null,
  targetUnit: SensorDataUnitType | null
): number | null => {
  // It is feasible that datatypes other than temperature will require the ability to convert unit types, so this function accepts any data type

  if (dataType.includes('TEMPERATURE')) {
    if (currentUnit === 'C' && targetUnit === 'F') {
      return isFiniteNumber(dataValue) ? celsiusToFarenheit(dataValue) : null
    } else if (currentUnit === 'F' && targetUnit === 'C') {
      return isFiniteNumber(dataValue) ? farenheitToCelsus(dataValue) : null
    }
  }
  // For now, if not temperature, just clean the array by overwriting any value that isn't null or a real, finite number
  return isFiniteNumber(dataValue) ? dataValue : null
}

export const convertDataSeriesToUnit = <T extends SensorDataType>(
  dataType: T,
  dataVector: Array<number | null>,
  currentUnit: SensorDataUnitType | null,
  targetUnit: SensorDataUnitType | null
): Array<number | null> => {
  // It is feasible that datatypes other than temperature will require the ability to convert unit types, so this function accepts any data type

  if (dataType.includes('TEMPERATURE')) {
    if (currentUnit === 'C' && targetUnit === 'F') {
      return dataVector.map((value) => (isFiniteNumber(value) ? celsiusToFarenheit(value) : null))
    } else if (currentUnit === 'F' && targetUnit === 'C') {
      return dataVector.map((value) => (isFiniteNumber(value) ? farenheitToCelsus(value) : null))
    }
  }
  // For now, if not temperature, just clean the array by overwriting any value that isn't null or a real, finite number
  return toNullNumericArray(dataVector)
}

export const getDynamicRemFontSize = (text: string, baseFontSize = 1.0, minFontSize = 0.5, baselineCharLimit = 18) => {
  const length = text.length
  // If text is within nominal limit, use base font size
  if (length <= baselineCharLimit) return `${baseFontSize}rem`
  // Scale down font size based on excess characters
  const scaleFactor = 0.05
  const scaledSize = baseFontSize - (length - baselineCharLimit) * scaleFactor
  // Ensure the font size does not go below the minimum
  return `${Math.max(scaledSize, minFontSize)}rem`
}

export const stringToMoment = (momentString: string | Time | null, timeFormat: string = time.timeZoneFull) =>
  moment(momentString, timeFormat)
export const initSensorOverviewFiltersState = () => {
  return {
    ...emptyFilterComponentsState,
  }
}

export const initSensorFiltersState = (currentUserEmail: string) => {
  const startDate = currentUserEmail === 'demo@null.com' ? moment('2022-07-14') : moment().subtract(3, 'days')
  const endDate = currentUserEmail === 'demo@null.com' ? moment('2022-08-14') : moment()
  const currentDelta = endDate.diff(startDate)
  return {
    ...emptyFilterComponentsState,
    dateRange: {
      start: startDate,
      end: endDate,
      delta: currentDelta,
    },
  }
}

export const getCategoryFromSensorTag = (sensor: InboundOverviewSensor, tags: Array<SensorCategory>) => {
  const sensorTag = sensor.tag && sensor.tag.length > 0 ? sensor.tag[0] : null
  if (sensorTag) {
    const tagValue = tags.find((catVal: SensorCategory) => sensorTag === catVal)
    return tagValue ? tagValue : 'No Category'
  }
  return 'No Category'
}

export const getAlertState = (temperatureValue: string | number, temperatureMax: number | null, temperatureMin: number | null) => {
  temperatureMax = typeof temperatureMax === 'number' ? temperatureMax : null
  temperatureMin = typeof temperatureMin === 'number' ? temperatureMin : null
  temperatureValue = typeof temperatureValue === 'number' ? temperatureValue : parseFloat(temperatureValue)

  if (temperatureMax != null) {
    if (temperatureValue > temperatureMax) {
      return true
    }
  }
  if (temperatureMin != null) {
    if (temperatureValue < temperatureMin) {
      return true
    }
  }
  return false
}

export const reduceSensorDisplayValue = (value: number, sf = 10) => {
  const newValue = Math.round(value * sf) / sf
  if (newValue || newValue === 0) {
    return newValue
  }
  return '--'
}

export const getCategoryListFromSensorTags = (sensorData: SensorsOverviewPayload) => {
  const tagsSet = new Set<string>()

  sensorData.sensors.forEach((sensor) => {
    if (Array.isArray(sensor.tag)) {
      sensor.tag.forEach((tag) => tagsSet.add(tag))
    }
  })
  const tags = Array.from(tagsSet)
  return tags
}

export const formatSensorOverviewPayload = (
  data: SensorsOverviewPayload
): { formattedSensorData: Array<SensorGridItem>; sensorCategories: Array<SensorCategory> } => {
  const { sensors, sensorData, actionData } = data
  const storedFavorites = localStorage.getItem('storedSensorFavorites')
  const sensorCategories = getCategoryListFromSensorTags(data)
  const formattedSensorData = sensors.reduce((sensorArray: Array<SensorGridItem>, sensor: InboundOverviewSensor) => {
    const currentSensorData = sensorData.filter((datum: InboundOverviewSensorData) => datum.sensorId === sensor.sensorId)
    const currentAlertData: ReducedSensorAction[] = actionData
      .filter((alert: InboundSensorAction) => alert.sensorId === sensor.sensorId)
      .map((alertMatch: InboundSensorAction) => ({ ...alertMatch, limitUnit: getSensorDataUnit(alertMatch.dataType) }))
    const primaryDatum = currentSensorData.find((datum: InboundOverviewSensorData) => datum.dataType === sensor.reportDataType)
    const primaryAlerts = currentAlertData.filter((alert: InboundSensorAction) => alert.dataType === sensor.reportDataType)
    // Note: We don't care about units yet, everything is stored in the DB as Celsius if temperature, so unitless comparisons are okay at this stage as this is merely reducing the payload, prior to any preference adjustments
    const primaryMaxValueExceptions =
      primaryDatum && primaryAlerts.length
        ? primaryAlerts.map((alert) => (isFiniteNumber(alert.highLimit) ? primaryDatum.sensorValue > alert.highLimit : false))
        : []
    const primaryMinValueExceptions =
      primaryDatum && primaryAlerts.length
        ? primaryAlerts.map((alert) => (isFiniteNumber(alert.lowLimit) ? primaryDatum.sensorValue < alert.lowLimit : false))
        : []
    const category = getCategoryFromSensorTag(sensor, sensorCategories)
    const newSensor: SensorGridItem = {
      ...sensor,
      data: currentSensorData,
      actions: currentAlertData,
      isFavorited: storedFavorites && storedFavorites.length > 0 && storedFavorites.includes(sensor.sensorId) ? true : false,
      primaryDataCurrent: primaryDatum,
      primaryDataOutOfAlertsRange: primaryAlerts.map((_, idx) => !!(primaryMaxValueExceptions[idx] || primaryMinValueExceptions[idx])),
      primaryDataAlerts: primaryAlerts,
      actionsOnAlert: currentAlertData.filter((alertItem: InboundSensorAction) => alertItem.taIsOor),
      sensorGridKey: `${sensor.locationId}-${sensor.locationName}-${category}-${sensor.sensorName}-${sensor.sensorId}`,
      category,
    }
    return newSensor.tag ? [...sensorArray, newSensor] : [...sensorArray]
  }, [] as Array<SensorGridItem>)
  return { formattedSensorData, sensorCategories }
}

export const convertOverviewDataIfTemperature = (sensorData: InboundOverviewSensorData, desiredUnit: SensorTemperatureUnit) => {
  const primaryDataType = sensorData.dataType
  if (primaryDataType === 'TEMPERATURE' || primaryDataType === 'TEMPERATURE_SECONDARY') {
    if (sensorData.sensorUnit === 'C' && desiredUnit === 'F') {
      sensorData.sensorValue = celsiusToFarenheit(sensorData.sensorValue, 10)
      sensorData.sensorUnit = 'F'
    } else if (sensorData.sensorUnit === 'F' && desiredUnit === 'C') {
      sensorData.sensorValue = farenheitToCelsus(sensorData.sensorValue, 10)
      sensorData.sensorUnit = 'C'
    }
  }
  return sensorData
}

export const convertTemperatureSensorGridItems = (
  desiredUnit: SensorTemperatureUnit,
  overviewDataArray: SensorGridItem[]
): SensorGridItem[] => {
  const newSensorArray: Array<SensorGridItem> = overviewDataArray.map((sensor: SensorGridItem) => {
    if (sensor.primaryDataCurrent) {
      sensor.primaryDataCurrent = convertOverviewDataIfTemperature(sensor.primaryDataCurrent, desiredUnit)
    }
    sensor.data.forEach((sensorDatum: InboundOverviewSensorData) => {
      convertOverviewDataIfTemperature(sensorDatum, desiredUnit)
    })
    return sensor
  })
  return newSensorArray
}

export const getHighestCriticalityItem = <T extends { criticality: SensorAlertCriticality }>(arrayToSort: T[]): T | undefined => {
  const criticalityPriority = ['HIGH', 'MEDIUM', 'LOW'] as const
  const action = criticalityPriority.map((priority) => arrayToSort.find((action) => action.criticality === priority)).find(Boolean)
  return action
}

export const sortByCriticality = <T extends { criticality: SensorAlertCriticality }>(
  arrayToSort: T[],
  direction: 'forward' | 'reverse' = 'forward'
): T[] => {
  if (direction === 'reverse') {
    const reverseCriticalityPriority: Record<SensorAlertCriticality, number> = {
      HIGH: 2,
      MEDIUM: 1,
      LOW: 0,
    }
    return [...arrayToSort].sort((a, b) => reverseCriticalityPriority[a.criticality] - reverseCriticalityPriority[b.criticality])
  }
  const criticalityPriority: Record<SensorAlertCriticality, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  }
  return [...arrayToSort].sort((a, b) => criticalityPriority[a.criticality] - criticalityPriority[b.criticality])
}
