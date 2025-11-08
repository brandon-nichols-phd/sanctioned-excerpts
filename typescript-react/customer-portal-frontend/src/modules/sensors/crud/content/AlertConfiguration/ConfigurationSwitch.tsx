import { CSwitch } from '@coreui/react'
import React from 'react'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'

const ConfigurationSwitch = (props: any) => {
  const { name, onChange, value, onColor, offColor, label, viewOnly } = props
  return (
    <Atomic.PContent isRow margin={{ marginLeft: '0.5rem', marginBottom: '2rem' }}>
      <CSwitch
        name={name}
        className={'mx-2'}
        variant={'3d'}
        color={'success'}
        checked={value}
        labelOn={'\u2713'}
        labelOff={'\u2715'}
        onChange={(val: any) => {
          onChange(val?.target?.checked)
        }}
        disabled={viewOnly}
      />
      <Atomic.PItemText isRow displayText={label} margin={{ marginLeft: '0.25rem' }} />
    </Atomic.PContent>
  )
}

export default ConfigurationSwitch
