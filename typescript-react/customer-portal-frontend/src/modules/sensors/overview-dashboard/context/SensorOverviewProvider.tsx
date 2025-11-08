import { ContextFilterState, FilteredDashboards } from '../../../filter-bar/filters-bar.types'
import { createContext, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { SensorGridItem } from '../../api/sensor-types'
import {
  coalesceFilterBarState,
  emptyContextFilterState,
  isUndefinedFiltersDisplayState,
  reconcileFilterBarState,
  setCurrentFilterStateFromCache,
} from '../../../filter-bar/filters.api'
import useAuthContext from '../../../../api/authentication/useAuthContext'
import useSWR from 'swr'
import { sensorOverviewFetcher } from '../overviewFetcher'
import React from 'react'
import { convertTemperatureSensorGridItems, initSensorOverviewFiltersState } from '../../api/sensor-api.api'
import { useLocation } from 'react-router-dom'
import { selectFiltersBar, FiltersBarDispatch, FiltersBarActions } from '../../../../redux/store'
import useAppDispatch from '../../../../redux/useAppDispatch'
import useAppSelector from '../../../../redux/useAppSelector'
import { getFiltersForSensorOverview } from '../../api/sensor-requests.api'
import queryString from 'query-string'
import FiltersBar from '../../../filter-bar/FiltersBar'
import LoadingSpinner from '../../../generic/LoadingSpinner'

export type SensorOverviewContextType = {
  gridItems: SensorGridItem[] | null
  tempInC: boolean
  onTemperatureUnitToggle: (checked: boolean) => void
  handleFavoriteClick: (sensorItem: SensorGridItem) => void
  isLoading: boolean
  error: unknown
  filtersState: ContextFilterState
  refresh: () => void
  reFocusFilters: () => void
}

export const SensorOverviewContext = createContext<SensorOverviewContextType | undefined>(undefined)

type SensorOverviewProviderProps = {
  children: React.ReactNode
}
const pageFilterContext = FilteredDashboards.Sensors
const defaultFilterState = initSensorOverviewFiltersState()
export const SensorOverviewProvider: React.FC<SensorOverviewProviderProps> = ({ children }) => {
  const { authState } = useAuthContext()
  const globalFilterBarState = useAppSelector(selectFiltersBar)
  const updateGlobalFilterBarState = useAppDispatch()
  const [filtersBarChanged, setFiltersBarChanged] = useState<boolean>(false)
  const parsedQueryParams = queryString.parse(useLocation().search)
  const [isFetching, setIsFetching] = useState<boolean>(true)
  const [pageFilterState, setPageFilterState] = useState<ContextFilterState>({ ...emptyContextFilterState })
  const [reloading, setReloading] = useState<boolean>(false)
  const [tempInC, setTempInC] = useState<boolean>(authState.temperatureInC)

  const { data, isLoading, error, mutate } = useSWR(
    () => (!isUndefinedFiltersDisplayState(pageFilterState.display) ? ['sensor-overview', pageFilterState.selections] : null),
    () => (!isUndefinedFiltersDisplayState(pageFilterState.display) ? sensorOverviewFetcher(pageFilterState.selections, tempInC) : null),
    {
      revalidateOnFocus: true,
      errorRetryCount: 1,
    }
  )
  const fetchFilters = useCallback(async () => {
    const filterObjects = {
      defaultFilterState,
      parsedQueryParams,
      getFiltersForPage: getFiltersForSensorOverview,
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
      setReloading(false)
    }
  }, [filtersBarChanged, updateGlobalFilterBarState])

  const indicateFiltersChanged = useCallback(
    (value: boolean) => {
      if (value !== filtersBarChanged) {
        setReloading(true)
        setFiltersBarChanged(value)
      }
    },
    [filtersBarChanged]
  )

  const reFocusFilters = useCallback(() => {
    // console.debug('YYYYYYYYYYY >>>>>> About to coalesce context change: ', [
    //   globalFilterBarState,
    //   pageFilterState,
    //   pageFilterContext,
    //   defaultFilterState,
    // ])
    // const coalescedFilters = coalesceContextChangeFilterStates(globalFilterBarState, pageFilterContext, pageFilterState, defaultFilterState)
    const coalescedFilters = setCurrentFilterStateFromCache(globalFilterBarState, pageFilterContext)
    // console.debug('ZZZZZZZZ >>>>>> Coalesced filters after context change are: ', coalescedFilters)
    updateGlobalFilterBarState({ type: FiltersBarDispatch[FiltersBarActions.setFilterBarState], payload: { ...coalescedFilters } })
    // console.debug('DDDDDDDD >>>>>>> Setting page filter state to: ', { pageFState: coalescedFilters.filtersState })
    setPageFilterState(coalescedFilters.filtersState)
  }, [globalFilterBarState, pageFilterState, updateGlobalFilterBarState])

  useEffect(() => {
    // console.debug('Data in overview hook is: ', data)
    if (data?.sensorGridItems) {
      const unit = tempInC ? 'C' : 'F'
      const sensorArrayData = convertTemperatureSensorGridItems(unit, data.sensorGridItems)
      mutate({ ...data, sensorGridItems: sensorArrayData }, { revalidate: false, populateCache: true })
      setReloading(false)
    }
  }, [data, mutate, tempInC])

  const onTemperatureUnitToggle = (checked: boolean) => {
    setReloading(true)
    setTempInC(checked)
  }

  const handleFavoriteClick = (sensorItem: SensorGridItem) => {
    if (!(data?.sensorGridItems && data.sensorGridItems.length > 0) || !(data.sensorCategories.length > 0)) return

    const updatedItems = data.sensorGridItems.map((item) => {
      if (item.sensorId === sensorItem.sensorId) {
        const updatedItem = { ...item, isFavorited: !item.isFavorited }

        return updatedItem
      }
      return item
    })

    mutate({ ...data, sensorGridItems: updatedItems }, false)
  }

  return (
    <SensorOverviewContext.Provider
      value={{
        gridItems: data?.sensorGridItems && data.sensorGridItems.length > 0 ? data.sensorGridItems : null,
        tempInC,
        onTemperatureUnitToggle,
        handleFavoriteClick,
        isLoading: isLoading || reloading,
        error,
        filtersState: pageFilterState,
        refresh: mutate,
        reFocusFilters,
      }}
    >
      <div>
        {isFetching === false ? (
          <FiltersBar
            keyContext={FilteredDashboards.Sensors}
            filtersBarChanged={filtersBarChanged}
            setFiltersBarChanged={indicateFiltersChanged}
            globalFiltersState={{ ...pageFilterState }}
            filterBarVisible={globalFilterBarState.barVisible}
            setCustomerSelection={undefined}
          />
        ) : (
          <LoadingSpinner message={'Fetching Sensor Filters...'} />
        )}
      </div>

      {children}
    </SensorOverviewContext.Provider>
  )
}
