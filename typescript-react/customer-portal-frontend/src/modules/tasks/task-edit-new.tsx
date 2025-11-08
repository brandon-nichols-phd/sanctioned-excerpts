import React, { useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Formik, useFormikContext, useField } from 'formik'

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertColor } from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import InfoIcon from '@mui/icons-material/Info'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'

import { StyledSpinner } from '../../webapp-lib/pathspot-react'
import { pathspotPrimary } from '../../webapp-lib/pathspot-react/styles/ts/colors'
import { FormValues, getTasklistRestriction, getTaskFormSchema, TaskFormSchemaType, TaskListType } from './data/task'
import { Create, Edit, useTask } from './use-task'
import { TaskListSchedule } from './task-schedule'
import { TaskListConfigurationNew } from './task-configuration-new'
import { SelectInitialValues } from '../../components/select-initial-values'
import useAuthContext from '../../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../../api/constants'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'

const theme = createTheme({
  components: {
    MuiScopedCssBaseline: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
  },
  palette: {
    primary: { main: pathspotPrimary },
  },
})

const TASK_LIST_FORM_TOOLTIP_TEXT =
  "Craft your tasks here. Choose from various types: text, picture, yes/no, dates, times, temperatures and more. Don't miss adding subtasks to yes/no questions that might require additional details depending on the answer (for example take additional temperatures if a store section is open). Add corrective actions as warnings for unexpected responses based on limits."
const DEACTIVATE_TASK_TEXT = 'Deactivating this list will automatically remove it from the SafetySuite app.'
const CONFIRM_EDIT_WARNING_TEXT =
  'The changes you are about to make might create new assignments. This will cause future and past responses to be associated with different lists. Contact PathSpot Support if you need any help or support with this change.'
const CONFIRM_EDIT_TITLE_TEXT = 'Confirm Your Edits:'

type SnackbarStatus = 'success' | 'loading' | 'error' | 'none'
const getSnackbarAlertConfig = (status: SnackbarStatus) => {
  switch (status) {
    case 'none':
      return {
        open: false,
        autoHideDuration: null,
        alertSevirity: 'info' as AlertColor,
        message: '',
      }
    case 'loading':
      return {
        open: true,
        autoHideDuration: null,
        alertSevirity: 'info' as AlertColor,
        message: 'Saving configuration...',
      }
    case 'success':
      return {
        open: true,
        autoHideDuration: 6000,
        alertSevirity: 'success' as AlertColor,
        message: 'Saved configuration!',
      }
    case 'error':
      return {
        open: true,
        autoHideDuration: 6000,
        alertSevirity: 'error' as AlertColor,
        message: 'Error saving configuration',
      }
  }
}

function TaskEditNew() {
  const { id } = useParams<{ id?: string }>()
  const history = useHistory()
  const { checkPermissions, isPathspotUser } = useAuthContext()

  const [customerId, setCustomerId] = useState<number | null>(null)
  const [taskListType, setTaskListType] = useState<TaskListType | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarStatus>('none')

  const taskState = useTask({ taskId: id, customerId, taskListType })
  const snackbarConfig = getSnackbarAlertConfig(snackbar)

  if (taskState.isLoading) {
    return <StyledSpinner message="Retrieving task details..." />
  }

  // If the task is net new/being created, provide the simple card for creating a new one
  if (!id && !customerId && !taskListType) {
    const taskStateAsCreate = taskState as Create
    const customerOptions = (taskStateAsCreate.createTaskListDetailsResponse ?? []).map((option) => ({
      itemId: option.customerId,
      itemName: option.customerName,
    }))
    return (
      <ThemeProvider theme={theme}>
        <ScopedCssBaseline>
          <Box
            sx={{
              '& .MuiFormControl-root': { my: 1 },
              '& .MuiCard-root': { mb: 2 },
              '& > .MuiCard-root': { mb: 8 },
              '& .MuiCardHeader-root': { backgroundColor: 'lightgrey' },
            }}
          >
            <SelectInitialValues
              title="Task List"
              valuesToSelect={[
                {
                  label: 'Select Customer',
                  list: customerOptions,
                  selector: setCustomerId,
                },
                {
                  label: 'Select Task List Type',
                  list: [
                    { itemId: TaskListType.TaskList, itemName: 'Task List' },
                    { itemId: TaskListType.CorrectiveAction, itemName: 'Corrective Action' },
                  ],
                  selector: setTaskListType,
                },
              ]}
            />
          </Box>
        </ScopedCssBaseline>
      </ThemeProvider>
    )
  }

  const { formValues, taskListDetails, updateTask, taskListCustomerId } = taskState as Edit
  const taskListRestriction = getTasklistRestriction(taskListDetails?.taskList.internalTags)
  const formSchema = getTaskFormSchema(taskListRestriction)
  const isEditDisabled = !(
    checkPermissions(DISPLAY_PAGES.ITEM_EDIT_TASKS) &&
    (taskListRestriction === TaskFormSchemaType.REGULAR || isPathspotUser)
  )

  return (
    <ThemeProvider theme={theme}>
      <ScopedCssBaseline>
        <Formik<FormValues> // May need to re-render this depending on the validation schema selected, for example from a dropdown menu or something (A1, A2, Regular, etc.)
          enableReinitialize={true}
          validateOnChange={false}
          validateOnBlur={true}
          initialValues={formValues}
          validationSchema={formSchema} // Need to provide schema from the beginning (as in, decide which one to use for validation)
          onSubmit={async (values) => {
            try {
              setSnackbar('loading')

              const response = await updateTask(values)

              setSnackbar('success')
              // We created a new task list, navigate to the page for it
              if (!id) {
                history.replace(`/tasks/refactor/${response.taskList.id}`)
              }
            } catch (e) {
              setSnackbar('error')
            }
          }}
        >
          <TaskListForm isEditDisabled={isEditDisabled} taskId={id} customerId={customerId} taskListType={taskListType} />
        </Formik>
        <Snackbar
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={snackbarConfig.autoHideDuration}
          open={snackbarConfig.open}
          onClose={() => setSnackbar('none')}
        >
          <MuiAlert elevation={6} variant="filled" severity={snackbarConfig.alertSevirity} sx={{ width: '100%' }}>
            {snackbarConfig.message}
          </MuiAlert>
        </Snackbar>
      </ScopedCssBaseline>
    </ThemeProvider>
  )
}

