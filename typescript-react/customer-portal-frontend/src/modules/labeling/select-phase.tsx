import React, { FC, useState } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'

import { type OptionsForCustomer } from './item'

type SelectPhaseExtraProps = {
  open: boolean
  onClose: () => void
  onConfirm: (selectedPhase: OptionsForCustomer['possiblePhases'][number]) => void
  options: OptionsForCustomer['possiblePhases']
}

const SelectPhase: FC<SelectPhaseExtraProps> = (props) => {
  const [phaseIndex, setPhaseIndex] = useState(0)

  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Available Phases:</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ marginTop: 1 }}>
          <InputLabel id="phaseLabel">Phase</InputLabel>
          <Select
            labelId="phaseLabel"
            value={phaseIndex < props.options.length ? phaseIndex : ''}
            onChange={(event) => {
              setPhaseIndex(event.target.value as number)
            }}
          >
            {props.options.map((phase, index) => (
              <MenuItem value={index} key={`PhaseOption-${phase.id}`}>
                {phase.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            props.onConfirm(props.options[phaseIndex]!)
          }}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SelectPhase
