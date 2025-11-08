import { useMemo } from 'react'
import { degreesCelsius, degreesFarenheit } from '../../api/sensor-constants'
import { SensorDataType, SensorDataUnitType, SensorGridItem } from '../../api/sensor-types'
import {
  SensorGraphAlertSparsitySeries,
  SensorGraphDataSparsity,
  SensorGraphDisplayAxes,
  SensorGraphDisplayData,
  SensorGraphDisplayDataset,
  SensorGraphDisplayPreferences,
  SensorGraphSparsitySeries,
} from './sensor-graphs.types'
import { isNumber } from 'lodash'
import { getGraphDataDisplayObject } from './graph-display-definitions'
import { isFiniteNumber, sortByCriticality } from '../../api/sensor-api.api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { getMinDurationIntervals, getSensorGraphAlertExceededLineType, getSensorGraphAlertLineType } from './sensor-graphs.api'

dayjs.extend(utc)
dayjs.extend(timezone)

type SensorDisplayConfigProps = {
  dataContext: SensorDataType
  dataSeries?: SensorGraphSparsitySeries
  alertLines?: Array<SensorGraphAlertSparsitySeries>
  displayPreferences: SensorGraphDisplayPreferences
  sparsityTarget: SensorGraphDataSparsity
  cardInfo: SensorGridItem
}

export const SensorDataTypeAxisLabel = new Map<SensorDataType, string>([
  ['TEMPERATURE', 'T'],
  ['TEMPERATURE_SECONDARY', 'Probe T'],
  ['HUMIDITY', 'Humidity'],
  ['BATTERY', 'Battery'],
  ['RSSI', 'Signal RSSI'],
])

const getAxisLabel = (dataType: SensorDataType, unit: SensorDataUnitType): string => {
  if (dataType.includes('TEMPERATURE')) {
    const labelUnit = unit === 'C' ? degreesCelsius : degreesFarenheit
    return `${SensorDataTypeAxisLabel.get(dataType)} (${labelUnit})`
  } else {
    return `${SensorDataTypeAxisLabel.get(dataType)} (${unit})`
  }
}
export const useDataDisplayConfig = ({
  dataContext,
  dataSeries,
  alertLines,
  displayPreferences,
  sparsityTarget,
}: SensorDisplayConfigProps): SensorGraphDisplayData | undefined => {
  const parseDisplayPreferences = (
    displayPreferences: SensorGraphDisplayPreferences,
    displayData: SensorGraphDisplayData,
    alertData: Array<SensorGraphAlertSparsitySeries> | undefined,
    epochData: Array<number>
  ) => {
    if (displayPreferences.useMaxMinLines && alertData) {
      alertData.forEach((alertDatum) => {
        const criticality = alertDatum.criticality
        const limitType = alertDatum.limitType
        const alertLineType = getSensorGraphAlertLineType(criticality, limitType)
        const alertDisplayDataSet: SensorGraphDisplayDataset = getGraphDataDisplayObject(alertLineType, {
          multiAlertIdx: alertDatum.limitTypeIndex,
        })
        const alertDataVector = displayData.labels.map(() => alertDatum.limitValue)
        alertDisplayDataSet.data = alertDataVector

        displayData.datasets.push({ ...alertDisplayDataSet })
      })
    }
    //Check for sensor data values that are out of range
    if (displayPreferences.useAlertOverlay && alertData) {
      const sensorData = displayData.datasets[0]?.data
      if (sensorData) {
        alertData.forEach((alertDatum) => {
          const criticality = alertDatum.criticality
          const limitType = alertDatum.limitType
          const alertLineType = getSensorGraphAlertExceededLineType(criticality, limitType)
          const alertDataVector = sensorData.map((value, idx) => {
            if (limitType === 'Max') {
              return value && value > alertDatum.limitValue ? value : null
            }
            return value && value < alertDatum.limitValue ? value : null
          })
          if (alertDataVector.some((value) => value !== null)) {
            const exceedsDurationAlertData = getMinDurationIntervals(epochData, alertDataVector, alertDatum.duration * 1000)
            if (exceedsDurationAlertData.some((value) => value !== null)) {
              const alertDisplayDataSet: SensorGraphDisplayDataset = getGraphDataDisplayObject(alertLineType, {
                multiAlertIdx: alertDatum.limitTypeIndex,
              })

              alertDisplayDataSet.data = alertDataVector
              displayData.datasets.push({ ...alertDisplayDataSet })
            }
          }
        })
      }
    }
  }

  const displayData: SensorGraphDisplayData | undefined = useMemo(() => {
    const sensorData = dataSeries?.[sparsityTarget]
    const displayUnit = sensorData?.trace.unit
    const alertDataLines = alertLines
      ?.flatMap((alertLine) => (alertLine[sparsityTarget] ? [alertLine] : []))
      ?.sort((a, b) => a.sensorActionId.localeCompare(b.sensorActionId))
    const alertData = alertDataLines ? sortByCriticality(alertDataLines) : undefined
    if (sensorData && displayUnit) {
      const axisLabel = getAxisLabel(dataContext, displayUnit)
      const axisMax = sensorData.trace.max
      const axisMin = sensorData.trace.min
      const axes: SensorGraphDisplayAxes = {
        x: {
          unit: 'DateTime',
          ticks: {
            maxTicksLimit: 10,
            maxRotation: 0,
            minRotation: 0,
          },
          label: 'Date/Time',
          showLabel: true,
          showAxis: true,
        },
        y: {
          unit: displayUnit,
          showAxis: true,
          showLabel: true,
          label: axisLabel,
          ticks: {
            maxTicksLimit: 10,
          },
          lims: {
            // Add ten so graph bounds aren't right at data extrema
            min: isNumber(axisMin) ? axisMin - 10 : 0,
            max: isNumber(axisMax) ? axisMax + 10 : 100,
          },
        },
      }
      const displayDataSet: SensorGraphDisplayDataset = getGraphDataDisplayObject(dataContext)
      const localTimezone = dayjs.tz.guess()
      const zipped = sensorData.trace.values.flatMap((value, idx) => {
        const xVal = sensorData.domain.values[idx]
        if (isFiniteNumber(value) && isFiniteNumber(xVal)) {
          const xValms = xVal * 1000
          return { key: xValms, value: parseFloat(value.toFixed(2)) }
        }
        return []
      })
      //Sort by time
      zipped.sort((a, b) => a.key - b.key)
      displayDataSet.data = zipped.map((item) => item.value)
      const xLabels: Array<[string, string]> = zipped.map((item) => [
        dayjs(item.key).tz(localTimezone).format('M/D/YY'),
        dayjs(item.key).tz(localTimezone).format('h:mm a'),
      ])
      const epochData = zipped.map((item) => item.key)
      if (displayDataSet.legendOptions) {
        displayDataSet.legendOptions.text = SensorDataTypeAxisLabel.get(dataContext)
      }
      const graphDisplayData: SensorGraphDisplayData = {
        labels: xLabels,
        datasets: [displayDataSet],
        axes,
      }

      parseDisplayPreferences(displayPreferences, graphDisplayData, alertData, epochData)

      return { ...graphDisplayData }
    }
  }, [alertLines, dataContext, dataSeries, displayPreferences, sparsityTarget])

  return displayData
}
