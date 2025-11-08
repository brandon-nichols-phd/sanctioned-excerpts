import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import { pathspotPrimary, pathspotWhite } from '../../../../../webapp-lib/pathspot-react/styles/ts/colors'

type NoSelectionsType = {
  visible: boolean
  setDisplayState: (newState: boolean) => unknown
}

export const NoSelections: React.FC<NoSelectionsType> = ({ visible, setDisplayState }) => {
  const onClose = () => setDisplayState(false)

  return (
    <Dialog open={visible} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: pathspotWhite, backgroundColor: pathspotPrimary }}>{'No Items Selected'}</DialogTitle>
      <DialogContent sx={{ color: pathspotPrimary, backgroundColor: pathspotWhite, marginTop: '2rem', fontSize: '1.5rem' }}>
        {'At least one item must be checked to sign form.'}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose()
          }}
          sx={{ backgroundColor: pathspotPrimary }}
          variant="contained"
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  )
}
