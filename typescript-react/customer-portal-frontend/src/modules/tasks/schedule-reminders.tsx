import React, { FC, useCallback } from 'react'

import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'

import { Recurrence } from './data/scheduling'

export const ScheduleReminders: FC<{
  recurrence: Recurrence | null
  reminder: number | null
  onChange: (reminder: number | null) => void
  disabled: boolean
}> = (props) => {
  const { onChange } = props
  const onReminderChange = useCallback(
    (e: SelectChangeEvent<number>) => {
      const reminder = e.target.value as number
      onChange(reminder === -1 ? null : reminder)
    },
    [onChange]
  )

  if (props.recurrence == null) {
    return (
      <FormControl fullWidth>
        <InputLabel id="reminderLabel">Reminders</InputLabel>
        <Select
          labelId="reminderLabel"
          id="reminder"
          label="Reminder"
          value={props.reminder ?? -1}
          onChange={onReminderChange}
          disabled={props.disabled}
        >
          <MenuItem value={-1}>None</MenuItem>
          <MenuItem value={900}>15 minutes before</MenuItem>
          <MenuItem value={1800}>30 minutes before</MenuItem>
          <MenuItem value={3600}>1 hour before</MenuItem>
          <MenuItem value={7100}>2 hours before</MenuItem>
        </Select>
      </FormControl>
    )
  }

  switch (props.recurrence) {
    case Recurrence.DAILY: {
      return (
        <FormControl fullWidth>
          <InputLabel id="reminderLabel">Reminders</InputLabel>
          <Select
            labelId="reminderLabel"
            id="reminder"
            label="Reminder"
            value={props.reminder ?? -1}
            onChange={onReminderChange}
            disabled={props.disabled}
          >
            <MenuItem value={-1}>None</MenuItem>
            <MenuItem value={900}>15 minutes before</MenuItem>
            <MenuItem value={1800}>30 minutes before</MenuItem>
            <MenuItem value={3600}>1 hour before</MenuItem>
            <MenuItem value={7100}>2 hours before</MenuItem>
          </Select>
        </FormControl>
      )
    }
    case Recurrence.WEEKLY_ON_MONDAY: {
      return (
        <FormControl fullWidth>
          <InputLabel id="reminderLabel">Reminders</InputLabel>
          <Select
            labelId="reminderLabel"
            id="reminder"
            label="Reminder"
            value={props.reminder ?? -1}
            onChange={onReminderChange}
            disabled={props.disabled}
          >
            <MenuItem value={-1}>None</MenuItem>
            <MenuItem value={0}>Day of</MenuItem>
            <MenuItem value={86400}>1 day before</MenuItem>
            <MenuItem value={172800}>2 days before</MenuItem>
          </Select>
        </FormControl>
      )
    }
    case Recurrence.FIRST_DAY_OF_MONTH: {
      return (
        <FormControl fullWidth>
          <InputLabel id="reminderLabel">Reminders</InputLabel>
          <Select
            labelId="reminderLabel"
            id="reminder"
            label="Reminder"
            value={props.reminder ?? -1}
            onChange={onReminderChange}
            disabled={props.disabled}
          >
            <MenuItem value={-1}>None</MenuItem>
            <MenuItem value={0}>Day of</MenuItem>
            <MenuItem value={86400}>1 day before</MenuItem>
            <MenuItem value={172800}>2 days before</MenuItem>
            <MenuItem value={604799}>1 week before</MenuItem>
            <MenuItem value={1209600}>2 weeks before</MenuItem>
          </Select>
        </FormControl>
      )
    }
    case Recurrence.CUSTOM: {
      return null
    }
  }
}
