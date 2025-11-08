import React from 'react'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'
import { debugBorder } from '../../../../../webapp-lib/pathspot-react/atomic/styles/containers'

const AlertType = (props: any) => {
  const { name, value, onChange, viewOnly, options, errors } = props
  return (
    <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.75rem' }} border={debugBorder()}>
      <Atomic.PInputPrepend label="Alert Type*" />
      <Atomic.PDropdownSelect
        isGroup
        width="80%"
        boxShadow="none"
        borderLeft={false}
        value={value}
        options={options}
        onChange={onChange}
        disabled={viewOnly}
      />
    </Atomic.PContainer>
  )
}
export default AlertType
