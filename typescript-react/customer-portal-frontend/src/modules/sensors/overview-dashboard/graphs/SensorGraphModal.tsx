// Refactored SensorOverviewModalTabPane using MUI components
import React, { useEffect, useRef, useState } from 'react'
import { Box, Card, Typography } from '@mui/material'
import { useReactToPrint } from 'react-to-print'
import { selectFiltersBar, FiltersBarDispatch, FiltersBarActions } from '../../../../redux/store'
import useAppSelector from '../../../../redux/useAppSelector'
import useAppDispatch from '../../../../redux/useAppDispatch'
import SensorGraphModalFooter from './SensorGraphModalFooter'
import SensorGraphModalHeader from './SensorGraphModalHeader'
import { SensorGraphPrint } from './SensorGraphPrint'
import SensorGraphModalTabs from './SensorGraphModalTabs'
import LoadingSpinner from '../../../generic/LoadingSpinner'
import { useSensorGraphs } from './SensorGraphProvider'
import { downloadGenerateCSV } from '../../../../api/helpers/export-csv-data'
import { SensorDataType, SensorDataTypeLabel } from '../../api/sensor-types'
import dayjs from 'dayjs'
import useAuthContext from '../../../../api/authentication/useAuthContext'
import { getAllowedLayoutOrderedSensorDataTypes } from './sensor-graphs.api'

export type SensorGraphModalProps = {
  clearModal: () => void
}

export const SensorGraphModal: React.FC<SensorGraphModalProps> = ({ clearModal }) => {
  const dispatch = useAppDispatch()
  const printRef = useRef(null)
  const [printClicked, setPrintClicked] = useState(false)
  const globalFilterBarState = useAppSelector(selectFiltersBar)
  const { sensorData, cardData, isLoading, sparsityContext } = useSensorGraphs()
  const handlePrint = useReactToPrint({ content: () => printRef.current })
  const { isPathspotUser } = useAuthContext()
  const allowedDataTypes = getAllowedLayoutOrderedSensorDataTypes(isPathspotUser)
  useEffect(() => {
    if (printClicked) {
      handlePrint()
      setTimeout(() => setPrintClicked(false), 1000)
    }
  }, [printClicked, handlePrint])

  const handleExport = () => {
    if (sensorData) {
      const dataVectors: Partial<Record<SensorDataType | 'Time' | 'Date', Array<number | null | string>>> = {}
      const dataColumnLabels: Partial<Record<SensorDataType | 'Time' | 'Date', string>> = {}

      allowedDataTypes.map((dataType) => {
        const dataSeries = sensorData.series[dataType]
        if (dataSeries) {
          const sparsitySeries = dataSeries[sparsityContext]
          const dataVector = sparsitySeries?.trace.values
          const timeVector = sparsitySeries?.domain.values
          if (timeVector && !Object.keys(dataVectors).includes('Time')) {
            const localTimezone = dayjs.tz.guess()
            const timeData = timeVector.map((timeValue) =>
              dayjs(timeValue * 1000)
                .tz(localTimezone)
                .format('h:mm a')
            )
            const dateData = timeVector.map((timeValue) =>
              dayjs(timeValue * 1000)
                .tz(localTimezone)
                .format('M/D/YY')
            )
            dataVectors['Time'] = timeData
            dataVectors['Date'] = dateData
            dataColumnLabels['Time'] = 'Time'
            dataColumnLabels['Date'] = 'Date'
          }
          const dataUnit = sparsitySeries?.trace.unit
          const dataLabel = SensorDataTypeLabel.get(dataType as SensorDataType)
          if (dataVector && dataUnit) {
            dataVectors[dataType as SensorDataType] = dataVector
            const columnLabel = `${dataLabel} (${dataUnit})`
            dataColumnLabels[dataType as SensorDataType] = columnLabel
          }
        }
      })
      downloadGenerateCSV(dataVectors, dataColumnLabels, `Sensor Graph Data - ${cardData.locationName}`)
    }
  }

  if (isLoading) {
    return <LoadingSpinner message={'Loading graph data...'} />
  }

  return printClicked ? (
    <SensorGraphPrint sensorData={sensorData} ref={printRef} cardData={cardData} />
  ) : (
    <Box sx={{ padding: 2 }}>
      <Card elevation={3} sx={{ padding: 2 }}>
        <SensorGraphModalHeader
          locationName={cardData.locationName}
          sensorName={cardData.sensorName}
          filterBarVisible={globalFilterBarState.barVisible}
          toggleFilterBar={() =>
            dispatch({
              type: FiltersBarDispatch[FiltersBarActions.toggleFilterVisibility],
            })
          }
        />

        {sensorData !== null ? (
          <SensorGraphModalTabs />
        ) : (
          <Typography
            variant="h6"
            sx={{
              mt: 6,
              mb: 12,
              textAlign: 'center',
              color: 'primary.main',
              fontWeight: 'bold',
            }}
          >
            No data to display for current date range...
          </Typography>
        )}
      </Card>

      <SensorGraphModalFooter onPDF={() => setPrintClicked(true)} onExport={handleExport} onOkay={clearModal} />
    </Box>
  )
}
