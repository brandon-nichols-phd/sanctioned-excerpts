import { isNumber } from 'lodash'
import {
  convertDataPointToUnit,
  convertDataSeriesToUnit,
  getSensorDataUnit,
  isFiniteNumber,
  isSensorDataTypeKey,
  toNullNumericArray,
} from '../../api/sensor-api.api'
import {
  SensorDataType,
  SensorDataTypeEnum,
  SensorGridItem,
  SensorDataUnitEnum,
  SensorDataUnitType,
  InboundSensorAction,
  SensorLimitType,
  SensorAlertCriticality,
  ReducedSensorAction,
} from '../../api/sensor-types'
import {
  SensorDataTrace,
  SensorGraphAlertDataSeries,
  SensorGraphAlertSparsitySeries,
  SensorGraphDataPayload,
  SensorGraphDataSeries,
  SensorGraphDataSparsity,
  SensorGraphDataSparsityEnum,
  SensorGraphPayloadSeries,
  SensorGraphBaseSeries,
  SensorGraphSparsitySeries,
  SensorTimeDomain,
  SensorGraphAlertBound,
  SensorGraphAlertThresholdLineType,
  SensorGraphAlertExceededLineType,
} from './sensor-graphs.types'

export const reduceSensorGraphDataPayload = (
  payloadData: SensorGraphDataPayload,
  cardData: SensorGridItem
): SensorGraphDataSeries | null => {
  const datasets: Array<[SensorDataType, SensorGraphPayloadSeries]> = Object.entries(payloadData)
    .filter(([key]) => isSensorDataTypeKey(key))
    .map(([key, value]) => [key as SensorDataType, value as SensorGraphPayloadSeries])
  if (datasets.length > 0) {
    const rawGraphData: SensorGraphDataSeries<SensorDataType, SensorGraphDataSparsity> = datasets.reduce(
      (dataSeriesSet: SensorGraphDataSeries<SensorDataType, SensorGraphDataSparsity>, [payloadKey, payloadValue]) => {
        if (isSensorDataTypeKey(payloadKey)) {
          const sensorDataType: SensorDataType = payloadKey as SensorDataType
          const sensorDataVectorRaw = payloadValue.data.length ? toNullNumericArray(payloadValue.data) : []
          const matchedCardData = cardData.data.find((datum) => datum.dataType === sensorDataType)
          //If there isn't matching data within the card, just use the unit the data shipped with --- the card may not have the corresponding unit due to differences in the dates that are sampled by default for the graphs vs. the overview cards.
          const targetUnit = matchedCardData ? getSensorDataUnit(matchedCardData.sensorUnit) : getSensorDataUnit(payloadValue.unit)
          const currentUnit = getSensorDataUnit(payloadValue.unit)
          const sensorDataVector = matchedCardData
            ? convertDataSeriesToUnit(sensorDataType, sensorDataVectorRaw, currentUnit, targetUnit)
            : [...sensorDataVectorRaw]
          const finiteValues: number[] = sensorDataVector.filter(isFiniteNumber)
          //Temperature data always fetched in C, so convert if necessary
          if (targetUnit) {
            const dataTrace: SensorDataTrace = {
              dataType: sensorDataType,
              values: sensorDataVector,
              unit: targetUnit,
              max: Math.max(...finiteValues),
              min: Math.min(...finiteValues),
            }
            const timeValues = payloadValue.timeEpoch
            const start = timeValues[timeValues.length - 1]
            const end = timeValues[0]
            const domain: SensorTimeDomain = {
              values: timeValues,
              unit: 's',
              interval: {
                start: isFiniteNumber(start) ? start : NaN,
                end: isFiniteNumber(end) ? end : NaN,
                duration: isFiniteNumber(start) && isFiniteNumber(end) ? end - start : NaN,
                unit: 's',
              },
              gapIntervals: [],
            }
            dataSeriesSet[sensorDataType] = {
              [SensorGraphDataSparsityEnum.RAW]: {
                trace: dataTrace,
                domain,
                length: dataTrace.values.length,
              },
            }
          }
        }
        return dataSeriesSet
      },
      {}
    )

    return rawGraphData
  }
  return null
}

