import React from 'react'
import { Atomic } from '../../../../../webapp-lib/pathspot-react'

const OptionSelector = (props: any) => {
  const { onChange, isMulti, label, options, width, value, placeholder, viewOnly } = props
  return (
    <Atomic.PContainer isRow isGroup width="100%" margin={{ marginBottom: '0.75rem' }}>
      <Atomic.PInputPrepend label={label} />
      <Atomic.PDropdownSelect
        isGroup
        width={width}
        boxShadow="none"
        borderLeft={false}
        isMulti={isMulti}
        options={options}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={viewOnly}
      />
    </Atomic.PContainer>
  )
}
export default OptionSelector
