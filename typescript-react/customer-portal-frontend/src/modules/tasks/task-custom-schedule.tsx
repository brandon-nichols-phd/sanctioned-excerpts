import React, { FC, useEffect, useMemo } from 'react'
import 'react-toastify/dist/ReactToastify.css'
import { useField } from 'formik'
import { RRule, Frequency } from 'rrule'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { match } from 'ts-pattern'

import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

import { ScheduleReminders } from './schedule-reminders'
import { LockedTime } from './locked-time'
import { FormValues } from './data/task'
import { useScheduleState, ScheduleState, ScheduleDispatch } from './use-schedule-state'
import { DAYS, updateRecurrence, recurrencetoMonthly, getMonthlyRecurrence, MonthlyReccurrence, formatOrdinals } from './data/scheduling'

export const TaskCustomSchedule: FC<{
  open: boolean
  onClose: () => void
  onSave: (state: ScheduleState) => void
  override?: boolean
  overrideKey?: string
  initialState: ScheduleState
  disabled: boolean
}> = (props) => {
  const [nameField] = useField<FormValues['name']>('name')
  const [state, dispatch] = useScheduleState({ schedule: null, initialState: props.initialState, defaultName: nameField.value })

  useEffect(() => {
    // If initial and current state are both Single, make sure to carry state changes from broader schedule component into the custom schedule modal.
    // Does not apply for multi -> multi, multi -> single, or single -> multi.  Multi -> multi means no name field that could've changed in broader component and
    // Going from one state type to another cannot be done without navigating to the modal and THEN changing the count of recurring assignments.
    if (state.tag === 'Single' && props.initialState.tag === 'Single' && state.name !== props.initialState.name) {
      dispatch({ type: 'updateState', state: props.initialState })
    }
  }, [props.initialState, dispatch])

  const starOfDay = new Date()
  starOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Custom Schedule</DialogTitle>
      <DialogContentText sx={{ marginX: 5 }}>
        Note: Adding or removing checklist schedules below may impact your task list reports by creating additional checklist rows. If you
        need assistance, please contact PathSpot Support.
      </DialogContentText>
      <DialogContent>
        <Grid
          container
          spacing={1}
          alignItems="center"
          sx={{
            '& .MuiFormControl-root': { my: 1 },
          }}
        >
          <Grid item xs={2}>
            <TextField
              label="Every"
              type="number"
              onChange={(e) => {
                dispatch({
                  type: 'setRecurrence',
                  value: updateRecurrence(state.recurrence, {
                    interval: parseInt(e.target.value, 10),
                  }),
                })
              }}
              value={state.recurrence?.options.interval}
              disabled={props.disabled}
            />
          </Grid>
          <Grid item xs={10}>
            <FormControl fullWidth>
              <InputLabel id="freqLabel">Frequency</InputLabel>
              <Select
                labelId="freqLabel"
                id="freq"
                label="Frequency"
                value={state.recurrence?.origOptions.freq}
                onChange={(e) => {
                  if (typeof e.target.value === 'string') {
                    return
                  }

                  switch (e.target.value) {
                    case Frequency.DAILY:
                      dispatch({
                        type: 'setRecurrence',
                        value: updateRecurrence(state.recurrence, {
                          freq: e.target.value,
                          interval: 1,
                          bymonthday: null,
                          byweekday: [0, 1, 2, 3, 4, 5, 6],
                        }),
                      })
                      break
                    case Frequency.WEEKLY:
                      dispatch({
                        type: 'setRecurrence',
                        value: updateRecurrence(state.recurrence, {
                          freq: e.target.value,
                          interval: 1,
                          bymonthday: null,
                          byweekday: 0,
                        }),
                      })
                      break
                    case Frequency.MONTHLY:
                      dispatch({
                        type: 'setRecurrence',
                        value: updateRecurrence(state.recurrence, {
                          freq: e.target.value,
                          interval: 1,
                          bymonthday: null,
                          byweekday: RRule.MO.nth(1),
                        }),
                      })
                      break
                  }
                }}
                disabled={props.disabled}
              >
                <MenuItem value={Frequency.DAILY}>Day(s)</MenuItem>
                {/* TODO: Removing temporarily, add back */}
                {/* <MenuItem value={Frequency.WEEKLY}>Week(s)</MenuItem> */}
                {/* <MenuItem value={Frequency.MONTHLY}>Month(s)</MenuItem> */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <DatePicker
              selected={state.recurrence?.origOptions.until}
              onChange={(date) => {
                dispatch({
                  type: 'setRecurrence',
                  value: updateRecurrence(state.recurrence, {
                    until: date,
                  }),
                })
              }}
              customInput={<TextField fullWidth label="Repeat Until" />}
              disabled={props.disabled}
            />
          </Grid>
          <SchedulePicker state={state} dispatch={dispatch} disabled={props.disabled} />
          <Grid item xs={12} sx={{ marginY: 3 }}>
            <Divider variant="middle" sx={{ borderBottomWidth: 5 }} />
          </Grid>
          {match(state)
            .with({ tag: 'Single' }, (singleState) => (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Assignment Name"
                    value={singleState.name}
                    onChange={(e) => {
                      dispatch({ type: 'setName', value: e.target.value })
                    }}
                    disabled={props.disabled}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    selected={singleState.start}
                    onChange={(date) => {
                      if (date) {
                        dispatch({ type: 'setDate', dateType: 'Start', value: date })
                      }
                    }}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Time"
                    dateFormat="h:mm aa"
                    minTime={starOfDay}
                    maxTime={endOfDay}
                    customInput={<TextField fullWidth label="Start Time" />}
                    disabled={props.disabled}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    selected={singleState.end}
                    onChange={(date) => {
                      if (date) {
                        dispatch({ type: 'setDate', dateType: 'End', value: date })
                      }
                    }}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Time"
                    dateFormat="h:mm aa"
                    minTime={singleState.start}
                    maxTime={singleState.locked || endOfDay}
                    customInput={<TextField fullWidth label="End Time" />}
                    disabled={props.disabled}
                  />
                </Grid>
                <Grid item xs={6}>
                  <LockedTime
                    label="Locked Time"
                    date={singleState.locked}
                    recurrence={singleState.recurrence}
                    minTime={singleState.end}
                    onChange={(date) => {
                      dispatch({ type: 'setLockedDate', value: date })
                    }}
                    disabled={props.disabled}
                  />
                </Grid>
                <Grid item xs={6}>
                  <ScheduleReminders
                    recurrence={null}
                    reminder={singleState.reminder}
                    onChange={(reminder) => {
                      dispatch({ type: 'setReminder', value: reminder })
                    }}
                    disabled={props.disabled}
                  />
                </Grid>
              </>
            ))
            .with({ tag: 'Multiple' }, (multipleState) =>
              multipleState.dates.map((single, index) => (
                <Grid key={index} container spacing={1} alignItems="center">
                  <Grid item xs={3}>
                    <Typography>{formatOrdinals(index + 1)} Recurrence</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Assignment Name"
                      value={multipleState.names[index]}
                      onChange={(e) => {
                        dispatch({ type: 'setName', index: index, value: e.target.value })
                      }}
                      disabled={props.disabled}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DatePicker
                      selected={single.start}
                      onChange={(date) => {
                        if (date) {
                          dispatch({ type: 'setDate', dateType: 'Start', index: index, value: date })
                        }
                      }}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="h:mm aa"
                      minTime={starOfDay}
                      maxTime={endOfDay}
                      customInput={<TextField fullWidth label="Start Time" />}
                      disabled={props.disabled}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DatePicker
                      selected={single.end}
                      onChange={(date) => {
                        if (date) {
                          dispatch({ type: 'setDate', dateType: 'End', index: index, value: date })
                        }
                      }}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="h:mm aa"
                      minTime={single.start}
                      maxTime={single.locked || endOfDay}
                      customInput={<TextField fullWidth label="End Time" />}
                      disabled={props.disabled}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <LockedTime
                      label="Locked Time"
                      date={single.locked}
                      recurrence={multipleState.recurrence}
                      minTime={single.end}
                      onChange={(date) => {
                        dispatch({ type: 'setLockedDate', index: index, value: date })
                      }}
                      disabled={props.disabled}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <ScheduleReminders
                      recurrence={null}
                      reminder={multipleState.reminders[index]!}
                      onChange={(reminder) => {
                        dispatch({ type: 'setReminder', index, value: reminder })
                      }}
                      disabled={props.disabled}
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ marginY: 5 }}>
                    <Divider variant="middle" sx={{ borderBottomWidth: 5 }} />
                  </Grid>
                </Grid>
              ))
            )
            .run()}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            dispatch({ type: 'updateState', state: props.initialState })
            props.onClose()
          }}
        >
          Cancel
        </Button>
        <Button onClick={() => props.onSave(state)} disabled={props.disabled}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const SchedulePicker: FC<{ state: ScheduleState; dispatch: ScheduleDispatch; disabled: boolean }> = (props) => {
  const monthlyRecurrence = useMemo(() => {
    return recurrencetoMonthly(props.state.recurrence)
  }, [props.state.recurrence])
  return match([props.state.recurrence?.origOptions.freq, props.state])
    .with([RRule.DAILY, { tag: 'Single' }], ([, singleState]) => {
      const weekdays = singleState.recurrence?.options.byweekday ?? []
      return (
        <>
          <Grid container spacing={1} item xs={12} mt={1} mb={2}>
            {DAYS.map((day) => {
              const daySelected = weekdays.includes(day.weekday)
              return (
                <Grid key={day.weekday} item xs>
                  <Button
                    variant={daySelected ? 'contained' : 'outlined'}
                    onClick={() => {
                      const newDays = daySelected ? weekdays.filter((d) => d !== day.weekday) : weekdays.concat([day.weekday]).sort()

                      props.dispatch({
                        type: 'setRecurrenceOnly',
                        value: updateRecurrence(props.state.recurrence, {
                          byweekday: newDays,
                        }),
                      })
                    }}
                    disabled={props.disabled}
                  >
                    {day.toString()}
                  </Button>
                </Grid>
              )
            })}
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Repeat"
              type="number"
              value={1}
              inputProps={{
                min: 1,
                max: 12,
              }}
              onChange={(e) => {
                const numValue = parseInt(e.target.value, 10)
                // Add a new task recurrence when incrementing the TextField value
                if (numValue >= 1 && numValue <= 12) {
                  props.dispatch({
                    type: 'modifyMultiple',
                    value: 'add',
                    index: parseInt(e.target.value, 10),
                  })
                }
              }}
              onKeyDown={(e) => {
                // Block user from doing anything other than incrementing/decrementing value with arrows/arrow keys
                if (!['ArrowUp', 'ArrowDown', 'Tab', 'Shift'].includes(e.key)) {
                  e.preventDefault()
                }
              }}
              disabled={props.disabled}
              fullWidth
            />
          </Grid>
          <Grid item xs={10}>
            <Typography>x Day</Typography>
          </Grid>
        </>
      )
    })
    .with([RRule.DAILY, { tag: 'Multiple' }], ([, multipleState]) => {
      const weekdays = multipleState.recurrence?.options.byweekday ?? []
      return (
        <>
          <Grid container spacing={1} item xs={12} mt={1} mb={2}>
            {DAYS.map((day) => {
              const daySelected = weekdays.includes(day.weekday)
              return (
                <Grid key={day.weekday} item xs>
                  <Button
                    variant={daySelected ? 'contained' : 'outlined'}
                    onClick={() => {
                      const newDays = daySelected ? weekdays.filter((d) => d !== day.weekday) : weekdays.concat([day.weekday]).sort()

                      props.dispatch({
                        type: 'setRecurrenceOnly',
                        value: updateRecurrence(props.state.recurrence, {
                          byweekday: newDays,
                        }),
                      })
                    }}
                    disabled={props.disabled}
                  >
                    {day.toString()}
                  </Button>
                </Grid>
              )
            })}
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Repeat"
              type="number"
              value={multipleState.dates.length}
              inputProps={{
                min: 1,
                max: 12,
              }}
              onChange={(e) => {
                // Add a new task recurrence when incrementing, or remove the last recurrence when decrementing, the TextField value
                const length = parseInt(e.target.value, 10)

                if (length >= 1 && length <= 12) {
                  if (length < multipleState.dates.length) {
                    props.dispatch({
                      type: 'modifyMultiple',
                      value: 'remove',
                      index: length,
                    })
                  } else {
                    props.dispatch({
                      type: 'modifyMultiple',
                      value: 'add',
                      index: length,
                    })
                  }
                }
              }}
              onKeyDown={(e) => {
                // Block user from doing anything other than incrementing/decrementing value with arrows/arrow keys
                if (!['ArrowUp', 'ArrowDown', 'Tab', 'Shift'].includes(e.key)) {
                  e.preventDefault()
                }
              }}
              disabled={props.disabled}
              fullWidth
            />
          </Grid>
          <Grid item xs={10}>
            <Typography>x Day</Typography>
          </Grid>
        </>
      )
    })
    .with([RRule.WEEKLY, { tag: 'Single' }], ([, singleState]) => {
      const weekdays = singleState.recurrence?.options.byweekday ?? []
      return (
        <>
          <Grid container spacing={1} item xs={12} mt={1} mb={2}>
            {DAYS.map((day) => {
              const daySelected = weekdays.includes(day.weekday)
              return (
                <Grid key={day.weekday} item xs>
                  <Button
                    variant={daySelected ? 'contained' : 'outlined'}
                    onClick={() => {
                      const newDays = daySelected ? weekdays.filter((d) => d !== day.weekday) : weekdays.concat([day.weekday]).sort()

                      props.dispatch({
                        type: 'setRecurrence',
                        value: updateRecurrence(props.state.recurrence, {
                          byweekday: newDays,
                        }),
                      })
                    }}
                    disabled={props.disabled}
                  >
                    {day.toString()}
                  </Button>
                </Grid>
              )
            })}
          </Grid>
        </>
      )
    })
    .with([RRule.MONTHLY, { tag: 'Single' }], () => (
      <>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel id="repeatsOnLabel">Repeats On</InputLabel>
            <Select
              labelId="repeatsOnLabel"
              id="repeatsOn"
              label="Repeats On"
              value={monthlyRecurrence[0]}
              onChange={(e) => {
                const monthly = [e.target.value, monthlyRecurrence[1]] as MonthlyReccurrence
                props.dispatch({
                  type: 'setRecurrence',
                  value: updateRecurrence(props.state.recurrence, getMonthlyRecurrence(monthly)),
                })
              }}
              disabled={props.disabled}
            >
              <MenuItem value={1}>First</MenuItem>
              <MenuItem value={2}>Second</MenuItem>
              <MenuItem value={3}>Third</MenuItem>
              <MenuItem value={4}>Fourth</MenuItem>
              <MenuItem value={-1}>Last</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel id="ofTheMonthLabel">Of the Month</InputLabel>
            <Select
              labelId="ofTheMonthLabel"
              id="ofTheMonth"
              label="Of the Month"
              value={monthlyRecurrence[1]}
              onChange={(e) => {
                const monthly = [monthlyRecurrence[0], e.target.value] as MonthlyReccurrence
                props.dispatch({
                  type: 'setRecurrence',
                  value: updateRecurrence(props.state.recurrence, getMonthlyRecurrence(monthly)),
                })
              }}
              disabled={props.disabled}
            >
              <MenuItem value={0}>Monday</MenuItem>
              <MenuItem value={1}>Tuesday</MenuItem>
              <MenuItem value={2}>Wednesday</MenuItem>
              <MenuItem value={3}>Thursday</MenuItem>
              <MenuItem value={4}>Friday</MenuItem>
              <MenuItem value={5}>Saturday</MenuItem>
              <MenuItem value={6}>Sunday</MenuItem>
              <MenuItem value={7}>Day</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </>
    ))
    .otherwise(() => null)
}