export const seriesInRange = (limit: number, limitType: SensorGraphAlertBound, dataSeries: SensorGraphBaseSeries): boolean | null => {
  if (dataSeries.trace.values.length > 0) {
    const lastDataValue = dataSeries.trace.values[dataSeries.length]
    if (isFiniteNumber(lastDataValue)) {
      if (limitType === 'Max' && lastDataValue > limit) return false
      if (limitType === 'Min' && lastDataValue < limit) return false
      // if (limitType === 'setpoint' && lastDataValue !== limit) return false
      return true
    }
  }
  return null
}

export const generateLimitSeries = (
  rawLimit: number,
  limitType: SensorGraphAlertBound,
  alertItem: ReducedSensorAction,
  dataSeries: SensorGraphBaseSeries,
  sparsityTarget: SensorGraphDataSparsity
): SensorGraphAlertSparsitySeries | null => {
  try {
    if (dataSeries.trace.dataType !== alertItem.dataType) {
      throw new Error(`Datatype mismatch when generating alert lines...`)
    }
  } catch (e) {
    console.error('Exception occured: ', e)
    return null
  }
  if (!isFiniteNumber(rawLimit)) {
    return null
  }
  const limit = convertDataPointToUnit(alertItem.dataType, rawLimit, alertItem.limitUnit, dataSeries.trace.unit)
  if (isFiniteNumber(limit)) {
    const traceValues = Array(dataSeries.length).fill(limit) //create limit line using length of corresponding data and limit value
    const trace: SensorDataTrace = {
      dataType: alertItem.dataType,
      values: traceValues,
      unit: dataSeries.trace.unit,
      max: limit,
      min: limit,
    }
    const domain: SensorTimeDomain = { ...dataSeries.domain }
    const alertCriticality = alertItem.criticality.toUpperCase() as SensorAlertCriticality

    const alertSeries: SensorGraphAlertSparsitySeries = {
      [sparsityTarget]: {
        trace,
        domain,
        length: dataSeries.length,
      },
      criticality: alertCriticality as SensorAlertCriticality,
      alertStartWhen: alertItem.taAlertStartWhen?.epoch || null,
      consumedWhen: alertItem.taConsumedWhen?.epoch || null,
      duration: alertItem.duration,
      recurrence: alertItem.recurrence,
      limitValue: limit,
      limitUnit: dataSeries.trace.unit,
      limitType,
      sensorActionId: alertItem.saId ? alertItem.saId : '',
      limitTypeIndex: 0, //this can't be set until all alerts are reviewed, so default to 0
    }
    return { ...alertSeries }
  }
  return null
}

export const getAlertTypeIndex = (
  alertLineTypeCountMap: Partial<Record<SensorGraphAlertThresholdLineType, number>>,
  alertCriticality: SensorAlertCriticality,
  limitType: SensorGraphAlertBound
): number => {
  const alertLineType = getSensorGraphAlertLineType(alertCriticality, limitType)
  const alertLineTypeCount = alertLineTypeCountMap[alertLineType]
  if (isNumber(alertLineTypeCount)) {
    alertLineTypeCountMap[alertLineType] = alertLineTypeCount + 1
  } else {
    alertLineTypeCountMap[alertLineType] = 1
  }
  return alertLineTypeCountMap[alertLineType] || 0
}

