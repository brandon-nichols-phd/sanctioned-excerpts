import React, { useMemo } from 'react'
import { Box, Paper } from '@mui/material'
import SensorCardTitle from '../content/SensorCardTitle'
import SensorCardSubtitle from '../content/SensorCardSubtitle'
import SensorCardData from './SensorCardData'
import { SensorCardFooter } from './SensorCardFooter'
import { useSensorOverview } from '../context/useSensorOverview'
import { useSensorOverviewModal } from '../modal/use-sensor-overview-modal'
import { SensorGridItem } from '../../api/sensor-types'
import { SENSOR_CARD_WIDTH_REM, SENSOR_CARD_HEIGHT_REM } from '../../api/sensor-constants'

const SENSOR_CARD_COLORS = {
  BACKGROUND: {
    OUT_OF_RANGE: '#F8AAAE',
    IN_RANGE: '#9AEDB9',
    NO_DATA: '#EEEEEE',
  },
  BORDER: {
    OUT_OF_RANGE: '#FA5961',
    IN_RANGE: '#18C835',
    NO_DATA: '#586274',
  },
}

// Function to determine the card color dynamically
const getColorForCard = (sensor: SensorGridItem): { backgroundColor: string; borderColor: string } => {
  if (sensor.data.length === 0) {
    return { backgroundColor: SENSOR_CARD_COLORS.BACKGROUND.NO_DATA, borderColor: SENSOR_CARD_COLORS.BORDER.NO_DATA }
  } else if (sensor.primaryDataOutOfAlertsRange?.some((value) => value)) {
    return { backgroundColor: SENSOR_CARD_COLORS.BACKGROUND.OUT_OF_RANGE, borderColor: SENSOR_CARD_COLORS.BORDER.OUT_OF_RANGE }
  } else {
    return { backgroundColor: SENSOR_CARD_COLORS.BACKGROUND.IN_RANGE, borderColor: SENSOR_CARD_COLORS.BORDER.IN_RANGE }
  }
}

export interface SensorCardProps {
  sensor: SensorGridItem
}

export const SensorCard: React.FC<SensorCardProps> = ({ sensor }) => {
  const { backgroundColor, borderColor } = getColorForCard(sensor)
  const { handleFavoriteClick } = useSensorOverview()
  const { onSensorItemClick, onSensorItemAlertClick } = useSensorOverviewModal()
  return useMemo(() => {
    return (
      <Paper
        key={sensor.sensorId}
        sx={{
          variant: 'cardBlank',
          width: `${SENSOR_CARD_WIDTH_REM}rem`,
          height: `${SENSOR_CARD_HEIGHT_REM}rem`,
          backgroundColor,
          border: `0.15rem solid ${borderColor}`,
          borderRadius: '1rem',
          borderColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            display: 'flex ',
            flexWrap: 'nowrap',
            flexDirection: 'column',
            flex: '0 0 98%',
            textAlign: 'center',
            width: '100% ',
            justifyContent: 'space-between',
          }}
        >
          <SensorCardTitle sensor={sensor} onAlertIconClick={onSensorItemAlertClick} onFavoriteIconClick={handleFavoriteClick} />
          <SensorCardSubtitle sensor={sensor} />
          <SensorCardData onSensorDataClick={onSensorItemClick} sensor={sensor} />
          <SensorCardFooter sensor={sensor} />
        </Box>
      </Paper>
    )
  }, [
    backgroundColor,
    borderColor,
    handleFavoriteClick,
    onSensorItemAlertClick,
    onSensorItemClick,
    sensor,
    sensor.primaryDataCurrent?.sensorValue,
    sensor.primaryDataCurrent?.sensorUnit,
  ])
}
