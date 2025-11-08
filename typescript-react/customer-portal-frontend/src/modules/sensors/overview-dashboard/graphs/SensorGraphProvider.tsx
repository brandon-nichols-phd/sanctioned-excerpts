import { SyntheticEvent, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { SensorDataType, SensorGridItem } from '../../api/sensor-types'
import React from 'react'
import { SensorGraphData, SensorGraphDataSparsity } from './sensor-graphs.types'
import { ContextFilterState, FilteredDashboards } from '../../../filter-bar/filters-bar.types'
import { useSensorGraphData } from './use-sensor-graph-data'
import { useLocation } from 'react-router-dom'
import { selectFiltersBar, FiltersBarDispatch, FiltersBarActions } from '../../../../redux/store'
import useAppDispatch from '../../../../redux/useAppDispatch'
import useAppSelector from '../../../../redux/useAppSelector'
import FiltersBar from '../../../filter-bar/FiltersBar'
import { emptyContextFilterState, coalesceFilterBarState, reconcileFilterBarState } from '../../../filter-bar/filters.api'
import LoadingSpinner from '../../../generic/LoadingSpinner'
import { initSensorFiltersState } from '../../api/sensor-api.api'
import queryString from 'query-string'
import useAuthContext from '../../../../api/authentication/useAuthContext'
import { getFiltersForSensorGraph } from './graphDataFetcher'

export enum GraphContext {
  sensorItemGraph = 'sensorItemGraph',
  sensorItemAlertSuppression = 'sensorItemAlertSuppression',
}

export type SensorGraphContextType = {
  dataTypeContext: SensorDataType | null
  sparsityContext: SensorGraphDataSparsity
  sensorData: SensorGraphData | null
  graphData: SensorGraphData | null
  cardData: SensorGridItem
  isLoading: boolean
  handleTabChange: (event: SyntheticEvent, value: SensorDataType) => void
}

export const SensorGraphContext = React.createContext<SensorGraphContextType | undefined>(undefined)

type SensorGraphProviderProps = {
  children: React.ReactNode
  cardData: SensorGridItem
}
const pageFilterContext = FilteredDashboards.SensorsModal

export const SensorGraphProvider: React.FC<SensorGraphProviderProps> = ({ cardData, children }) => {
  const { currentUser } = useAuthContext()

  const [dataTypeContext, setDataTypeContext] = useState<SensorDataType | null>(null)
  const [sparsityContext, setSparsityContext] = useState<SensorGraphDataSparsity>('RAW')
  const [graphData, setGraphData] = useState<SensorGraphData | null>(null)
  const globalFilterBarState = useAppSelector(selectFiltersBar)
  const updateGlobalFilterBarState = useAppDispatch()
  const [filtersBarChanged, setFiltersBarChanged] = useState<boolean>(false)
  const parsedQueryParams = queryString.parse(useLocation().search)
  const [isFetching, setIsFetching] = useState<boolean>(true)
  const [pageFilterState, setPageFilterState] = useState<ContextFilterState>({ ...emptyContextFilterState })
  const {
    isLoading,
    rawGraphData: sensorData,
    primaryContext,
  } = useSensorGraphData({ filtersState: pageFilterState, sensorCardData: cardData })
  // console.debug('Card data in render of sensor graph provider is: ', cardData)

  const fetchFilters = useCallback(async () => {
    const defaultFilterState = initSensorFiltersState(currentUser.userEmail)
    const filterObjects = {
      defaultFilterState,
      parsedQueryParams,
      getFiltersForPage: getFiltersForSensorGraph,
      pageFilterContext: pageFilterContext,
    }
    setIsFetching(true)
    const coalescedFilters = await coalesceFilterBarState(globalFilterBarState, filterObjects)
    if (!coalescedFilters.buttonVisible) {
      coalescedFilters.buttonVisible = true
    }
    if (coalescedFilters.filtersState.context === pageFilterContext) {
      updateGlobalFilterBarState({ type: FiltersBarDispatch[FiltersBarActions.setFilterBarState], payload: { ...coalescedFilters } })
    }
    setPageFilterState(coalescedFilters.filtersState)
    setIsFetching(false)
  }, [])

  useLayoutEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  useLayoutEffect(() => {
    if (globalFilterBarState.filtersState.context === pageFilterContext) {
      const coalescedFilters = reconcileFilterBarState(globalFilterBarState, pageFilterContext)
      updateGlobalFilterBarState({ type: FiltersBarDispatch[FiltersBarActions.setFilterBarState], payload: { ...coalescedFilters } })
      setPageFilterState(coalescedFilters.filtersState)
    }
  }, [filtersBarChanged])

  // Initially set tab to report data type
  useEffect(() => {
    if (dataTypeContext === null && !isLoading && primaryContext !== null) {
      setDataTypeContext(primaryContext)
    }
  }, [dataTypeContext, isLoading, primaryContext])

  const handleTabChange = useCallback((event: SyntheticEvent, value: SensorDataType) => {
    setDataTypeContext(value)
  }, [])
  // console.debug('In sensor graph provider, primaryContext, sensorData is: ', { primaryContext, sensorData })
  return (
    <SensorGraphContext.Provider
      value={{
        sensorData,
        graphData,
        cardData,
        dataTypeContext,
        sparsityContext,
        isLoading,
        handleTabChange,
      }}
    >
      <div>
        {isFetching === false ? (
          <FiltersBar
            keyContext={FilteredDashboards.Sensors}
            filtersBarChanged={filtersBarChanged}
            setFiltersBarChanged={setFiltersBarChanged}
            globalFiltersState={{ ...pageFilterState }}
            filterBarVisible={globalFilterBarState.barVisible}
            setCustomerSelection={undefined}
          />
        ) : (
          <LoadingSpinner message={'Fetching Sensor Filters...'} />
        )}
      </div>
      {children}
    </SensorGraphContext.Provider>
  )
}

export const useSensorGraphs = (): SensorGraphContextType => {
  const context = useContext(SensorGraphContext)
  if (!context) {
    throw new Error('Sensor graph context not defined.')
  }
  return context
}
