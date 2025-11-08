import React, { useEffect, useState, useRef } from 'react'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import { pathspotLavender, pathspotPrimary } from '../../../../../webapp-lib/pathspot-react/styles/ts/colors'
import _ from 'lodash'

interface Option {
  label: string
}

const options: Option[] = [
  { label: 'DEFROSTING' },
  { label: 'MAINTENANCE; ENG TEAM INFORMED' },
  { label: 'CLEANING AFTER SERVICE' },
  { label: 'SERVICE TIME' },
  { label: 'SETTING UP LINE TIME' },
  { label: 'DOOR WAS LEFT OPEN' },
  { label: 'OUT OF SERVICE; ENG TEAM INFORMED' },
  { label: 'POWER ISSUE; UNIT TRIPPED' },
  { label: 'NO ACTION NEEDED'},
]

const CorrectiveActionBox: React.FC<{ item: any; callback: (value: string, item: any) => void; value: string }> = (props) => {
  const { item, callback, value: _value } = props

  const [value, setValue] = useState<string | null>(_value || null)
  const [inputValue, setInputValue] = useState<string>(_value || '')
  const latestInputValue = useRef(inputValue)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (_value !== latestInputValue.current) {
      setValue(_value)
      setInputValue(_value)
      latestInputValue.current = _value
    }
  }, [_value])

  return (
    <Autocomplete
      sx={{
        display: 'flex',
        width: '100%',
        flexBasis: '90%',
        borderRadius: 0,
        '& .MuiOutlinedInput-root': {
          '& fieldset': { borderColor: 'rgb(92, 104, 115)' },
          '&:hover fieldset': { borderColor: pathspotPrimary },
          '&.Mui-focused fieldset': { borderColor: pathspotLavender },
          paddingLeft: '0.5rem',
          borderRadius: 0,
          lineHeight: '90%',
        },
      }}
      size="small"
      fullWidth
      freeSolo
      options={options.map((option) => option.label)}
      value={value}
      inputValue={inputValue}
      onChange={(_, newValue) => {
        setValue(newValue)
        setInputValue(newValue || '')
        latestInputValue.current = newValue || ''
      }}
      onInputChange={(_, newInputValue) => {
        latestInputValue.current = newInputValue
        setInputValue(newInputValue)
      }}
      renderInput={(params) => (
        <TextField {...params} inputRef={inputRef} onBlur={() => callback(latestInputValue.current, item)} label="Select or type..." />
      )}
    />
  )
}

export default CorrectiveActionBox
