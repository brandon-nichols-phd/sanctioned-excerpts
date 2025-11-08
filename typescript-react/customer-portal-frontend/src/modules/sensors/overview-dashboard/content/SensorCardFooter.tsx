import React from 'react'
import { Box, Typography } from '@mui/material'
import { SensorGridItem } from '../../api/sensor-types'
import BatteryLevel from '../../../../icons/BatteryLevel'
import dayjs, { Dayjs } from 'dayjs'
import { getDynamicRemFontSize } from '../../api/sensor-api.api'
import { transparent } from '../../styles/colors'
import { colors } from '../../../../theme/colors'

export const timeSinceLastPing = (currentMoment: Dayjs, epochMoment: Dayjs) => {
  const diffInDays = currentMoment.diff(epochMoment, 'day')
  const diffInHours = currentMoment.diff(epochMoment, 'hour')
  const diffInMinutes = currentMoment.diff(epochMoment, 'minute')

  if (Number.isNaN(diffInDays)) {
    return { message: '-- days ago', intervalError: false }
  }

  if (diffInDays < 1) {
    if (diffInHours < 1) {
      if (diffInMinutes < 1) {
        return { message: 'Less than 1 min ago', intervalError: false }
      }
      return {
        message: `${diffInMinutes} ${diffInMinutes > 1 ? 'mins' : 'min'} ago`,
        intervalError: false,
      }
    }
    return {
      message: `${diffInHours} ${diffInHours > 1 ? 'hours' : 'hour'} ago`,
      intervalError: diffInHours > 2 ? true : false,
    }
  }

  if (diffInDays < 2) {
    const hoursRemainder = diffInHours - 24
    return {
      message: `1 day, ${hoursRemainder} ${hoursRemainder !== 1 ? 'hours' : 'hour'} ago`,
      intervalError: true,
    }
  }

  return { message: `${diffInDays} days ago`, intervalError: true }
}

export interface SensorCardFooterProps {
  changeHandlers?: Array<() => void>
  sensor: SensorGridItem
}

export const SensorCardFooter: React.FC<SensorCardFooterProps> = ({ sensor, changeHandlers }) => {
  // If we can't find the battery level, indicate it is 10%, which is the lowest acceptable value
  const batteryLevel = sensor.data.find((datum) => datum.dataType === 'BATTERY')?.sensorValue || -1
  const currentMoment = dayjs()
  const lastPrimary = sensor.primaryDataCurrent?.createdWhen.str
  const epochMoment = dayjs(lastPrimary)
  const interval = timeSinceLastPing(currentMoment, epochMoment)
  const lastOnlineMessage = `Last Online: ${interval.message}`
  const batteryColor = batteryLevel > 35 ? 'green' : batteryLevel > 15 ? 'orange' : batteryLevel > 5 ? 'red' : 'black'
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flex: '0 0 10%',
        flexWrap: 'nowrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '97.5%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flex: '0 0 20%',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {batteryLevel < 50 && (
          <BatteryLevel
            batteryPercent={batteryLevel}
            height="1.125rem"
            width="2rem"
            fillColor={batteryColor}
            strokeColor={transparent}
            textColor="#ffffff"
          />
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          flex: '0 0 80%',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'baseline',
          justifyContent: 'flex-end',
        }}
      >
        {lastPrimary && (
          <Typography
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontStyle: 'italic',
              fontSize: `clamp(0.6rem, ${getDynamicRemFontSize(lastOnlineMessage || '', 0.75, 0.5, 25)}, 1rem)`, // Scales dynamically
              fontWeight: 'bold',
              width: '100%',
              color: interval.intervalError ? 'red' : colors.sensor?.dataText,
            }}
          >
            {`${lastOnlineMessage}`}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
