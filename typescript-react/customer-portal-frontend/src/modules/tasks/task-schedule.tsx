import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react'
import { useField, useFormikContext } from 'formik'
import { RRule, Frequency } from 'rrule'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { match, P } from 'ts-pattern'

import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import Switch from '@mui/material/Switch'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import InfoIcon from '@mui/icons-material/Info'
import Alert from '@mui/material/Alert'

import { LockedTime } from './locked-time'
import { FormValues, TaskListDetailsResponse } from './data/task'
import { TaskCustomSchedule } from './task-custom-schedule'
import { ScheduleReminders } from './schedule-reminders'
import { TaskAssigment } from './task-assigments'
import { TaskOverride } from './task-override'
import { DAYS, Recurrence, updateRecurrence, formToIcs, frequencyToReccurence, customScheduleText } from './data/scheduling'
import { useScheduleState, ScheduleState, ScheduleDispatch, SingleScheduleState } from './use-schedule-state'

export const TaskListSchedule: FC<{
  taskListDetails?: TaskListDetailsResponse
  override?: boolean
  overrideKey?: string
  save?: () => void
  editDisabled: boolean
  assignDisabled: boolean
  assignLgDisabled: boolean
}> = (props) => {
  const key = props.override ? `${props.overrideKey}.schedule` : 'schedule'
  const [scheduleField, scheduleMeta, scheduleHelpers] = useField<FormValues['schedule']>(key)
  const [nameField] = useField<FormValues['name']>('name')
  const { isSubmitting } = useFormikContext()

  const [state, dispatch] = useScheduleState({ schedule: scheduleField.value, defaultName: nameField.value })

  const repeats = !!state.recurrence

  useEffect(() => {
    dispatch({ type: 'setName', value: nameField.value })
  }, [nameField.value])

  useEffect(() => {
    // helpers not added to dependencies because it changes in each render and causes infinite render
    scheduleHelpers.setValue(formToIcs(state))
  }, [state])

  return (
    <Card>
      <CardHeader
        title={
          props.taskListDetails ? (
            <Grid container spacing={1}>
              <Grid item>Default Schedule</Grid>
              <Grid item>
                <Tooltip title="Plan your task lists on the 'Default Schedule' section - This will be the default configuration applied to the majority of your stores. Easily set up One Time, Daily, Weekly, Monthly lists, or create custom schedules for your tasks. Tailor each occurrence with start, due, and lock times to regulate submission windows and ensure timely completion of key operational procedures. Personalize names for task lists appearing multiple times a day for easy identification.">
                  <InfoIcon />
                </Tooltip>
              </Grid>
            </Grid>
          ) : (
            'Schedule'
          )
        }
      />
      <CardContent>
        <Box>
          {scheduleMeta.error && <Alert severity="error">{scheduleMeta.error}</Alert>}
          {props.taskListDetails && (
            <TaskAssigment
              taskListDetails={props.taskListDetails}
              disabled={props.editDisabled}
              assignDisabled={props.assignDisabled}
              assignLgDisabled={props.assignLgDisabled}
            />
          )}
          <FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={repeats}
                  onChange={() => {
                    if (repeats) {
                      dispatch({ type: 'changeRecurrence', value: null })
                    } else {
                      dispatch({
                        type: 'changeRecurrence',
                        value: new RRule({
                          freq: Frequency.DAILY,
                          byweekday: [0, 1, 2, 3, 4, 5, 6],
                        }),
                      })
                    }
                  }}
                />
              }
              label="Repeats"
              disabled={props.editDisabled}
            />
          </FormControl>
          {match([repeats, state])
            .returnType<ReactNode>()
            .with([false, { tag: 'Single' }], ([, singleState]) => (
              <NonRecurringSchedule state={singleState} dispatch={dispatch} disabled={props.editDisabled} />
            ))
            .with([true, P._], () => <RecurringSchedule state={state} dispatch={dispatch} disabled={props.editDisabled} />)
            .otherwise(() => null)}
          {props.taskListDetails && (
            <TaskOverride
              taskListDetails={props.taskListDetails}
              editDisabled={props.editDisabled}
              assignDisabled={props.assignDisabled}
              assignLgDisabled={props.assignLgDisabled}
            />
          )}
        </Box>
      </CardContent>
      {props.save && (
        <CardActions>
          <Button disabled={isSubmitting || props.editDisabled} onClick={props.save} variant="contained" type="button">
            Save
          </Button>
        </CardActions>
      )}
    </Card>
  )
}

