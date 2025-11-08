import React, { FC, Fragment, useState } from 'react'
import { Formik, useFormikContext } from 'formik'

import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'

import { useCorrectiveAction } from './use-corrective-action'
import { Task, CorrectiveAction, TaskListDetailsResponse } from './data/task'

type Screens = 'Select' | 'Notification'
type Roles = TaskListDetailsResponse['possibleRoles']
type FormValues = {
  correctiveAction: CorrectiveAction | null
  failAlertEmail: Array<{ label: string; value: string }>
  failAlertSms: Array<{ label: string; value: string }>
  anyAlertEmail: Array<{ label: string; value: string }>
  anyAlertSms: Array<{ label: string; value: string }>
}

type Recipients = Task['correctiveActionRecipients']

export const TaskCorrectiveAction: FC<{
  customerId: number
  correctiveAction: CorrectiveAction | null
  recipients: Recipients | null
  open: boolean
  onSet: (ca: CorrectiveAction, recipients: Recipients) => void
  onClose: () => void
  possibleRoles: Roles
}> = (props) => {
  const { correctiveActions, isLoading } = useCorrectiveAction({ customerId: props.customerId })

  const [screen, setScreen] = useState<Screens>('Select')

  if (isLoading || !correctiveActions) {
    return null
  }

  const initialCA = correctiveActions.find((ca) => ca.id === props.correctiveAction?.id) ?? correctiveActions[0]

  return (
    <Formik<FormValues>
      enableReinitialize={true}
      validateOnChange={false}
      initialValues={{
        correctiveAction: initialCA!,
        failAlertEmail:
          props.recipients?.failAlertEmail.map((value) => ({ value: String(value), label: props.possibleRoles[value] ?? '' })) ?? [],
        failAlertSms: props.recipients?.failAlertSms.map((value) => ({ value: String(value), label: props.possibleRoles[value] ?? '' })) ?? [],
        anyAlertEmail: props.recipients?.anyAlertEmail.map((value) => ({ value: String(value), label: props.possibleRoles[value] ?? '' })) ?? [],
        anyAlertSms: props.recipients?.anyAlertSms.map((value) => ({ value: String(value), label: props.possibleRoles[value] ?? '' })) ?? [],
      }}
      onSubmit={async (values) => {
        if (values.correctiveAction) {
          props.onSet(values.correctiveAction, {
            failAlertEmail: values.failAlertEmail.map(({ value }) => parseInt(value, 10)),
            failAlertSms: values.failAlertSms.map(({ value }) => parseInt(value, 10)),
            anyAlertEmail: values.anyAlertEmail.map(({ value }) => parseInt(value, 10)),
            anyAlertSms: values.anyAlertSms.map(({ value }) => parseInt(value, 10)),
          })
          props.onClose()
          setScreen('Select')
        }
      }}
    >
      {(formik) => (
        <Dialog open={props.open} onClose={props.onClose}>
          <DialogTitle>Corrective Action</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                '& .MuiFormControl-root': { my: 1 },
                '& .MuiCard-root': { mb: 2 },
                '& .MuiCardHeader-root': { backgroundColor: 'lightgrey' },
              }}
            >
              <>
                {screen === 'Select' && <SelectScreen correctiveActions={correctiveActions ?? []} />}
                {screen === 'Notification' && <NotificationScreen possibleRoles={props.possibleRoles} />}
              </>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={props.onClose}>Cancel</Button>
            {screen === 'Select' && <Button onClick={() => formik.submitForm()}>Submit</Button>}
            {/* <Button onClick={() => setScreen('Notification')}>Next</Button> */}
            {screen === 'Notification' && (
              <>
                <Button onClick={() => setScreen('Select')}>Back</Button>
                <Button disabled={formik.values.correctiveAction == null} onClick={() => formik.submitForm()}>
                  Submit
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}
    </Formik>
  )
}

const SelectScreen: FC<{ correctiveActions: CorrectiveAction[] }> = (props) => {
  const formik = useFormikContext<FormValues>()

  return (
    <>
      <DialogContentText>
        Please Select a Corrective Action Form from the list below. If you do not see a corrective action for this task, please email
        PathSpot Support at support@pathspot.app with the questions and answers you would like to display and we will get them added within
        48 hours.
      </DialogContentText>
      <Typography variant="h5" my={2}>
        Select Form
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="caLabel">Corrective Action Form</InputLabel>
        <Select
          fullWidth
          labelId="caLabel"
          id="caform"
          label="Corrective Action Form"
          value={formik.values.correctiveAction?.id ?? ''}
          onChange={(e) => {
            if (e.target.value === '') {
              formik.setFieldValue('correctiveAction', null)
            }

            const correctiveAction = props.correctiveActions.find((ca) => ca.id === e.target.value)
            formik.setFieldValue('correctiveAction', correctiveAction ?? null)
          }}
        >
          {props.correctiveActions.map((ca) => {
            return (
              <MenuItem key={ca.id} value={ca.id ?? ''}>
                {ca.name}
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>
      <Typography variant="h5" my={2}>
        Form Preview
      </Typography>
      <FormControl>
        {formik.values.correctiveAction?.document?.map((task) => {
          return (
            <Fragment key={task.id}>
              <FormLabel id="formpreviewlabel">{task.name}</FormLabel>
              <RadioGroup name="formpreview">
                {task.options?.map((option, index) => {
                  return <FormControlLabel key={index} control={<Radio />} label={option} />
                })}
              </RadioGroup>
            </Fragment>
          )
        })}
      </FormControl>
    </>
  )
}

const NotificationScreen: FC<{ possibleRoles: Roles }> = (props) => {
  const formik = useFormikContext<FormValues>()

  const options = Object.entries(props.possibleRoles || {}).map(([id, role]) => {
    return { label: role, value: id }
  })
  return (
    <>
      <DialogContentText>
        Please Define Below the alerts you want to receive and who should be notified. You can select multiple roles
      </DialogContentText>
      <Typography variant="h5" my={2}>
        When a Corrective Action has Failed
      </Typography>
      <FormControl fullWidth>
        <Autocomplete
          fullWidth
          multiple
          disablePortal
          id="failAlertEmailRoles"
          isOptionEqualToValue={(option, value) => {
            return option.value === value.value
          }}
          options={options}
          renderInput={(params) => <TextField {...params} label="Email Alert" />}
          value={formik.values.failAlertEmail}
          onChange={(event, value) => {
            formik.setFieldValue('failAlertEmail', value)
          }}
        />
      </FormControl>
      <FormControl fullWidth>
        <Autocomplete
          fullWidth
          multiple
          disablePortal
          id="failAlertSmsRoles"
          isOptionEqualToValue={(option, value) => {
            return option.value === value.value
          }}
          options={options}
          renderInput={(params) => <TextField {...params} label="Text Alert" />}
          value={formik.values.failAlertSms}
          onChange={(event, value) => {
            formik.setFieldValue('failAlertSms', value)
          }}
        />
      </FormControl>
      <Typography variant="h5" my={2}>
        Any response is submitted for a Corrective Action
      </Typography>
      <FormControl fullWidth>
        <Autocomplete
          fullWidth
          multiple
          disablePortal
          id="anyAlertEmailRoles"
          isOptionEqualToValue={(option, value) => {
            return option.value === value.value
          }}
          options={options}
          renderInput={(params) => <TextField {...params} label="Email Alert" />}
          value={formik.values.anyAlertEmail}
          onChange={(event, value) => {
            formik.setFieldValue('anyAlertEmail', value)
          }}
        />
      </FormControl>
      <FormControl fullWidth>
        <Autocomplete
          fullWidth
          multiple
          disablePortal
          id="anyAlertSmsRoles"
          isOptionEqualToValue={(option, value) => {
            return option.value === value.value
          }}
          options={options}
          renderInput={(params) => <TextField {...params} label="Text Alert" />}
          value={formik.values.anyAlertSms}
          onChange={(event, value) => {
            formik.setFieldValue('anyAlertSms', value)
          }}
        />
      </FormControl>
    </>
  )
}
