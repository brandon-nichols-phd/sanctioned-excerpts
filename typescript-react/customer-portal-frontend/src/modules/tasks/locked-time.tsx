import React, { FC } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import FormControl from '@mui/material/FormControl'
import TextField from '@mui/material/TextField'
import { RRule } from 'rrule'
import moment from 'moment'

export const LockedTime: FC<{
  label: string
  date: Date | null
  recurrence: RRule | null
  minTime: Date
  onChange: (date: Date | null) => void
  disabled: boolean
}> = (props) => {
  if (props.recurrence?.options.freq === RRule.DAILY) {
    return (
      <FormControl fullWidth>
        <DatePicker
          selected={props.date}
          onChange={props.onChange}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={15}
          timeCaption="Time"
          dateFormat="h:mm aa"
          minTime={props.minTime}
          maxTime={moment().endOf('day').toDate()}
          customInput={<TextField fullWidth label={props.label} />}
          disabled={props.disabled}
        />
      </FormControl>
    )
  }

  return (
    <FormControl fullWidth>
      <DatePicker
        selected={props.date}
        onChange={props.onChange}
        showTimeSelect
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="MM/dd/yyyy h:mm aa"
        minDate={props.minTime}
        customInput={<TextField fullWidth label={props.label} />}
      />
    </FormControl>
  )
}
