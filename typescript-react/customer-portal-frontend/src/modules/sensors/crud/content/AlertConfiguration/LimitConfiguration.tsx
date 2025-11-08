import React from 'react'
import { Atomic, FLOAT_MASK, math } from '../../../../../webapp-lib/pathspot-react'
import UnitToggler from './UnitToggler'
import { isNullOrUndefined } from '../../../../../webapp-lib/pathspot-react/api/types/type-utils'

const round = math.format.roundFloat

const LimitConfiguration = (props: any) => {
  const { label, errors, value, unit, placeholder, name, onValueChange, viewOnly, onUnitChange, errorLabel, unitOptions, limit } = props
  return (
    <Atomic.PContainer width="100%" margin={{ marginBottom: '0.75rem' }}>
      <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.25rem' }}>
        <Atomic.PInputPrepend label={limit?.label} />

        <Atomic.PTextInput
          isGroup
          width="50%"
          placeholder={placeholder}
          callback={(val: any) => {
            onValueChange(parseFloat(val?.replace(FLOAT_MASK, '')))
          }}
          value={!isNullOrUndefined(limit?.value) ? (limit.value === 0 ? 0 : round(limit?.value)) : ''}
          readOnly={viewOnly}
        />
        <Atomic.PInputAppend label={limit?.unit?.value}>
          {unitOptions && (
            <UnitToggler currentUnit={limit?.unit?.value} onChange={onUnitChange} unitOptions={unitOptions} viewOnly={viewOnly} />
          )}
        </Atomic.PInputAppend>
      </Atomic.PContainer>

      <Atomic.PContent isRow justifyContent="flex-start" alignItems="center" width="100%" margin={{ marginBottom: '0.25rem' }}>
        <span className="text-danger ">{errors && errors[name] ? `${errorLabel} cannot be empty` : ''}</span>
      </Atomic.PContent>
    </Atomic.PContainer>
  )
}
export default LimitConfiguration