const NonRecurringSchedule: FC<{ state: SingleScheduleState; dispatch: ScheduleDispatch; disabled: boolean }> = ({
  state,
  dispatch,
  disabled,
}) => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  return (
    <Grid container spacing={1}>
      <Grid item xs={6}>
        <DatePicker
          selected={state.start}
          onChange={(date) => {
            if (date) {
              dispatch({ type: 'setDate', dateType: 'Start', value: date })
            }
          }}
          showTimeSelect
          timeIntervals={15}
          timeCaption="Time"
          dateFormat="MM/dd/yyyy h:mm aa"
          maxDate={state.end}
          customInput={<TextField fullWidth label="Start Time" />}
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={6}>
        <DatePicker
          selected={state.end}
          onChange={(date) => {
            if (date) {
              dispatch({ type: 'setDate', dateType: 'End', value: date })
            }
          }}
          showTimeSelect
          timeIntervals={15}
          timeCaption="Time"
          dateFormat="MM/dd/yyyy h:mm aa"
          minDate={state.start}
          customInput={<TextField fullWidth label="End Time" />}
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={6}>
        <LockedTime
          label="Locked Time"
          date={state.locked}
          recurrence={null}
          minTime={state.end}
          onChange={(date) => {
            dispatch({ type: 'setLockedDate', value: date })
          }}
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={6} />
      <Grid item xs={6}>
        <ScheduleReminders
          recurrence={null}
          reminder={state.reminder}
          onChange={(reminder) => {
            dispatch({ type: 'setReminder', value: reminder })
          }}
          disabled={disabled}
        />
      </Grid>
    </Grid>
  )
}

