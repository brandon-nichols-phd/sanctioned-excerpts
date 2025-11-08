import { SelectableItem } from './../../../../webapp-lib/pathspot-react/api/types/components-general.types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import _, { isArray } from 'lodash'
import { SENSOR_DATA_REPORTING_PATHNAME } from '../../../../api/constants'
import { useLocation } from 'react-router-dom'
import history from '../../../../api/history'
import queryString, { ParsedQuery } from 'query-string'
import moment from 'moment'
import {
  CurrentReport,
  DepartmentOption,
  FormattedReading,
  InboundReading,
  InboundReport,
  InboundSignedReading,
  LocationOption,
  MeridiemSet,
  ReportOption,
  ReportQueryParams,
  ReportSelections,
  TableRowContext,
} from './sensor-data-reports.types'
import { fetchReportLocations, fetchReportTypes, getReportForApproval } from './api/sensor-data-reports.requests'
import useAuthContext from '../../../../api/authentication/useAuthContext'
import { stringToMoment } from '../../api/sensor-api.api'
import { buildSelectableArray, momentToString } from '../../../../webapp-lib/pathspot-react'
import { isNumberOrString } from '../../../../api/helpers/utils'
import { CurrentUser } from '../../../../api/authentication/AuthenticationContext'

const dt_format = 'YYYY-MM-DD'

export const updateQueryString = (
  params: { [key in string]: string | number } | undefined = undefined,
  date: string | null = null,
  locationId: number | null = null,
  departmentId: number | null = null,
  reportId: number | null = null
) => {
  const momentDate = moment(date).format('YYYY-MM-DD h:mm A')
  const stringifiedQuery = queryString.stringify(
    {
      date: date ? momentDate : params?.date,
      locationId: locationId ? locationId : params?.locationId,
      departmentId: departmentId ? departmentId : params?.departmentId,
      reportId: reportId ? reportId : params?.reportId,
    },
    { arrayFormat: 'comma' }
  )
  return stringifiedQuery
}

