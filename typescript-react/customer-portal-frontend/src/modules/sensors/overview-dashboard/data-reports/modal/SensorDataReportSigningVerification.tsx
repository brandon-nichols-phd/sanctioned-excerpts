import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableBody, TableCell, TableRow, TableHead } from '@mui/material'
import { ReportTableRow } from '../sensor-data-reports.types'
import { pathspotPrimary, pathspotRed, pathspotWhite } from '../../../../../webapp-lib/pathspot-react/styles/ts/colors'

interface ConfirmationModalProps {
  open: boolean
  title: string
  onSignAnyway: { onConfirm: () => void; invalidData: Array<ReportTableRow> }
  onGoBack: () => void
  onClose: () => void
}

const SensorDataReportSigningVerification: React.FC<ConfirmationModalProps> = ({ open, title, onSignAnyway, onGoBack, onClose }) => {
  const { onConfirm, invalidData } = onSignAnyway
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: pathspotWhite, backgroundColor: pathspotPrimary }}>{title}</DialogTitle>
      <DialogContent>
        <Table>
          <TableHead>
            <TableCell>{'Sensor Name'}</TableCell>
            <TableCell>{'Sensor Value'}</TableCell>
            <TableCell>{'Sensor Limit'}</TableCell>
          </TableHead>
          <TableBody>
            {invalidData.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.sensorName}</TableCell>
                <TableCell sx={{ color: pathspotRed }}>{row.temperature}</TableCell>
                <TableCell>{row.temperatureExceeded || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onGoBack} color="secondary" variant="outlined">
          Go Back
        </Button>
        <Button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          sx={{ backgroundColor: pathspotPrimary }}
          variant="contained"
        >
          Sign Anyway
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SensorDataReportSigningVerification
