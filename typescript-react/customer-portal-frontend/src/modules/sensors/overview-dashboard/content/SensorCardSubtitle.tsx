import React from 'react'
import { Box } from '@mui/material'
import { SensorGridItem } from '../../api/sensor-types'
import { getDynamicRemFontSize } from '../../api/sensor-api.api'
import LinkWithRouter from '../../../../components/common/LinkWithRouter'
import { useAppTheme } from '../../../../theme/ThemeContext'
import { colors } from '../../../../theme/colors'

type SubtitleSectionProps = {
  sensor: SensorGridItem
  onClick?: () => void
}

const SensorCardSubtitle: React.FC<SubtitleSectionProps> = ({ sensor }) => {
  const { theme } = useAppTheme()
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '100%',
        maxWidth: '100%',
      }}
    >
      <LinkWithRouter
        to={`/location-list/${sensor.locationId}`}
        sx={{
          flex: '1 1 100%',
          textAlign: 'center',
          fontSize: `clamp(0.5rem, ${getDynamicRemFontSize(sensor.locationName || '', 1.0, 0.75, 16)}, 1rem)`, // Scales dynamically
          fontWeight: 'bold',
          minWidth: '100%',
          ...theme.customStyles.customLinkStyling,
          color: colors.sensor?.subtitleText,
        }}
      >
        {sensor.locationName || ''}
      </LinkWithRouter>
    </Box>
  )
}

export default SensorCardSubtitle
