import React from 'react'
import { ToggleButtonGroup, ToggleButton } from '@mui/material'
import { v4 as uuidv4 } from 'uuid'

const groupKey = uuidv4()

const UnitToggler = (props: any) => {
  const { onChange, currentUnit, unitOptions, viewOnly } = props
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={currentUnit}
      color="primary"
      // className='mx-4'
      onChange={(e: any) => {
        onChange(e.target.value)
      }}
      disabled={viewOnly}
    >
      {unitOptions?.map((option: any) => {
        return (
          <ToggleButton key={`${groupKey}-unit-toggle-optiom-${option.label}`} value={option.value}>
            {option.label}
          </ToggleButton>
        )
      })}
    </ToggleButtonGroup>
  )
}
export default UnitToggler
