import React, { FC } from 'react'
import { useFormikContext } from 'formik'

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

import { AssignmentType, FormValues, TaskListDetailsResponse } from './data/task'

export const TaskAssigment: FC<{
  taskListDetails?: TaskListDetailsResponse
  disabled: boolean
  assignDisabled: boolean
  assignLgDisabled: boolean
}> = (props) => {
  const formik = useFormikContext<FormValues>()
  const locationOptions = [{ label: 'All', value: '-1' }].concat(
    Object.entries(props.taskListDetails?.possibleLocations || {}).map(([id, info]) => {
      return { label: info.name, value: id }
    })
  )

  return (
    <>
      <FormControl fullWidth>
        <FormLabel>Assigment Type</FormLabel>
        <RadioGroup row {...formik.getFieldProps('assignmentType')}>
          <FormControlLabel
            value={AssignmentType.Location}
            control={<Radio />}
            label="Location"
            disabled={props.disabled || props.assignLgDisabled}
          />
          <FormControlLabel
            value={AssignmentType.User}
            control={<Radio />}
            label="User"
            disabled={props.disabled || props.assignDisabled}
          />
        </RadioGroup>
      </FormControl>
      {formik.values.assignmentType === AssignmentType.Location && (
        <>
          <FormControl fullWidth>
            <Autocomplete
              fullWidth
              multiple
              disablePortal
              id="assignedLocations"
              isOptionEqualToValue={(option, value) => {
                return option.value === value.value
              }}
              options={locationOptions}
              renderInput={(params) => <TextField {...params} label="Please select a location." />}
              value={formik.values.assignedLocations}
              onChange={(event, locationOptions, reason, details) => {
                const hasAll = locationOptions.some((option) => option.value === '-1')
                const addedAll = reason === 'selectOption' && details?.option.value === '-1'

                if (hasAll && !addedAll) {
                  // We added a new option that wasn't all, but we had all selected previously
                  // Let's remove all
                  formik.setFieldValue(
                    'assignedLocations',
                    locationOptions.filter((option) => option.value !== '-1')
                  )
                  return
                }

                if (addedAll && locationOptions.length) {
                  // We selected All but user had some other options
                  // Remove other options
                  formik.setFieldValue('assignedLocations', [details.option])
                  return
                }

                formik.setFieldValue('assignedLocations', locationOptions)
              }}
              disabled={props.disabled || props.assignLgDisabled}
            />
          </FormControl>
          <FormControl fullWidth>
            <Autocomplete
              fullWidth
              multiple
              disablePortal
              id="assignedRoles"
              isOptionEqualToValue={(option, value) => {
                return option.value === value.value
              }}
              options={Object.entries(props.taskListDetails?.possibleRoles || {}).map(([id, role]) => {
                return { label: role, value: id }
              })}
              renderInput={(params) => <TextField {...params} label="Please select a role." />}
              value={formik.values.assignedRoles}
              onChange={(event, value) => {
                formik.setFieldValue('assignedRoles', value)
              }}
              disabled={props.disabled || props.assignDisabled}
            />
          </FormControl>
        </>
      )}
      {formik.values.assignmentType === AssignmentType.User && (
        <>
          <FormControl fullWidth>
            <Autocomplete
              disablePortal
              fullWidth
              multiple
              id="assignedUsers"
              isOptionEqualToValue={(option, value) => {
                return option.value === value.value
              }}
              options={Object.entries(props.taskListDetails?.possibleUsers || {}).map(([id, role]) => {
                return { label: role, value: id }
              })}
              renderInput={(params) => <TextField {...params} label="Please select a user." />}
              value={formik.values.assignedUsers}
              onChange={(event, value) => {
                formik.setFieldValue('assignedUsers', value)
              }}
              disabled={props.disabled || props.assignDisabled}
            />
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="timezoneLabel">Timezone</InputLabel>
            <Select labelId="timezoneLabel" id="timezone" label="Timezone" {...formik.getFieldProps('timezone')} disabled={props.disabled}>
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
              control={<Switch {...formik.getFieldProps({ name: 'shareAcrossUsers', type: 'checkbox' })} />}
              label="Share across users"
              disabled={props.disabled || props.assignDisabled}
            />
          </FormControl>
        </>
      )}
    </>
  )
}