const RecurringSchedule: FC<{ state: ScheduleState; dispatch: ScheduleDispatch; disabled: boolean }> = ({ state, dispatch, disabled }) => {
  const [openCustom, setOpenCustom] = useState<boolean>(false)
  const recurrence: Recurrence = useMemo(() => {
    return frequencyToReccurence(state)
  }, [state])
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  return (
    <Grid container spacing={1}>
      <Grid item xs={12}>
        <FormControl sx={{ minWidth: '5%' }}>
          <InputLabel id="recurrenceLabel">Recurrence</InputLabel>
          <Select
            labelId="recurrenceLabel"
            id="recurrence"
            label="Recurrence"
            value={recurrence}
            onChange={(event) => {
              switch (event.target.value as Recurrence) {
                case Recurrence.DAILY: {
                  dispatch({
                    type: 'changeRecurrence',
                    value: new RRule({
                      freq: RRule.DAILY,
                      byweekday: [0, 1, 2, 3, 4, 5, 6],
                    }),
                  })
                  break
                }
                case Recurrence.WEEKLY_ON_MONDAY: {
                  dispatch({ type: 'changeRecurrence', value: new RRule({ freq: RRule.WEEKLY, byweekday: [RRule.MO] }) })
                  break
                }
                case Recurrence.FIRST_DAY_OF_MONTH: {
                  dispatch({ type: 'changeRecurrence', value: new RRule({ freq: RRule.MONTHLY, bymonthday: 1 }) })
                  break
                }
                case Recurrence.CUSTOM: {
                  dispatch({
                    type: 'changeRecurrence',
                    value: new RRule({
                      dtstart: null,
                      freq: RRule.DAILY,
                      byweekday: [0, 1, 2, 3, 4, 5, 6],
                    }),
                  })
                  setOpenCustom(true)
                  break
                }
              }
            }}
            disabled={disabled}
          >
            <MenuItem value={Recurrence.DAILY}>Daily</MenuItem>
            <MenuItem value={Recurrence.WEEKLY_ON_MONDAY}>Weekly on Monday</MenuItem>
            <MenuItem value={Recurrence.FIRST_DAY_OF_MONTH}>First Day of the Month</MenuItem>
            <MenuItem value={Recurrence.CUSTOM}>Custom</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      {match([recurrence, state])
        .with([Recurrence.DAILY, { tag: 'Single' }], ([, singleState]) => {
          const weekdays = singleState.recurrence?.options.byweekday ?? []
          return (
            <>
              <Grid container spacing={1} item xs={12} mt={1} mb={2}>
                {DAYS.map((day) => {
                  const daySelected = weekdays.includes(day.weekday)
                  return (
                    <Grid key={day.weekday} item xs={'auto'}>
                      <Button
                        variant={daySelected ? 'contained' : 'outlined'}
                        onClick={() => {
                          const newDays = daySelected ? weekdays.filter((d) => d !== day.weekday) : weekdays.concat([day.weekday]).sort()

                          dispatch({
                            type: 'setRecurrence',
                            value: updateRecurrence(state.recurrence, {
                              byweekday: newDays,
                            }),
                          })
                        }}
                        disabled={disabled}
                      >
                        {day.toString()}
                      </Button>
                    </Grid>
                  )
                })}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Assignment Name"
                  value={singleState.name}
                  onChange={(e) => {
                    dispatch({ type: 'setName', value: e.target.value })
                  }}
                  disabled={disabled}
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
                  minTime={startOfDay}
                  maxTime={endOfDay}
                  customInput={<TextField fullWidth label="Start Time" />}
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
                />
              </Grid>
              <Grid item xs={6} />
              <Grid item xs={6}>
                <DatePicker
                  selected={state.recurrence?.origOptions.until}
                  onChange={(date) => {
                    dispatch({
                      type: 'setRecurrence',
                      value: new RRule({
                        ...(state.recurrence?.origOptions || {}),
                        until: date,
                      }),
                    })
                  }}
                  customInput={<TextField fullWidth label="Repeat Until" />}
                  disabled={disabled}
                />
              </Grid>
              <Grid item xs={6}>
                <ScheduleReminders
                  recurrence={recurrence}
                  reminder={singleState.reminder}
                  onChange={(reminder) => {
                    dispatch({ type: 'setReminder', value: reminder })
                  }}
                  disabled={disabled}
                />
              </Grid>
              <TaskCustomSchedule
                open={openCustom}
                onClose={() => setOpenCustom(false)}
                onSave={(state) => {
                  setOpenCustom(false)
                  dispatch({ type: 'updateState', state })
                }}
                initialState={state}
                disabled={disabled}
              />
            </>
          )
        })
        .with([Recurrence.WEEKLY_ON_MONDAY, { tag: 'Single' }], ([, singleState]) => (
          <>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assignment Name"
                value={singleState.name}
                onChange={(e) => {
                  dispatch({ type: 'setName', value: e.target.value })
                }}
                disabled={disabled}
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
                minTime={startOfDay}
                maxTime={endOfDay}
                customInput={<TextField fullWidth label="Start Time" />}
                disabled={disabled}
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
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                selected={state.recurrence?.origOptions.until}
                onChange={(date) => {
                  dispatch({
                    type: 'setRecurrence',
                    value: new RRule({
                      ...(state.recurrence?.origOptions || {}),
                      until: date,
                    }),
                  })
                }}
                customInput={<TextField fullWidth label="Repeat Until" />}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <ScheduleReminders
                recurrence={recurrence}
                reminder={singleState.reminder}
                onChange={(reminder) => {
                  dispatch({ type: 'setReminder', value: reminder })
                }}
                disabled={disabled}
              />
            </Grid>
          </>
        ))
        .with([Recurrence.FIRST_DAY_OF_MONTH, { tag: 'Single' }], ([, singleState]) => (
          <>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assignment Name"
                value={singleState.name}
                onChange={(e) => {
                  dispatch({ type: 'setName', value: e.target.value })
                }}
                disabled={disabled}
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
                minTime={startOfDay}
                maxTime={endOfDay}
                customInput={<TextField fullWidth label="Start Time" />}
                disabled={disabled}
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
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                selected={state.recurrence?.origOptions.until}
                onChange={(date) => {
                  dispatch({
                    type: 'setRecurrence',
                    value: new RRule({
                      ...(state.recurrence?.origOptions || {}),
                      until: date,
                    }),
                  })
                }}
                customInput={<TextField fullWidth label="Repeat Until" />}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <ScheduleReminders
                recurrence={recurrence}
                reminder={singleState.reminder}
                onChange={(reminder) => {
                  dispatch({ type: 'setReminder', value: reminder })
                }}
                disabled={disabled}
              />
            </Grid>
          </>
        ))
        .with([Recurrence.CUSTOM, P._], () => (
          <>
            <Typography
              align="center"
              m={1}
              sx={{
                '&': { fontStyle: 'italic' },
                '&::first-letter': { textTransform: 'uppercase' },
                whiteSpace: 'pre-line',
              }}
            >
              {customScheduleText(state)}
            </Typography>
            <Button variant="contained" color="primary" onClick={() => setOpenCustom(true)} disabled={disabled}>
              Edit
            </Button>
            <TaskCustomSchedule
              open={openCustom}
              onClose={() => setOpenCustom(false)}
              onSave={(state) => {
                setOpenCustom(false)
                dispatch({ type: 'updateState', state })
              }}
              initialState={state}
              disabled={disabled}
            />
          </>
        ))
        .otherwise(() => null)}
    </Grid>
  )
}