export const generateGraphAlertSeries = (
  sensorCard: SensorGridItem,
  sensorGraphData: SensorGraphDataSeries,
  sparsityTarget: SensorGraphDataSparsity
): SensorGraphAlertDataSeries => {
  const alertLineTypeCountMap: Partial<Record<SensorGraphAlertThresholdLineType, number>> = {}

  const alertLines = sensorCard.actions.reduce((alertLineObject: SensorGraphAlertDataSeries, alertItem: ReducedSensorAction) => {
    const dataType: SensorDataType = alertItem.dataType

    const dataSeries = sensorGraphData[dataType]?.[sparsityTarget]
    if (dataSeries) {
      if (!alertLineObject[dataType]) {
        alertLineObject[dataType] = []
      }
      if (alertItem.highLimit !== null) {
        const maxAlertSeries = generateLimitSeries(alertItem.highLimit, 'Max', alertItem, dataSeries, sparsityTarget)
        if (maxAlertSeries !== null) {
          maxAlertSeries.limitTypeIndex = getAlertTypeIndex(alertLineTypeCountMap, maxAlertSeries.criticality, 'Max')
          alertLineObject[dataType]?.push(maxAlertSeries)
        }
      }
      if (alertItem.lowLimit !== null) {
        const minAlertSeries = generateLimitSeries(alertItem.lowLimit, 'Min', alertItem, dataSeries, sparsityTarget)
        if (minAlertSeries !== null) {
          minAlertSeries.limitTypeIndex = getAlertTypeIndex(alertLineTypeCountMap, minAlertSeries.criticality, 'Min')

          alertLineObject[dataType]?.push(minAlertSeries)
        }
      }
    }
    return alertLineObject
  }, {} as SensorGraphAlertDataSeries)
  return alertLines
}

export const getSensorGraphAlertLineType = <C extends SensorAlertCriticality, B extends SensorGraphAlertBound>(
  criticality: C,
  bound: B
): SensorGraphAlertThresholdLineType<C, B> => {
  return `Alert: ${criticality} (${bound})`
}
export const getSensorGraphAlertExceededLineType = <C extends SensorAlertCriticality, B extends SensorGraphAlertBound>(
  criticality: C,
  bound: B
): SensorGraphAlertExceededLineType<C, B> => {
  return `Alert Exceeded: ${criticality} (${bound})`
}

type SequenceResult = {
  indices: number[]
  duration: number
}

export const getMinDurationIntervals = (
  timeData: number[], // seconds since epoch
  sensorData: Array<number | null>, // sensor values with possible nulls
  intervalThreshold: number // threshold in seconds
): (number | null)[] => {
  const results: SequenceResult[] = []
  let currentStartIndex: number | null = null
  const returnData = new Array<null | number>(sensorData.length).fill(null)
  sensorData.forEach((value, idx) => {
    const isEnd = idx === sensorData.length - 1 || value === null
    if (currentStartIndex === null) {
      // Not currently in a sequence, check if this starts one
      if (!isEnd) currentStartIndex = idx
    } else {
      // In a sequence
      if (isEnd) {
        const start = currentStartIndex
        const end = idx - 1
        const timeStart = timeData[start]
        const timeEnd = timeData[end]
        const duration = isNumber(timeStart) && isNumber(timeEnd) ? timeEnd - timeStart : -1
        if (duration >= intervalThreshold) {
          const indices = Array.from({ length: end - start + 1 }, (_, k) => start + k)
          results.push({ indices, duration })
          for (let j = start; j <= end; j++) {
            returnData[j] = sensorData[j] || null
          }
        }

        currentStartIndex = null // Reset for next sequence
      }
    }
  })
  return returnData
}

export const layoutOrderedDataTypes: Array<SensorDataType> = ['TEMPERATURE', 'TEMPERATURE_SECONDARY', 'HUMIDITY', 'BATTERY', 'RSSI']

export const getAllowedLayoutOrderedSensorDataTypes = (isPathSpotUser: boolean) => {
  return isPathSpotUser
    ? layoutOrderedDataTypes
    : layoutOrderedDataTypes.filter((item) => item.includes('TEMPERATURE') || item.includes('HUMIDITY'))
}