interface TaskListFormProps {
  isEditDisabled: boolean
  taskId?: string
  customerId: number | null
  taskListType: TaskListType | null
}

function TaskListForm(props: TaskListFormProps) {
  const formik = useFormikContext<FormValues>()
  const [openConfirmEdit, setOpenConfirmEdit] = useState<boolean>(false)
  const taskState = useTask({ taskId: props.taskId, customerId: props.customerId, taskListType: props.taskListType })
  const { taskListDetails, taskListCustomerId } = taskState as Edit

  return (
    <Box
      sx={{
        '& .MuiFormControl-root': { my: 1 },
        '& .MuiCard-root': { mb: 2 },
        '& > .MuiCard-root:last-child': { mb: 8 },
        '& .MuiCardHeader-root': { backgroundColor: 'lightgrey' },
      }}
    >
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1}>
              <Typography>Task List</Typography>
              <Tooltip title={TASK_LIST_FORM_TOOLTIP_TEXT}>
                <InfoIcon />
              </Tooltip>
            </Stack>
          }
        />
        <CardContent>
          {formik.errors.name && formik.touched.name && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {formik.errors.name}
            </Alert>
          )}
          <TaskListNameField isEditDisabled={props.isEditDisabled} />
          <TaskListDescriptionField isEditDisabled={props.isEditDisabled} />
          <FormControl>
            <Box style={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch {...formik.getFieldProps({ name: 'active', type: 'checkbox' })} disabled={props.isEditDisabled} />}
                label="Active"
              />
              <Typography color="gray" sx={{ ml: 1, lineHeight: 1.2 }}>
                {DEACTIVATE_TASK_TEXT}
              </Typography>
            </Box>
          </FormControl>

          <TaskListConfigurationNew
            customerId={props.customerId ?? taskListCustomerId}
            taskListDetails={taskListDetails}
            tasks={formik.values.taskList}
            taskListType={formik.values.taskListType}
            isDisabled={props.isEditDisabled}
          />
        </CardContent>
        <CardActions>
          <Button
            disabled={formik.isSubmitting || props.isEditDisabled}
            variant="contained"
            type="button"
            onClick={() => formik.handleSubmit()}
          >
            Save
          </Button>
          <ConfirmEditDialog
            open={openConfirmEdit}
            onCancel={() => setOpenConfirmEdit(false)}
            onConfirm={() => {
              setOpenConfirmEdit(false)
              formik.handleSubmit()
            }}
          />
        </CardActions>
      </Card>
    </Box>
  )
}

interface TaskListTextFieldProps {
  isEditDisabled: boolean
}

function TaskListNameField(props: TaskListTextFieldProps) {
  const [field, meta, helpers] = useField('name')
  const [taskListName, setTaskListName] = useState<string>(field.value)

  const handleNameFieldBlur = () => {
    if (field.value !== taskListName) {
      helpers.setTouched(true) // Set touched state to true
      helpers.setValue(taskListName, true) // Update only Formik state field, and only on blur
    }
  }

  return (
    <TextField
      fullWidth
      variant="outlined"
      type="text"
      placeholder="Name"
      label="Name"
      error={meta.touched && !!meta.error}
      value={taskListName}
      onChange={(event) => setTaskListName(event.target.value)}
      onBlur={handleNameFieldBlur}
      disabled={props.isEditDisabled}
    />
  )
}

function TaskListDescriptionField(props: TaskListTextFieldProps) {
  const [field, meta, helpers] = useField('description')
  const [taskListDescription, setTaskListDescription] = useState<string>(field.value)

  const handleDescriptionFieldBlur = () => {
    if (field.value !== taskListDescription) {
      helpers.setValue(taskListDescription) // Update Formik state only on blur
    }
  }

  return (
    <TextField
      fullWidth
      variant="outlined"
      type="text"
      placeholder="Description"
      label="Description"
      error={meta.touched && !!meta.error}
      value={taskListDescription}
      onChange={(event) => setTaskListDescription(event.target.value)}
      onBlur={handleDescriptionFieldBlur}
      disabled={props.isEditDisabled}
    />
  )
}

type ConfirmEditDialogExtraProps = {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

const paragraphStyle = {
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '1rem',
}

function ConfirmEditDialog(props: ConfirmEditDialogExtraProps) {
  return (
    <Dialog open={props.open} onClose={props.onCancel}>
      <DialogTitle>{CONFIRM_EDIT_TITLE_TEXT}</DialogTitle>
      <DialogContent>
        <Typography sx={paragraphStyle}>{CONFIRM_EDIT_WARNING_TEXT}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onConfirm}>Confirm</Button>
        <Button onClick={props.onCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

export default TaskEditNew
