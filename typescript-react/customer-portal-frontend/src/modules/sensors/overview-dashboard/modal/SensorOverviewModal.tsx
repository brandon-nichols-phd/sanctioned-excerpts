import React from 'react'

import { ContextFilterState, FilteredDashboards } from '../../../filter-bar/filters-bar.types'
import { initSensorFiltersState } from '../../api/sensor-api.api'
import FiltersBarProvider from '../../../filter-bar/FiltersBarProvider'
import AlertSuppressionModal from './AlertSuppressionModal'
import { useSensorOverviewModal } from './use-sensor-overview-modal'
import { OverviewModalContext } from './SensorOverviewModalProvider'
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useAppTheme } from '../../../../theme/ThemeContext'
import { getFiltersForSensorGraph } from '../graphs/graphDataFetcher'
import { SensorGraphModal } from '../graphs/SensorGraphModal'
import { SensorGraphProvider } from '../graphs/SensorGraphProvider'

type SensorOverviewModalProps = {
  onCloseExternal?: () => void
}

const pageFilterContext = FilteredDashboards.SensorsModal

const SensorOverviewModal = ({ onCloseExternal }: SensorOverviewModalProps) => {
  const { showModal, clearModal, modalContext, singleSensorCardData } = useSensorOverviewModal()
  const { theme } = useAppTheme()

  if (!showModal) {
    return <></>
  }

  return (
    <div>
      {modalContext === OverviewModalContext.sensorItemGraph && singleSensorCardData !== null && (
        <Dialog
          open={showModal}
          onClose={clearModal}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '0.5rem',
              boxShadow: 'none',
              padding: 0,
            },
          }}
        >
          <Box
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              width: '100%',
            }}
          >
            <DialogTitle sx={{ p: 0, m: 0, backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
              <Typography
                variant="h6"
                sx={{ color: theme.palette.primary.contrastText, fontWeight: 'normal', margin: '0.5rem' }}
                gutterBottom
              >
                Sensor Data
              </Typography>
            </DialogTitle>

            <IconButton onClick={clearModal} sx={{ color: 'inherit' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <DialogContent>
            <SensorGraphProvider cardData={singleSensorCardData}>
              <SensorGraphModal clearModal={clearModal} />
            </SensorGraphProvider>
          </DialogContent>
        </Dialog>
      )}
      {modalContext === OverviewModalContext.sensorItemAlertSuppression && (
        <AlertSuppressionModal showModal={showModal} closeModal={clearModal} sensorCardData={singleSensorCardData} />
      )}
    </div>
  )
}
export default SensorOverviewModal
