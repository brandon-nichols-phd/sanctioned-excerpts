import React, { FC, useCallback, useState } from 'react'
import { useFormikContext, FieldArray, getIn } from 'formik'
import { match } from 'ts-pattern'
import _ from 'lodash'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Switch from '@mui/material/Switch'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import InfoIcon from '@mui/icons-material/Info'
import Grid from '@mui/material/Grid'

import { AssignmentType, FormValues, TaskListDetailsResponse, Override, createEmptyOverride } from './data/task'
import { TaskListSchedule } from './task-schedule'
import { getDateTime, icsToForm, reccurenceToText } from './data/scheduling'

export const TaskOverride: FC<{
  taskListDetails?: TaskListDetailsResponse
  editDisabled: boolean
  assignDisabled: boolean
  assignLgDisabled: boolean
}> = (props) => {
  const formik = useFormikContext<FormValues>()

  const [selectedOverride, setSelectedOverride] = useState<{ override: Override; scheduleIndex: number } | null>(null)
  const selectedIndex = formik.values.overrides.findIndex((override) => {
    return _.isEqual(selectedOverride?.override.id, override.id)
  })
  const overrideKey = `overrides.${selectedIndex}`
  const overrideValue = getIn(formik.values, overrideKey) as Override | undefined

  const save = useCallback(() => {
    formik.setFieldTouched(overrideKey, true)
    setSelectedOverride(null)

    // Remove from assingedLocations
    const overrideLocation = formik.getFieldProps(`${overrideKey}.assignedLocation`).value
    const hasAll = formik.values.assignedLocations.some((option) => option.value === '-1')

    if (hasAll) {
      const locationOptions = Object.entries(props.taskListDetails?.possibleLocations || {}).map(([id, info]) => {
        return { label: info.name, value: id }
      })
      formik.setFieldValue(
        'assignedLocations',
        locationOptions.filter((location) => location.value !== overrideLocation.value)
      )
    } else {
      formik.setFieldValue(
        'assignedLocations',
        formik.values.assignedLocations.filter((location) => location.value !== overrideLocation.value)
      )
    }
  }, [formik, overrideKey, props.taskListDetails?.possibleLocations])

  return (
    <Card sx={{ mt: 4 }}>
      <FieldArray name="overrides">
        {(arrayHelpers) => (
          <>
            <CardHeader
              title={
                <Grid container spacing={1}>
                  <Grid item> Alternative Schedules </Grid>
                  <Grid item>
                    <Tooltip title="Flexible scheduling with the 'Additional Schedule' section—ideal for customizing secondary routines and adapting to unique store hours. Easily manage variations, whether it's a day off or an early closure, by setting up unique start, due, and lock times per store in this section. If all of your stores follow the same schedule, just skip this section!">
                      <InfoIcon />
                    </Tooltip>
                  </Grid>
                </Grid>
              }
            />
            <CardContent>
              <TaskOverrideTable overrides={formik.values.overrides} selectOverride={setSelectedOverride} />
            </CardContent>
            <Dialog
              open={selectedOverride != null}
              onClose={() => {
                setSelectedOverride(null)
              }}
            >
              <DialogTitle>Alternative Schedule</DialogTitle>
              <DialogContent>
                <Box
                  sx={{
                    '& .MuiFormControl-root': { my: 1 },
                    '& .MuiCard-root': { mb: 2 },
                    '& .MuiCardHeader-root': { backgroundColor: 'lightgrey' },
                  }}
                >
                  <FormControl fullWidth>
                    <FormLabel>Assigment Type</FormLabel>
                    <RadioGroup
                      row
                      value={overrideValue?.type ?? AssignmentType.Location}
                      onChange={(e) => {
                        formik.setFieldValue(`${overrideKey}.type`, e.target.value)
                      }}
                    >
                      <FormControlLabel
                        value={AssignmentType.User}
                        control={<Radio />}
                        label="User"
                        disabled={props.editDisabled || props.assignDisabled}
                      />
                      <FormControlLabel
                        value={AssignmentType.Location}
                        control={<Radio />}
                        label="Location"
                        disabled={props.editDisabled || props.assignLgDisabled}
                      />
                    </RadioGroup>
                  </FormControl>
                  {overrideValue?.type === AssignmentType.Location && (
                    <>
                      <FormControl fullWidth>
                        <Autocomplete
                          fullWidth
                          disablePortal
                          id="overrideAssignedLocations"
                          isOptionEqualToValue={(option, value) => {
                            return option.value === value.value
                          }}
                          options={Object.entries(props.taskListDetails?.possibleLocations || {}).map(([id, info]) => {
                            return { label: info.name, value: id }
                          })}
                          renderInput={(params) => <TextField {...params} label="Please select a location." />}
                          value={overrideValue.assignedLocation}
                          onChange={(event, value) => {
                            formik.setFieldValue(`${overrideKey}.assignedLocation`, value)
                          }}
                          disabled={props.editDisabled || props.assignLgDisabled}
                        />
                      </FormControl>
                      <FormControl fullWidth>
                        <Autocomplete
                          fullWidth
                          multiple
                          disablePortal
                          id="overrideAssignedRoles"
                          isOptionEqualToValue={(option, value) => {
                            return option.value === value.value
                          }}
                          options={Object.entries(props.taskListDetails?.possibleRoles || {}).map(([id, role]) => {
                            return { label: role, value: id }
                          })}
                          renderInput={(params) => <TextField {...params} label="Please select a role." />}
                          value={overrideValue.assignedRoles}
                          onChange={(event, value) => {
                            formik.setFieldValue(`${overrideKey}.assignedRoles`, value)
                          }}
                          disabled={props.editDisabled || props.assignDisabled}
                        />
                      </FormControl>
                    </>
                  )}
                  {overrideValue?.type === AssignmentType.User && (
                    <>
                      <FormControl fullWidth>
                        {overrideValue.shareAcrossUsers && (
                          <Autocomplete
                            disablePortal
                            fullWidth
                            multiple
                            id="overrideAssignedUsers"
                            isOptionEqualToValue={(option, value) => {
                              return option.value === value.value
                            }}
                            options={Object.entries(props.taskListDetails?.possibleUsers || {}).map(([id, role]) => {
                              return { label: role, value: id }
                            })}
                            renderInput={(params) => <TextField {...params} label="Please select a user." />}
                            value={overrideValue.assignedUsers}
                            onChange={(event, value) => {
                              formik.setFieldValue(`${overrideKey}.assignedUsers`, value)
                            }}
                            disabled={props.editDisabled || props.assignDisabled}
                          />
                        )}
                        {!overrideValue.shareAcrossUsers && (
                          <Autocomplete
                            disablePortal
                            fullWidth
                            multiple={false}
                            id="overrideAssignedUsers"
                            isOptionEqualToValue={(option, value) => {
                              return option.value === value.value
                            }}
                            options={Object.entries(props.taskListDetails?.possibleUsers || {}).map(([id, role]) => {
                              return { label: role, value: id }
                            })}
                            renderInput={(params) => <TextField {...params} label="Please select a user." />}
                            value={overrideValue.assignedUsers[0]}
                            onChange={(event, value) => {
                              formik.setFieldValue(`${overrideKey}.assignedUsers`, [value])
                            }}
                            disabled={props.editDisabled || props.assignDisabled}
                          />
                        )}
                      </FormControl>
                      <FormControl fullWidth>
                        <InputLabel id="overrideTimezoneLabel">Timezone</InputLabel>
                        <Select
                          labelId="overrideTimezoneLabel"
                          id="overrideTimezone"
                          label="Timezone"
                          value={overrideValue.timezone}
                          onChange={(e) => {
                            formik.setFieldValue(`${overrideKey}.timezone`, e.target.value)
                          }}
                          disabled={props.editDisabled}
                        >
                          {Intl.supportedValuesOf('timeZone').map((timezone) => {
                            return (
                              <MenuItem key={timezone} value={timezone}>
                                {timezone}
                              </MenuItem>
                            )
                          })}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormControlLabel
                          control={<Switch {...formik.getFieldProps({ name: `${overrideKey}.shareAcrossUsers`, type: 'checkbox' })} />}
                          label="Share across users"
                          disabled={props.editDisabled}
                        />
                      </FormControl>
                    </>
                  )}
                  <Divider />
                  <TaskListSchedule
                    override
                    overrideKey={overrideKey}
                    editDisabled={props.editDisabled}
                    assignDisabled={props.assignDisabled}
                    assignLgDisabled={props.assignLgDisabled}
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    arrayHelpers.remove(selectedIndex)
                    setSelectedOverride(null)
                  }}
                  disabled={props.editDisabled}
                >
                  Delete
                </Button>
                <Button onClick={save} disabled={props.editDisabled}>
                  Save
                </Button>
              </DialogActions>
            </Dialog>
            <CardActions>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  const emptyOverride = createEmptyOverride()
                  arrayHelpers.push(emptyOverride)
                  setSelectedOverride({ override: emptyOverride, scheduleIndex: -1 })
                }}
                disabled={props.editDisabled}
              >
                Add Schedule
              </Button>
            </CardActions>
          </>
        )}
      </FieldArray>
    </Card>
  )
}

