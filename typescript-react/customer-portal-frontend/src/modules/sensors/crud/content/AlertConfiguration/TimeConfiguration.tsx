import React, { FC } from 'react'
import { ToggleButtonGroup, ToggleButton } from '@mui/material'
import { TimeUnit } from '../../../../../webapp-lib/pathspot-react/api/time/time.types'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'

type Props = {
  label: any
  value: any
  unit: any
  placeholder: any
  onValueChange: any
  viewOnly: any
  onUnitChange: any
}

const TimeConfiguration: FC<Props> = (props) => {
  const { label, value, unit, placeholder, onValueChange, viewOnly, onUnitChange } = props
  return (
    <Atomic.PContainer width="100%" margin={{ marginBottom: '0.75rem' }}>
      <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.25rem' }}>
        <Atomic.PInputPrepend label={label} />
        <Atomic.PTextInput
          isGroup
          width="40%"
          placeholder={placeholder}
          callback={(val: any) => {
            onValueChange(parseFloat(val?.replace(/[^0-9]/g, '')))
          }}
          value={value}
          readOnly={viewOnly}
        />
        <Atomic.PInputAppend>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={unit}
            color="primary"
            onChange={(e: any) => {
              onUnitChange(e.target.value)
            }}
            disabled={viewOnly}
          >
            <ToggleButton value={TimeUnit.minutes}>min</ToggleButton>
            <ToggleButton value={TimeUnit.hours}>hr</ToggleButton>
            <ToggleButton value={TimeUnit.days}>day</ToggleButton>
          </ToggleButtonGroup>
        </Atomic.PInputAppend>
      </Atomic.PContainer>
    </Atomic.PContainer>
  )
}
export default TimeConfiguration