export const useSensorDataReport = () => {
  const [currentReport, setCurrentReport] = useState<CurrentReport | null>(null)
  const [initialReport, setInitialReport] = useState<CurrentReport | null>(null)
  const [locationOptions, setLocationOptions] = useState<Array<SelectableItem<LocationOption>> | null>(null)
  const [reportOptions, setReportOptions] = useState<Array<SelectableItem<ReportOption>> | null>(null)
  const [amData, setAmData] = useState<MeridiemSet | null>(null)
  const [pmData, setPmData] = useState<MeridiemSet | null>(null)
  const [isSorting, setIsSorting] = useState<boolean>(false)
  const [tempInC, setTempInC] = useState<boolean | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  const rawQueryParams = useRef<ParsedQuery<string>>(queryString.parse(useLocation().search))
  const { authState } = useAuthContext()

  const parsedQueryParams = useMemo((): ReportQueryParams | undefined => {
    const locationId = rawQueryParams.current.locationId
    const departmentId = rawQueryParams.current.departmentId
    const reportId = rawQueryParams.current.reportId
    const date = rawQueryParams.current.date
    if (isNumberOrString(locationId) && isNumberOrString(reportId) && isNumberOrString(date)) {
      return {
        locationId,
        reportId,
        date,
        departmentId: departmentId && !isArray(departmentId) ? departmentId : undefined,
      }
    }
  }, [rawQueryParams])

  const fetchLocationData = useCallback(async () => {
    try {
      const locations = await fetchReportLocations()

      if (locations.data) {
        const formattedLocationOptions = buildSelectableArray<LocationOption>(locations.data, 'locationName', 'locationId')
        const formattedDepartmentLocations = formattedLocationOptions.map((locationItem) => {
          if (locationItem.source.departments) {
            locationItem = {
              ...locationItem,
              source: {
                ...locationItem.source,
                departmentOptions: buildSelectableArray<DepartmentOption>(
                  locationItem.source.departments,
                  'departmentName',
                  'departmentId'
                ),
              },
            }
          }
          return locationItem
        })
        setLocationOptions([...formattedDepartmentLocations])
      }
    } catch (e) {
      console.warn('Something went wrong tyring to check sensor reporting locations: ', e)
    }
  }, [])

  //Callback to get a report's details
  const getReportDetails = useCallback(async () => {
    if (locationOptions !== null && reportOptions !== null && parsedQueryParams) {
      const selectedLocation = locationOptions.find((location) => {
        return `${location.value}` === parsedQueryParams.locationId
      })
      if (selectedLocation) {
        const selectedReport = reportOptions.find((report) => {
          return `${report.value}` === parsedQueryParams.reportId
        })
        if (selectedReport) {
          const selectedDepartment = selectedLocation.source.departmentOptions?.length
            ? selectedLocation.source.departmentOptions.find((deptOption: SelectableItem<DepartmentOption>) => {
                return `${deptOption.value}` === parsedQueryParams.departmentId
              })
            : undefined
          const selectedDateMoment = stringToMoment(`${parsedQueryParams.date}`, 'YYYY-MM-DD')
          const selectedDate = momentToString(selectedDateMoment, 'YYYY-MM-DD')
          if (selectedDate) {
            const reportSelections: ReportSelections = {
              selectedDate: selectedDate,
              selectedLocation: selectedLocation,
              selectedReport: selectedReport,
              selectedDepartment: selectedDepartment,
            }
            // const formattedSelectedDate = stringToMoment(`${parsedQueryParams.date}`, 'YYYY-MM-DD').toDate()
            const reportDetailsResponse = await getReportForApproval(reportSelections)
            if (reportDetailsResponse.data) {
              const reportDetails = reportDetailsResponse.data
              setInitialReport({
                reportDetails,
                reportSelections: { ...reportSelections, selectedDate: selectedDate },
                locationOptions: _.cloneDeep([...locationOptions]),
                departmentOptions: selectedLocation.source.departmentOptions,
              })
            }
          }
        }
      }
    }
  }, [locationOptions, parsedQueryParams, reportOptions])

  const fetchReportList = useCallback(async () => {
    try {
      const reports = await fetchReportTypes()

      if (reports.data) {
        const formattedReportOptions = buildSelectableArray<ReportOption>(reports.data, 'name', 'id')
        setReportOptions([...formattedReportOptions])
      }
    } catch (e) {
      console.warn('Something went wrong tyring to check sensor report listing: ', e)
    }
  }, [])

  const getCheckRowContext = useCallback((readingData: Array<InboundReading>, reportDetails: InboundReport) => {
    if (readingData.length > 0) {
      const reducedData = readingData.reduce((reducedDataItems: Array<FormattedReading>, reading: InboundReading) => {
        if (reportDetails.signed.length > 0) {
          const signedReading = reportDetails.signed.find((signedReading: InboundSignedReading) => {
            const commonSensorId = reading.sensorId === signedReading.sensorId
            const commonReportGroupId = reading.sensorCheckId === signedReading.reportConfigEntryIndex
            const isSigned = commonSensorId && commonReportGroupId
            return isSigned ? true : false
          })
          if (signedReading) {
            const updatedReading: FormattedReading = {
              ...reading,
              createdWhen: signedReading.readingWhen,
              sensorReading: String(signedReading.readingValue),
              readingId: signedReading.readingId,
              signedWhen: signedReading.signedWhen,
              signerId: signedReading.signerId,
              signerName: signedReading.signerName,
              reportDate: signedReading.reportDate,
              reportConfigEntryIndex: signedReading.reportConfigEntryIndex,
              id: signedReading.id,
              comment: signedReading.correctiveAction,
              overrideTime: signedReading.overrideTime,
              overrideValue: signedReading.overrideValue,
              override: false,
            }
            // set override flag
            if (updatedReading.overrideTime || updatedReading.overrideValue) {
              updatedReading.override = true
            } else {
              updatedReading.override = false
            }

            reducedDataItems = [...reducedDataItems, { ...updatedReading }]
            return reducedDataItems
          }
        }

        const formattedNotYetSigned: FormattedReading = {
          ...reading,
          override: false,
          signedWhen: '',
          signerId: '',
          signerName: '',
          reportDate: '',
          reportConfigEntryIndex: null,
          id: '',
        }
        reducedDataItems = [...reducedDataItems, { ...formattedNotYetSigned }]
        return reducedDataItems
      }, [])
      if (reducedData.some((item: FormattedReading) => item.override)) {
        return { data: [...reducedData], rowContext: TableRowContext.expanded }
      }
      return { data: [...reducedData], rowContext: TableRowContext.normal }
    }

    return { data: [], rowContext: TableRowContext.unknown }
  }, [])

  const onSelectedDayChange = useCallback(
    (newSelectedDay: string) => {
      const reportQueryString = updateQueryString(parsedQueryParams, newSelectedDay)
      const redirectPath = `../${SENSOR_DATA_REPORTING_PATHNAME}/?${reportQueryString}`
      history.push(redirectPath)
      window.location.reload()
    },
    [parsedQueryParams]
  )

  const onNextDay = useCallback(() => {
    const currentDay = stringToMoment(`${parsedQueryParams?.date}`)

    if (momentToString(currentDay, dt_format)) {
      const nextDay = momentToString(currentDay.add(1, 'day'), dt_format)
      const reportQueryString = updateQueryString(parsedQueryParams, nextDay)
      const redirectPath = `../${SENSOR_DATA_REPORTING_PATHNAME}/?${reportQueryString}`
      history.push(redirectPath)
      window.location.reload()
    }
  }, [parsedQueryParams])

  const onPreviousDay = useCallback(() => {
    const currentDay = stringToMoment(`${parsedQueryParams?.date}`, dt_format)
    if (momentToString(currentDay, dt_format)) {
      const previousDay = momentToString(currentDay.subtract(1, 'day'), dt_format)
      const reportQueryString = updateQueryString(parsedQueryParams, previousDay)
      const redirectPath = `../${SENSOR_DATA_REPORTING_PATHNAME}/?${reportQueryString}`
      history.push(redirectPath)
      window.location.reload()
    }
  }, [parsedQueryParams])

  const onLocationChange = useCallback(
    (newLocation: SelectableItem<LocationOption>) => {
      const currentLocationId = parsedQueryParams?.locationId
      const newLocationId = newLocation.value
      //Make sure the same location wasn't selected
      if (currentLocationId !== newLocationId) {
        const reportQueryString = updateQueryString(parsedQueryParams, null, newLocationId, null, null)
        const redirectPath = `../${SENSOR_DATA_REPORTING_PATHNAME}/?${reportQueryString}`
        history.push(redirectPath)
        window.location.reload()
      }
    },
    [parsedQueryParams]
  )

  const onDepartmentChange = useCallback(
    (newDepartment: SelectableItem<DepartmentOption>) => {
      const currentDepartmentId = parsedQueryParams?.departmentId
      const newDepartmentId = newDepartment.value
      //Make sure the same department wasn't selected
      if (currentDepartmentId !== newDepartmentId) {
        const reportQueryString = updateQueryString(parsedQueryParams, null, null, newDepartmentId, null)
        const redirectPath = `../${SENSOR_DATA_REPORTING_PATHNAME}/?${reportQueryString}`
        history.push(redirectPath)
        window.location.reload()
      }
    },
    [parsedQueryParams]
  )

  //Side effect for callback that fetches report details
  useEffect(() => {
    fetchLocationData()
  }, [fetchLocationData])

  useEffect(() => {
    fetchReportList()
  }, [fetchReportList])

  useEffect(() => {
    getReportDetails()
  }, [getReportDetails])

  useEffect(() => {
    if (currentReport === null && initialReport !== null) {
      setCurrentReport(_.cloneDeep(initialReport))
    }
  }, [currentReport, initialReport])
  useEffect(() => {
    if (tempInC === null) {
      if (authState.temperatureInC) {
        setTempInC(true)
      } else {
        setTempInC(false)
      }
    }
    if (currentUser === null) {
      setCurrentUser(authState.currentUser)
    }
  }, [authState, currentUser, tempInC])

  useEffect(() => {
    setIsSorting(true)
    const reportDetails = currentReport?.reportDetails
    if (reportDetails) {
      const readingData = reportDetails.readings.reduce(
        (reducedData: { amData: Array<InboundReading>; pmData: Array<InboundReading>; noData: Array<InboundReading> }, reading) => {
          if (reading.sensorCheckId === 0) {
            reducedData = { ...reducedData, amData: [...reducedData.amData, reading] }
          } else if (reading.sensorCheckId === 1) {
            reducedData = { ...reducedData, pmData: [...reducedData.pmData, reading] }
          } else {
            reducedData = { ...reducedData, noData: [...reducedData.noData, reading] }
          }

          return reducedData
        },
        { amData: [], pmData: [], noData: [] }
      )
      const amReadings = readingData.amData.sort((a, b) => a.sensorName.localeCompare(b.sensorName))
      const pmReadings = readingData.pmData.sort((a, b) => a.sensorName.localeCompare(b.sensorName))

      const amDataLocal: MeridiemSet = getCheckRowContext(amReadings, reportDetails)
      const pmDataLocal: MeridiemSet = getCheckRowContext(pmReadings, reportDetails)
      setAmData({ ...amDataLocal })
      setPmData({ ...pmDataLocal })
    }
    setIsSorting(false)
  }, [currentReport, getCheckRowContext])

  return useMemo(
    () => ({
      tempInC,
      onDepartmentChange,
      onLocationChange,
      onNextDay,
      onPreviousDay,
      onSelectedDayChange,
      currentReport,
      locationOptions,
      reportOptions,
      amData,
      pmData,
      isSorting,
      currentUser,
    }),
    [
      tempInC,
      onDepartmentChange,
      onLocationChange,
      onNextDay,
      onPreviousDay,
      onSelectedDayChange,
      currentReport,
      locationOptions,
      reportOptions,
      amData,
      pmData,
      isSorting,
      currentUser,
    ]
  )
}
