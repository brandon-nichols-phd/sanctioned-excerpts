import React from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ThermostatIcon from '@mui/icons-material/Thermostat'
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat'
import ColorizeIcon from '@mui/icons-material/Colorize'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt'
import { pathspotLavender, pathspotPrimary, pathspotRed, pathspotSecondary } from '../../../../theme/colors-pathspot/colors'
import { InboundOverviewSensorData, SensorDataType, SensorGridItem } from '../../api/sensor-types'
import { useAppTheme } from '../../../../theme/ThemeContext'
import { DEGREE_SYM } from '../../../../api/constants'
import { colors } from '../../../../theme/colors'
import { isFiniteNumber } from '../../api/sensor-api.api'

type SensorCardDataProps = {
  sensor: SensorGridItem
  onSensorDataClick: (sensor: SensorGridItem) => void
}

const getDataIcon = (level: SensorDataType | undefined) => {
  switch (level) {
    case 'TEMPERATURE':
      return <ThermostatIcon sx={{ color: pathspotPrimary, margin: 0, padding: 0 }} />
    case 'TEMPERATURE_SECONDARY':
      return <ColorizeIcon sx={{ margin: 0, padding: 0, color: pathspotLavender }} />
    case 'HUMIDITY':
      return <WaterDropIcon sx={{ margin: 0, padding: 0, color: pathspotSecondary }} />
    case 'RSSI':
      return <SignalCellularAltIcon sx={{ margin: 0, padding: 0, color: 'red' }} />
    default:
      return <CheckCircleIcon sx={{ margin: 0, padding: 0, color: 'green' }} />
  }
}

const SensorCardData: React.FC<SensorCardDataProps> = ({ sensor, onSensorDataClick }) => {
  const { theme } = useAppTheme()
  const sensorPrimaryValueRaw = sensor.primaryDataCurrent?.sensorValue
  const hasPrimarySensorValue = isFiniteNumber(sensorPrimaryValueRaw)
  const primarySensorValue = hasPrimarySensorValue ? sensorPrimaryValueRaw.toFixed(1) : ''
  const primaryDataType = sensor.primaryDataCurrent?.dataType || sensor.reportDataType
  const primarySensorUnit = sensor.primaryDataCurrent?.sensorUnit || ''
  const primaryDisplayUnit =
    (primaryDataType === 'TEMPERATURE_SECONDARY' || primaryDataType === 'TEMPERATURE') && primarySensorValue !== ''
      ? `${DEGREE_SYM}${primarySensorUnit}`
      : primarySensorUnit
  const secondaryDataType = sensor.primaryDataCurrent?.dataType !== 'HUMIDITY' ? 'HUMIDITY' : 'TEMPERATURE'
  const secondarySensorData = sensor.data.find((datum: InboundOverviewSensorData) => datum.dataType === secondaryDataType)
  const secondaryValueRaw = secondarySensorData?.sensorValue
  const hasSecondarySensorValue = isFiniteNumber(secondaryValueRaw)

  const secondarySensorValue = hasSecondarySensorValue ? secondaryValueRaw.toFixed(1) : ''
  const secondarySensorUnit = secondarySensorData?.sensorUnit || ''

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flex: '0 0 60%',
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flex: hasPrimarySensorValue ? '0 0 30%' : '0 0 0%', //adjusting percentage here moves primary icon left/right
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: hasPrimarySensorValue ? 'flex-end' : 'center',
            padding: 0,
            margin: 0,
          }}
        >
          {hasPrimarySensorValue && getDataIcon(primaryDataType)}
        </Box>

        <Typography
          onClick={() => onSensorDataClick(sensor)}
          sx={{
            flex: hasPrimarySensorValue ? '1 1 70%' : '1 1 100%', //adjusting percentage here moves primary value left/right
            textAlign: hasPrimarySensorValue ? 'left' : 'center',
            fontSize: hasPrimarySensorValue ? `1.5rem` : '1rem',
            fontWeight: 'bold',
            lineHeight: 1.05,
            fontStyle: hasPrimarySensorValue ? 'normal' : 'italic',
            maxWidth: hasPrimarySensorValue ? '60%' : '95%',
            ...theme.customStyles.customLinkStyling,
            color: colors.sensor?.dataText,
          }}
        >
          {hasPrimarySensorValue ? `${primarySensorValue} ${primaryDisplayUnit}` : 'Data Unavailable'}
        </Typography>
      </Box>
      {!primarySensorValue && (
        <Box
          sx={{
            display: 'flex',
            flex: '0 0 60%',
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasPrimarySensorValue && getDataIcon(primaryDataType)}
          <Typography
            onClick={() => onSensorDataClick(sensor)}
            sx={{
              flex: '1 1 100%',
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              lineHeight: 1.05,
              fontStyle: 'italic',
              maxWidth: '95%',
              ...theme.customStyles.customLinkStyling,
              color: colors.sensor?.dataText,
            }}
          >
            {'(offline for more than 3 days)'}
          </Typography>
        </Box>
      )}
      <Box
        sx={{
          display: 'flex',
          flex: '0 0 40%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flex: '0 0 42%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: 0,
            margin: 0,
          }}
        >
          {hasSecondarySensorValue && getDataIcon(secondaryDataType)}
        </Box>

        <Typography
          onClick={() => onSensorDataClick(sensor)}
          sx={{
            flex: '1 1 58%',
            textAlign: 'left',
            fontSize: `1.25rem`,
            fontWeight: 'bold',
            lineHeight: 1.05,
            maxWidth: '58%',
            ...theme.customStyles.customLinkStyling,
          }}
        >
          {`${secondarySensorValue} ${secondarySensorUnit}` || ''}
        </Typography>
      </Box>
    </Box>
  )
}

export default SensorCardData
