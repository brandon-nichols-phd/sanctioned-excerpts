import React from 'react'
import { Typography, Box, Divider } from '@mui/material'
import { SensorCategory, SensorGridItem } from '../../api/sensor-types'
import { pathspotPrimary, pathspotSecondary, pathspotWhite } from '../../../../theme/colors-pathspot/colors'
import { SensorCard } from '../content/SensorCard'
import { SENSOR_CARD_WIDTH_REM } from '../../api/sensor-constants'

export interface SensorGridGroupContainerProps {
  category: SensorCategory
  group: Array<SensorGridItem>
  remWidth: number
}

export const SensorGridGroupContainer: React.FC<SensorGridGroupContainerProps> = ({ group, category, remWidth }) => {
  const groupLabel = group.length > 1 ? `${category} (${group.length})` : `${category}`
  return (
    <Box sx={{ p: '0.1rem', width: `${remWidth}rem` }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          justifyContent: 'center',
          p: 0,
          m: 0,
          border: `0.1rem solid ${pathspotSecondary}`,
          borderRadius: '1.5rem',
          backgroundColor: pathspotWhite,
          marginBottom: '0.35rem',
          marginRight: '0.5rem',
          marginLeft: '0.5rem',
        }}
      >
        <Typography variant="SensorCardGroup" sx={{ color: pathspotPrimary, fontWeight: 'bold', margin: '0.5rem' }} gutterBottom>
          {groupLabel}
        </Typography>
        <Divider sx={{ bgcolor: pathspotSecondary, height: '0.1rem', m: '0.5rem' }} />
        <Box
          sx={{
            display: 'inline-flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            p: 0,
            m: 0,
            paddingBottom: '0.35rem',
            marginTop: '0.25rem',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridAutoFlow: 'row',
              gridTemplateColumns: `repeat(auto-fit, minmax(${SENSOR_CARD_WIDTH_REM}rem, auto))`,
              width: 'fit-content',
              maxWidth: '100%',
              gap: 1,
              paddingBottom: '0.35rem',
            }}
          >
            {group.map((sensor) => {
              return <SensorCard key={sensor.sensorGridKey} sensor={sensor} />
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