const TaskOverrideTable: FC<{
  overrides: Override[]
  selectOverride: (args: { override: Override; scheduleIndex: number }) => void
}> = (props) => {
  if (props.overrides.length === 0) {
    return (
      <Typography sx={{ fontStyle: 'italic' }} align="center">
        No Schedules
      </Typography>
    )
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell>Start</TableCell>
            <TableCell>End</TableCell>
            <TableCell>Locked</TableCell>
            <TableCell>Recurrence</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.overrides.map((override) => {
            const schedule = icsToForm(override.schedule)
            const label =
              override.type === AssignmentType.Location
                ? override.assignedLocation?.label
                : override.assignedUsers.map((user) => user.label).join(', ')

            return match(schedule)
              .with({ tag: 'Single' }, (singleState) => {
                return (
                  <TableRow
                    key={override.id[0]}
                    sx={{ '&:hover': { cursor: 'pointer' } }}
                    onClick={() => props.selectOverride({ override, scheduleIndex: 1 })}
                  >
                    <TableCell>{label}</TableCell>
                    <TableCell>{getDateTime(singleState.start, singleState)}</TableCell>
                    <TableCell>{getDateTime(singleState.end, singleState)}</TableCell>
                    <TableCell>{getDateTime(singleState.locked, singleState)}</TableCell>
                    <TableCell>{reccurenceToText(singleState)}</TableCell>
                  </TableRow>
                )
              })
              .with({ tag: 'Multiple' }, (multipleState) => {
                return (
                  <TableRow
                    key={`${override.id}`}
                    sx={{ '&:hover': { cursor: 'pointer' } }}
                    onClick={() => props.selectOverride({ override, scheduleIndex: 0 })}
                  >
                    <TableCell>{label}</TableCell>
                    <TableCell>{'Multiple'}</TableCell>
                    <TableCell>{'Multiple'}</TableCell>
                    <TableCell>{'Multiple'}</TableCell>
                    <TableCell>{reccurenceToText(multipleState)}</TableCell>
                  </TableRow>
                )
              })
              .exhaustive()
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
