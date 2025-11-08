import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { SensorDataType, SensorGridItem } from '../../api/sensor-types'
import { isUndefinedFiltersDisplayState } from '../../../filter-bar/filters.api'
import { graphDataFetcher } from './graphDataFetcher'
import { ContextFilterState } from '../../../filter-bar/filters-bar.types'
import { SensorGraphAlertDataSeries, SensorGraphData } from './sensor-graphs.types'
import { generateGraphAlertSeries } from './sensor-graphs.api'

type SensorGraphDataHookProps = {
  filtersState: ContextFilterState
  sensorCardData: SensorGridItem | null
}
type UseSensorGraphDataReturn = {
  isLoading: boolean
  rawGraphData: SensorGraphData | null
  primaryContext: SensorDataType | null
  error: unknown
}

export const useSensorGraphData = ({ filtersState, sensorCardData }: SensorGraphDataHookProps): UseSensorGraphDataReturn => {
  const [primaryContext, setPrimaryContext] = useState<SensorDataType | null>(null)

  const {
    data: payloadGraphData,
    isLoading,
    error,
  } = useSWR(
    () =>
      sensorCardData?.sensorId && !isUndefinedFiltersDisplayState(filtersState.display)
        ? [`graph-data-${sensorCardData.sensorId}`, filtersState.selections]
        : null,
    () => graphDataFetcher(filtersState.selections, sensorCardData?.sensorId || null, sensorCardData),
    {
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  )

  // Compute primary context only once if dependencies match
  useEffect(() => {
    const context = sensorCardData?.reportDataType || null
    setPrimaryContext(context)
  }, [sensorCardData, sensorCardData?.reportDataType])

  const rawGraphData = useMemo((): SensorGraphData | null => {
    if (!payloadGraphData || !sensorCardData) return null

    const alertLines: SensorGraphAlertDataSeries = generateGraphAlertSeries(sensorCardData, payloadGraphData, 'RAW')
    return {
      cardInfo: { ...sensorCardData },
      series: { ...payloadGraphData },
      alertLines,
    }
  }, [sensorCardData, payloadGraphData])

  return {
    isLoading,
    rawGraphData,
    primaryContext,
    error,
  }
}
