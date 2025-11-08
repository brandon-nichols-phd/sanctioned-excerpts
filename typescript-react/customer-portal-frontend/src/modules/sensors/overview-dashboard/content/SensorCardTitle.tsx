import React from 'react'
import { Box, IconButton } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { InboundSensorAction, SensorDataType, SensorGridItem } from '../../api/sensor-types'
import { getDynamicRemFontSize, getHighestCriticalityItem } from '../../api/sensor-api.api'
import { pathspotSecondary } from '../../../../theme/colors-pathspot/colors'
import AlertIcon from '../../../../icons/AlertIcon'
import CircleCheck from '../../../../icons/CircleCheck'
import LinkWithRouter from '../../../../components/common/LinkWithRouter'
import { colors } from '../../../../theme/colors'
type TitleSectionProps = {
  sensor: SensorGridItem
  onFavoriteIconClick: (sensor: SensorGridItem) => void
  onTitleClick?: () => void
  onAlertIconClick: (sensor: SensorGridItem) => void
}

const getAlertIcon = (alertingActions: Array<InboundSensorAction>, reportDataType: SensorDataType) => {
  if (alertingActions.length === 0) {
    return <></>
  } else {
    const reducedAlertingActions = alertingActions.filter((action) => action.dataType === reportDataType)
    if (reducedAlertingActions.length > 0) {
      const action = getHighestCriticalityItem(reducedAlertingActions)
      if (action) {
        const level = action.criticality
        switch (level.toLocaleUpperCase()) {
          case 'NONE':
            return <AlertIcon textColor="white" fillColor="gray" strokeColor="gray" />
          case 'LOW':
            return <AlertIcon textColor="white" fillColor={pathspotSecondary} strokeColor={pathspotSecondary} />
          case 'MEDIUM':
            return <AlertIcon textColor="white" fillColor="orange" strokeColor="orange" />
          case 'HIGH':
            return <AlertIcon textColor="white" fillColor="red" strokeColor="red" />

          default:
            return <></>
          //return <CircleCheck fillColor="green" outlineColor="green" strokeColor="white" />
        }
      }
    } else {
      return <></>
    }
  }
}

const SensorCardTitle: React.FC<TitleSectionProps> = ({ sensor, onAlertIconClick, onFavoriteIconClick }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flex: '0 0 auto',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: '0.1rem',
        marginBottom: '0.1rem',
        paddingBottom: '0.1rem',
      }}
    >
      <IconButton
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flex: '1 1 10%',
          alignItems: 'center',
          padding: '0.1rem',
          margin: '0.1rem',
        }}
        onClick={() => onAlertIconClick(sensor)}
      >
        {getAlertIcon(sensor.actionsOnAlert, sensor.reportDataType)}
      </IconButton>
      <LinkWithRouter
        to={`/sensors/${sensor.sensorId}`}
        sx={{
          display: 'flex',
          flex: '1 1 80%',
          lineHeight: 1.05,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          fontSize: `clamp(0.4rem, ${getDynamicRemFontSize(sensor.sensorName || '', 1.5, 0.75, 6)}, 2rem)`, // Scales dynamically
          fontWeight: 'bold',
          whiteSpace: 'normal',
          textOverflow: 'ellipsis',
          textDecoration: 'none',
          color: colors.sensor?.titleText,
          cursor: 'pointer', // Make it look clickable
          '&:hover': {
            color: pathspotSecondary, // Change color on hover
          },
          padding: 0,
          margin: 0,
          marginTop: '0.1rem',
        }}
      >
        {sensor.sensorName || ''}
      </LinkWithRouter>
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 10%',
          padding: '0.1rem',
          margin: '0.1rem',
          color: sensor.isFavorited ? 'yellow' : 'gray',
        }}
      ></Box>
    </Box>
  )
}

export default SensorCardTitle
// <IconButton
//   onClick={() => onFavoriteIconClick(sensor)}
//   sx={{
//     display: 'flex',
//     flex: '1 1 10%',
//     padding: '0.1rem',
//     margin: '0.1rem',
//     color: sensor.isFavorited ? 'yellow' : 'gray',
//   }}
// >
//   {sensor.isFavorited ? <StarIcon /> : <StarBorderIcon />}
// </IconButton>
