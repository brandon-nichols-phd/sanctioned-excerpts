import React, { useCallback, useEffect, useState } from 'react'
import { SelectableItem, StyledSpinner, buildSelectableArray } from '../../../../../webapp-lib/pathspot-react'
import {
  SensorDataReportModalState,
  ModalContext,
  defaultModalState,
  LocationOption,
  ReportModalOption,
} from '../sensor-data-reports.types'
import SensorInitializeReportModal from './SensorInitializeReportModal'
import { fetchReportLocations, fetchReportTypes } from '../api/sensor-data-reports.requests'
import { SensorDownloadReportModal } from './SensorDownloadReportModal'
import { NavToggleElement } from '../../../../../redux/contexts/app'
import useAppSelector from '../../../../../redux/useAppSelector'
import { selectAppNavToggleElementValue } from '../../../../../redux/store'

export const SensorDataReportsModal = () => {
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const [locationOptions, setLocationOptions] = useState<Array<SelectableItem<LocationOption>> | null>(null)
  const [reportOptions, setReportOptions] = useState<Array<SelectableItem<ReportModalOption>> | null>(null)
  const [modalState, setModalState] = useState<SensorDataReportModalState>({ ...defaultModalState })
  const startReportValue = useAppSelector((state: any) => selectAppNavToggleElementValue(state, NavToggleElement.startReport))
  const downloadReportValue = useAppSelector((state: any) => selectAppNavToggleElementValue(state, NavToggleElement.downloadReport))

  const startDataReport = useCallback(() => {
    if (locationOptions !== null && reportOptions !== null && !isFetching) {
      setModalState({ showModal: true, context: ModalContext.startDataReport })
    }
  }, [startReportValue])

  useEffect(() => {
    startDataReport()
  }, [startDataReport])

  const downloadReport = useCallback(() => {
    if (locationOptions !== null && reportOptions !== null && !isFetching) {
      setModalState({ showModal: true, context: ModalContext.downloadReport })
    }
  }, [downloadReportValue])

  useEffect(() => {
    downloadReport()
  }, [downloadReport])

  const fetchLocationData = useCallback(async () => {
    setIsFetching(true)
    try {
      const locations = await fetchReportLocations()
      if (locations.data) {
        setLocationOptions([...buildSelectableArray<LocationOption>(locations.data, 'locationName', 'locationId')])
      }
    } catch (_error) {
      // Failed the fetch, nothing to do.
    }
    setIsFetching(false)
  }, [])
  const fetchReportList = useCallback(async () => {
    setIsFetching(true)
    try {
      const reports = await fetchReportTypes()
      if (reports.data) {
        const formattedReportOptions = buildSelectableArray<ReportModalOption>(reports.data, 'name', 'id')
        setReportOptions([...formattedReportOptions])
      }
      setIsFetching(false)
    } catch (e) {
      setIsFetching(false)
    }
  }, [])
  useEffect(() => {
    fetchLocationData()
  }, [fetchLocationData])
  useEffect(() => {
    fetchReportList()
  }, [fetchReportList])
  const clearModal = async () => {
    setModalState({ showModal: false, context: ModalContext.unknown })
  }
  if (modalState.showModal === false) {
    return <></>
  }
  if (locationOptions === null || reportOptions === null || isFetching) {
    return <StyledSpinner asModal message="Fetching available reports..." />
  }
  if (modalState.context === ModalContext.startDataReport) {
    const tempratureLogReportOptions = [...reportOptions.filter((option) => !/Report A[12]/.test(option.label))]
    return (
      <SensorInitializeReportModal
        locationOptions={[...locationOptions]}
        reportOptions={tempratureLogReportOptions}
        closeModal={clearModal}
      />
    )
  } else if (modalState.context === ModalContext.downloadReport) {
    return (
      <SensorDownloadReportModal
        open={modalState.showModal}
        locationOptions={[...locationOptions]}
        reportOptions={[...reportOptions]}
        onClose={clearModal}
      />
    )
  }
  return <div></div>
}
export default SensorDataReportsModal
