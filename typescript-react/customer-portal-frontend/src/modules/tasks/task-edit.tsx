import React, { FC, useCallback, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Formik, FormikProps } from 'formik'

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
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
import { FormValues, getTasklistRestriction, getTaskFormSchema, TaskFormSchemaType, TaskListType, TaskType } from './data/task'
import { Create, Edit, useTask } from './use-task'
import { TaskListSchedule } from './task-schedule'
import { TaskListConfiguration } from './task-configuration'
import { SelectInitialValues } from '../../components/select-initial-values'
import useAuthContext from '../../api/authentication/useAuthContext'
import { DISPLAY_PAGES } from '../../api/constants'

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

const TaskEdit: FC = () => {
  const { id } = useParams<{ id?: string }>()
  const history = useHistory()
  const { checkPermissions, checkActionPermission, isPathspotUser } = useAuthContext()

  const assignDisabled = !checkActionPermission('assign_tasks')
  const assignLgDisabled = !checkActionPermission('assign_lg_tasks')

  const [customerId, setCustomerId] = useState<number | null>(null)
  const [taskListType, setTaskListType] = useState<TaskListType | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarStatus>('none')
  const [openConfirmEdit, setOpenConfirmEdit] = useState<boolean>(false)
  const taskState = useTask({ taskId: id, customerId, taskListType })
  const snackbarConfig = getSnackbarAlertConfig(snackbar)

  const promptSave = useCallback(
    (formik: FormikProps<FormValues>) => {
      if (formik.values.taskListType === TaskListType.CorrectiveAction) {
        formik.handleSubmit()
        return
      }

      const now = new Date()
      const hasOpenAssignments = formik.values.assignmentTracker.originalAssignmentsDates.some(
        (date) => now >= date.start && (!date.locked || now <= date.locked)
      )

      if (hasOpenAssignments) {
        setOpenConfirmEdit(true)
      } else {
        formik.handleSubmit()
      }
    },
    [setOpenConfirmEdit]
  )

  if (taskState.isLoading) {
    return <StyledSpinner message="Retrieving task details..." />
  }

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
  const editDisabled = !((taskListRestriction === TaskFormSchemaType.REGULAR || isPathspotUser))
  const isA1 = taskListRestriction === TaskFormSchemaType.A1_HOLDING || taskListRestriction === TaskFormSchemaType.A1_COOKING;

  // PathSpot users use normal permissions. For non-PathSpot users on A1, allow editing options only.
  const canEditOptions = isPathspotUser ? !editDisabled : isA1;
  return (
    <ThemeProvider theme={theme}>
      <ScopedCssBaseline>
        <Formik<FormValues>
          enableReinitialize={true}
          validateOnChange={false}
          initialValues={formValues}
          validationSchema={formSchema}
          onSubmit={async (values) => {
            try {
              setSnackbar('loading')

              const response = await updateTask(values)

              setSnackbar('success')
              // We created a new task list, navigate to the page for it
              if (!id) {
                history.replace(`/tasks/${response.taskList.id}`)
              }
            } catch (e) {
              setSnackbar('error')
            }
          }}
        >
          {(formik) => {
            const isCaTaskListType = formik.values.taskListType === TaskListType.CorrectiveAction
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
                      <Grid container spacing={1}>
                        <Grid item>Task List</Grid>
                        <Grid item>
                          <Tooltip title="Craft your tasks here. Choose from various types: text, picture, yes/no, dates, times, temperatures and more. Don't miss adding subtasks to yes/no questions that might require additional details depending on the answer (for example take additional temperatures if a store section is open). Add corrective actions as warnings for unexpected responses based on limits.">
                            <InfoIcon />
                          </Tooltip>
                        </Grid>
                      </Grid>
                    }
                  />
                  <CardContent>
                    <TextField
                      fullWidth
                      variant="outlined"
                      type="text"
                      placeholder="Name"
                      label="Name"
                      error={formik.touched.name && !!formik.errors.name}
                      {...formik.getFieldProps('name')}
                      disabled={editDisabled}
                    />
                    <TextField
                      fullWidth
                      variant="outlined"
                      type="text"
                      placeholder="Description"
                      label="Description"
                      error={formik.touched.description && !!formik.errors.description}
                      {...formik.getFieldProps('description')}
                      disabled={editDisabled}
                    />
                    <FormControl fullWidth>
                      <FormControlLabel
                        control={<Switch {...formik.getFieldProps({ name: 'active', type: 'checkbox' })} disabled={!checkPermissions(DISPLAY_PAGES.ITEM_EDIT_TASKS)} />}
                        label="Active"
                      />
                    </FormControl>

                    {!isCaTaskListType && (
                      <FormControl fullWidth>
                        <FormControlLabel
                          control={<Switch {...formik.getFieldProps({ name: 'assignable', type: 'checkbox' })} disabled={!checkPermissions(DISPLAY_PAGES.ITEM_EDIT_TASKS)}/>}
                          label="Can this list be reassigned by employees at the store?"
                        />
                      </FormControl>
                    )}
                    <TaskListConfiguration
                      customerId={customerId ?? taskListCustomerId}
                      taskListDetails={taskListDetails}
                      tasks={formik.values.taskList}
                      taskListType={formik.values.taskListType}
                      disabled={editDisabled}
                      canEditOptions={canEditOptions && checkPermissions(DISPLAY_PAGES.ITEM_EDIT_TASKS)}
                    />
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="contained"
                      disabled={!checkPermissions(DISPLAY_PAGES.ITEM_EDIT_TASKS)}
                      type="button"
                      onClick={() => promptSave(formik)}
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
                {/* assignments here */}
                {taskState.canEditAssignment && !isCaTaskListType && (
                  <TaskListSchedule
                    taskListDetails={taskListDetails}
                    save={() => promptSave(formik)}
                    editDisabled={editDisabled}
                    assignDisabled={assignDisabled}
                    assignLgDisabled={assignLgDisabled}
                  />
                )}
              </Box>
            )
          }}
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

const ConfirmEditDialog: FC<ConfirmEditDialogExtraProps> = (props) => {
  return (
    <Dialog open={props.open} onClose={props.onCancel}>
      <DialogTitle>Confirm Your Edits:</DialogTitle>
      <DialogContent>
        <Typography sx={paragraphStyle}>
          The changes you are about to make might create new assignments. This will cause future and past responses to be associated with
          different lists. Contact PathSpot Support if you need any help or support with this change.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onConfirm}>Confirm</Button>
        <Button onClick={props.onCancel}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

export default TaskEdit
