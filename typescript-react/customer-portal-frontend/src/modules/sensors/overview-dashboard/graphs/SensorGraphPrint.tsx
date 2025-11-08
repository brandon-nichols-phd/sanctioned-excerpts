import React from 'react'
import SensorGraphTab from './SensorGraphTab'
import { SensorGraphData } from './sensor-graphs.types'
import { SensorDataType, SensorGridItem } from '../../api/sensor-types'
import { Box, Card, Typography } from '@mui/material'
import useAuthContext from '../../../../api/authentication/useAuthContext'
import { getAllowedLayoutOrderedSensorDataTypes } from './sensor-graphs.api'

type SensorPrintProps = {
  sensorData: SensorGraphData | null
  cardData: SensorGridItem
}

export const SensorGraphPrint = React.forwardRef<HTMLDivElement, SensorPrintProps>(({ sensorData, cardData }, ref) => {
  const { isPathspotUser } = useAuthContext()
  const allowedDataTypes = getAllowedLayoutOrderedSensorDataTypes(isPathspotUser)
  if (sensorData) {
    return (
      <Box
        ref={ref}
        sx={{
          padding: '3rem',
          marginBottom: '3rem',
        }}
      >
        {allowedDataTypes.map((dataType) => {
          const dataSeries = sensorData.series[dataType]
          return (
            <Card>
              <Box
                sx={{
                  marginBottom: '1rem',
                }}
              >
                <Typography sx={{ marginTop: '3rem', textAlign: 'center' }}>{`${cardData.locationName} - ${dataType}`} </Typography>
              </Box>
              <SensorGraphTab
                key={dataType}
                dataSeries={dataSeries}
                alertLines={sensorData.alertLines[dataType as SensorDataType]}
                sensorContext={dataType as SensorDataType}
                isPrint={true}
                cardData={cardData}
              />
            </Card>
          )
        })}
      </Box>
    )
  }
  return <></>
})
SensorGraphPrint.displayName = 'SensorGraphPrint'
