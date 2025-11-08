/**
 * @file SensorOverview.tsx
 * @description Parent component for rendering the sensor overview page. Contains the filters bar and usSensorOverview hook.
 *
 * @component SensorOverview
 * @example
 * ```tsx
 * < propA="value" propB={42} />
 * ```
 *
 * @param {object} props - The component props.
 * @param {string} props.propA - Description of propA.
 * @param {number} props.propB - Description of propB.
 * @returns {JSX.Element} The rendered component.
 */
import React from 'react'
import SensorOverviewModal from '../modal/SensorOverviewModal'
import { isUndefinedFiltersDisplayState } from '../../../filter-bar/filters.api'
import { ToastContainer } from 'react-toastify'
import { SensorGridContainer } from './SensorGridContainer'
import { SensorGridItem } from '../../api/sensor-types'
import { Box, Card, CardContent, Switch, Typography } from '@mui/material'
import { useSensorOverview } from '../context/useSensorOverview'
import { useAppTheme } from '../../../../theme/ThemeContext'
import LoadingSpinner from '../../../generic/LoadingSpinner'
import { SensorOverviewModalProvider } from '../modal/SensorOverviewModalProvider'

export type SensorCardCallbackSet = {
  handleFavoriteClick: (sensor: SensorGridItem) => void
  onSensorItemAlertClick: (sensor: SensorGridItem) => void
  onSensorItemClick: (sensor: SensorGridItem) => void
}

const SensorOverview = () => {
  const { tempInC, onTemperatureUnitToggle, filtersState, isLoading, reFocusFilters } = useSensorOverview()

  // console.debug('Filters state, tempInC, in sensor overview page is: ', { filtersState, tempInC })
  // console.debug('Switch toggle value is: ', { checkValue: !tempInC })

  const { theme } = useAppTheme()
  if (isUndefinedFiltersDisplayState(filtersState.display) || isLoading) {
    return <LoadingSpinner message="Retrieving Sensor Data...." />
  }

  return (
    <div>
      <ToastContainer />
      <SensorOverviewModalProvider onCloseExternal={reFocusFilters}>
        <SensorOverviewModal />
        <Card variant="outlined" sx={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.palette.grey[200],
              padding: theme.spacing(1.5),
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2">°C</Typography>
              <Switch
                size="small"
                checked={!tempInC}
                onChange={(e) => {
                  onTemperatureUnitToggle(!e.target.checked)
                }}
                color="primary"
              />
              <Typography variant="body2">°F</Typography>
            </Box>
          </Box>

          <CardContent sx={{ paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0, width: '100%' }}>
            <SensorGridContainer />
          </CardContent>
        </Card>
      </SensorOverviewModalProvider>
    </div>
  )
}
export default SensorOverview
