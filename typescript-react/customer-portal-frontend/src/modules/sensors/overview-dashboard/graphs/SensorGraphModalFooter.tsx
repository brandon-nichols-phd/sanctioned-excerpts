// SensorOverviewModalFooter content
import React from 'react'
import { Box, Button, Stack } from '@mui/material'

type SensorGraphModalFooterProps = {
  onPDF: () => void
  onExport: () => void
  onOkay: () => void
}

const SensorGraphModalFooter: React.FC<SensorGraphModalFooterProps> = ({ onPDF, onExport, onOkay }) => {
  return (
    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="primary" onClick={onPDF}>
          {'Create PDF'}
        </Button>
        <Button variant="outlined" color="primary" onClick={onExport}>
          {'Export to .csv'}
        </Button>
        <Button variant="text" onClick={onOkay}>
          {'Close Window'}
        </Button>
      </Stack>
    </Box>
  )
}

export default SensorGraphModalFooter
