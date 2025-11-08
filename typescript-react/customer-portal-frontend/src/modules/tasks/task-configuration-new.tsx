import React, { createContext, Fragment, useContext, useState } from 'react'
import { FieldArray, FieldArrayRenderProps, FormikErrors, FormikTouched, getIn, useField, useFormikContext } from 'formik'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  FormValues,
  Task,
  TaskCorrectness as TaskCorrectnessType,
  TaskCorrectnessComparisson,
  TaskListDetailsResponse,
  TaskListType,
  TaskType,
  taskTypeHasCorrectness,
  createEmptyTask,
} from './data/task'
import useAuthContext from '../../api/authentication/useAuthContext'
import Box from '@mui/material/Box'
import Grid2 from '@mui/material/Grid2'
import ButtonGroup from '@mui/material/ButtonGroup'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import CIcon from '@coreui/icons-react'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import Checkbox from '@mui/material/Checkbox'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { DragDropContext, Droppable, Draggable, DraggableProvided } from '@hello-pangea/dnd'
import { dateToTime, timeToDate } from './data/scheduling'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Alert from '@mui/material/Alert'
import { TaskCorrectiveAction } from './task-corrective-action'

type TaskModal =
  | { tag: 'Description' }
  | { tag: 'SubtaskIf' }
  | { tag: 'CorrectiveAction' }
  | { tag: 'CreateOption'; value: number }
  | { tag: 'None' }

const DroppableAreaTaskName = 'TASKS'
const DroppableAreaSubtaskPrefix = 'SUBTASKS'
const DroppableAreaSubtaskNamePattern = /^SUBTASKS-(\d+)$/

// Contains most content that any of the child components of the TaskEditor might need.  Some values are left to be
// local to certain components because they're only ever used once, or at least only within one child's scope.
interface TaskConfigContextType {
  customerId: number
  task: Task
  taskKey: string
  taskListType: TaskListType
  taskListDetails?: TaskListDetailsResponse
  taskCollection: string
  index: number
  parentIndex?: number
  parentTaskKey?: string
  temperatureInC: boolean
  hasSubTasks: boolean
  taskCollectionHelper: FieldArrayRenderProps
  isCorrectiveAction: boolean
  isDisabled: boolean
  isSubTask: boolean
  taskModal: TaskModal
  handleUpdateTaskModalType: React.Dispatch<React.SetStateAction<TaskModal>>
}

const TaskConfigContext = createContext<TaskConfigContextType | undefined>(undefined)

const extractFormikError = (errors: null | string | string[] | FormikErrors<Task> | FormikErrors<Task>[]): string[] => {
  if (errors === null) {
    return []
  } else if (typeof errors === 'string') {
    return [errors]
  } else if (Array.isArray(errors)) {
    return errors.flatMap((error) => extractFormikError(error))
  } else if (typeof errors === 'object') {
    return Object.values(errors).flatMap((error) => extractFormikError(error))
  } else {
    return []
  }
}

interface TaskListConfigurationProps {
  customerId: number
  taskListType: TaskListType
  taskListDetails?: TaskListDetailsResponse
  tasks: Task[]
  isDisabled: boolean
}

export function TaskListConfigurationNew({ customerId, taskListType, taskListDetails, tasks, isDisabled }: TaskListConfigurationProps) {
  const isCaTaskListType = taskListType === TaskListType.CorrectiveAction
  const formik = useFormikContext<FormValues>()

  const errorsToDisplay = extractFormikError(formik.errors.taskList ?? null)

  return (
    <DragDropContext
      onDragEnd={({ destination, source, type }) => {
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
          return
        }

        if (type === DroppableAreaTaskName) {
          const newTaskList = [...formik.values.taskList]
          const [sourceTask] = newTaskList.splice(source.index, 1)
          if (sourceTask) {
            newTaskList.splice(destination.index, 0, sourceTask)
            formik.setFieldValue('taskList', newTaskList)
          }
        } else {
          const parentTaskIndexCheck = DroppableAreaSubtaskNamePattern.exec(type)

          if (parentTaskIndexCheck) {
            const parentTaskIndex = parseInt(parentTaskIndexCheck[1] ?? '-1', 10)
            const newSubtaskList = [...(formik.values.taskList[parentTaskIndex]?.subtasks ?? [])]
            const [sourceSubtask] = newSubtaskList.splice(source.index, 1)
            if (sourceSubtask) {
              newSubtaskList.splice(destination.index, 0, sourceSubtask)
              formik.setFieldValue(`taskList.${parentTaskIndex}.subtasks`, newSubtaskList)
            }
          }
        }
      }}
    >
      <Card>
        <CardHeader title="Configure Tasks" />
        <CardContent>
          {!isCaTaskListType && (
            <FieldArray name="taskList">
              {(taskListHelper) => (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    taskListHelper.unshift(createEmptyTask())
                  }}
                  disabled={isDisabled}
                  sx={{ marginBottom: '10px' }}
                >
                  Add Task
                </Button>
              )}
            </FieldArray>
          )}
          <Droppable droppableId={`${DroppableAreaTaskName}-Droppable`} type={DroppableAreaTaskName}>
            {(dropProvided) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                {tasks.map((task, index) => {
                  return (
                    <TaskConfigurationNew
                      key={task.id}
                      customerId={customerId}
                      index={index}
                      task={task}
                      isSubTask={false}
                      taskListType={taskListType}
                      taskListDetails={taskListDetails}
                      isDisabled={isDisabled}
                    />
                  )
                })}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>

        {!isCaTaskListType && (
          <CardActions>
            <FieldArray name="taskList">
              {(taskListHelper) => (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    taskListHelper.push(createEmptyTask())
                  }}
                  disabled={isDisabled}
                >
                  Add Task
                </Button>
              )}
            </FieldArray>
          </CardActions>
        )}
        {errorsToDisplay.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorsToDisplay.map((error) => (
              <Typography>{error}</Typography>
            ))}
          </Alert>
        )}
      </Card>
    </DragDropContext>
  )
}

interface TaskConfigurationProps {
  customerId: number
  index: number
  task: Task
  isSubTask: boolean
  taskListType: TaskListType
  isDisabled: boolean
  parentIndex?: number
  taskListDetails?: TaskListDetailsResponse
}

function TaskConfigurationNew(props: TaskConfigurationProps) {
  const { errors, touched } = useFormikContext<FormValues>()
  const [taskModal, setTaskModal] = useState<TaskModal>({ tag: 'None' })
  const {
    authState: { temperatureInC },
  } = useAuthContext()

  const taskCollection = props.isSubTask ? `taskList.${props.parentIndex}.subtasks` : `taskList`
  const taskKey = `${taskCollection}.${props.index}`

  const taskErrors = (props.isSubTask ? errors?.taskList?.[props.parentIndex!] : errors?.taskList?.[props.index]) as
    | FormikErrors<Task>
    | undefined
  const taskTouched = (props.isSubTask ? touched?.taskList?.[props.parentIndex!] : touched?.taskList?.[props.index]) as
    | FormikTouched<Task>
    | undefined

  const subtaskErrors = (Array.isArray(taskErrors?.subtasks) ? taskErrors.subtasks[props.index] : undefined) as
    | FormikErrors<Task>
    | undefined
  const subtaskTouched = (Array.isArray(taskTouched?.subtasks) ? taskTouched.subtasks[props.index] : undefined) as
    | FormikTouched<Task>
    | undefined

  const hasOwnStringError = (errors: FormikErrors<Task> | undefined): boolean => {
    return !!errors && Object.values(errors).some((val) => typeof val === 'string')
  }

  const hasSubtasks = (props.task.subtasks?.length ?? 0) > 0

  const draggableId = props.isSubTask ? `S-${props.task.id}` : `T-${props.task.id}`

  return (
    <Draggable draggableId={draggableId} index={props.index} isDragDisabled={props.isDisabled} disableInteractiveElementBlocking={true}>
      {(dragProvided) => (
        <Box ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
          <Box sx={{ '&': { position: 'relative' } }}>
            {props.isSubTask && subtaskTouched && subtaskErrors && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {Object.entries(subtaskErrors)
                  .filter(([_, value]) => typeof value === 'string')
                  .map(([_, message]) => (
                    <Typography>{message}</Typography>
                  ))}
              </Alert>
            )}
            {!props.isSubTask && taskTouched && taskErrors && hasOwnStringError(taskErrors) && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {Object.entries(taskErrors)
                  .filter(([_, value]) => typeof value === 'string')
                  .map(([_, message]) => (
                    <Typography>{message}</Typography>
                  ))}
              </Alert>
            )}
            <Stack>
              <FieldArray name={taskCollection}>
                {(taskCollectionHelper) => (
                  <TaskConfigContext.Provider // Opting for custom context here rather than prop drillig all over the place.
                    value={{
                      customerId: props.customerId,
                      task: props.task,
                      taskKey: taskKey,
                      taskListType: props.taskListType,
                      taskListDetails: props.taskListDetails,
                      taskCollection: taskCollection,
                      index: props.index,
                      parentIndex: props.parentIndex,
                      parentTaskKey: `taskList.${props.parentIndex}`,
                      temperatureInC: temperatureInC,
                      hasSubTasks: hasSubtasks,
                      taskCollectionHelper: taskCollectionHelper,
                      isCorrectiveAction: props.taskListType === TaskListType.CorrectiveAction,
                      isDisabled: props.isDisabled,
                      isSubTask: props.isSubTask,
                      taskModal: taskModal,
                      handleUpdateTaskModalType: setTaskModal,
                    }}
                  >
                    <TaskEditor dragProvided={dragProvided} />
                  </TaskConfigContext.Provider>
                )}
              </FieldArray>
            </Stack>
          </Box>
        </Box>
      )}
    </Draggable>
  )
}

function TaskEditor({ dragProvided }: { dragProvided: DraggableProvided }) {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const {
    customerId,
    task,
    taskKey,
    taskListDetails,
    hasSubTasks,
    isCorrectiveAction,
    isDisabled,
    isSubTask,
    taskModal,
    handleUpdateTaskModalType,
  } = context

  const [taskName, setTaskName] = useState(formik.getFieldProps(`${taskKey}.name`).value)

  const handleNameFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTaskName(event.target.value) // Update local state only
  }

  const handleNameFieldBlur = () => {
    if (formik.getFieldProps(`${taskKey}.name`).value !== taskName) {
      formik.setFieldTouched(`${taskKey}.name`, true) // Set touched state to true
      formik.setFieldValue(`${taskKey}.name`, taskName, true) // Update Formik state only on blur
    }
  }

  // both types below will use options and display them as a select component
  const taskWithSelect = task.type === TaskType.SELECT || task.type === TaskType.NUMBER_AND_SELECT
  const hasDescription = (task.description?.length ?? 0) > 0

  const checkboxesStyle = hasSubTasks ? { ml: 2 } : {}

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="flex-start" gap={2}>
        <Stack direction="row" alignItems="center">
          <Grid2 alignItems={'center'} justifyContent={'center'} sx={{ margin: 'auto' }} {...dragProvided.dragHandleProps}>
            <CIcon name={'cil-menu'} className={'mx-2'} />
          </Grid2>
          <Grid2 size={{ xs: 12 }} sx={{ marginLeft: 2, minWidth: '300px' }}>
            <TextField
              fullWidth
              variant="outlined"
              type="text"
              label="Name"
              placeholder="Name"
              error={formik.getFieldMeta(`${taskKey}.name`).touched && !!formik.getFieldMeta(`${taskKey}.name`).error}
              value={taskName}
              onChange={handleNameFieldChange}
              onBlur={handleNameFieldBlur}
              disabled={isDisabled}
            />
          </Grid2>
        </Stack>
        <Grid2 size={{ xs: 'auto' }}>
          <TaskTypeSelector />
        </Grid2>
        {taskWithSelect && <TaskOptionSelector />}
        {task.type === TaskType.SLIDER_NUMERIC && (
          <Grid2>
            <TaskNumericSlider />
          </Grid2>
        )}
        {task.type === TaskType.TOTAL_SCANS && (
          <Grid2>
            <TextField
              variant="outlined"
              type="number"
              label="Expected Scans"
              placeholder="Expected Scans"
              {...formik.getFieldProps(`${taskKey}.expectedScans`)}
            />
          </Grid2>
        )}
        {taskTypeHasCorrectness(task.type) && (
          <Grid2>
            <TaskCorrectness />
          </Grid2>
        )}
        <Grid2>
          <AddTaskButton />
        </Grid2>
        {!isCorrectiveAction && (
          <Grid2>
            <DeleteTaskButton />
          </Grid2>
        )}
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="flex-start">
        <Grid2 sx={checkboxesStyle}>
          <AdditionalTaskOptions />
        </Grid2>
      </Stack>
      {task.type === TaskType.BINARY && hasSubTasks && <SubTaskList />}
      {!isSubTask && (
        <FieldArray name={`${taskKey}.subtasks`}>
          {(subtasksHelper) => (
            <SubTaskDialog
              open={taskModal.tag === 'SubtaskIf'}
              onClose={() => {
                handleUpdateTaskModalType({ tag: 'None' })
              }}
              onSave={() => {
                subtasksHelper.push(createEmptyTask())
                handleUpdateTaskModalType({ tag: 'None' })
              }}
            />
          )}
        </FieldArray>
      )}
      <DescriptionDialog
        open={taskModal.tag === 'Description'}
        onClose={() => {
          if (hasDescription) {
            formik.setFieldValue(`${taskKey}.draftDescription`, task.description)
          }
          handleUpdateTaskModalType({ tag: 'None' })
        }}
        onSave={() => {
          formik.setFieldValue(`${taskKey}.description`, task.draftDescription)
          handleUpdateTaskModalType({ tag: 'None' })
        }}
      />
      <TaskCorrectiveAction
        customerId={customerId}
        correctiveAction={task.correctiveAction}
        recipients={task.correctiveActionRecipients}
        possibleRoles={taskListDetails?.possibleRoles ?? []}
        open={taskModal.tag === 'CorrectiveAction'}
        onSet={(correctiveAction, recipients) => {
          formik.setFieldValue(`${taskKey}.correctiveAction`, correctiveAction)
          formik.setFieldValue(`${taskKey}.correctiveActionRecipients`, recipients)
        }}
        onClose={() => {
          handleUpdateTaskModalType({ tag: 'None' })
        }}
      />
      <FieldArray name={`${taskKey}.options`}>
        {(optionsHelper) => (
          <CreateOptionDialog
            open={taskModal.tag === 'CreateOption'}
            optionIndex={taskModal.tag === 'CreateOption' ? taskModal.value : -1}
            onClose={() => {
              handleUpdateTaskModalType({ tag: 'None' })
            }}
            onDelete={() => {
              const index = taskModal.tag === 'CreateOption' ? taskModal.value : -1
              if (task.correctness?.value === index) {
                formik.setFieldValue(`${taskKey}.correctness`, null)
              }

              optionsHelper.remove(index)
              handleUpdateTaskModalType({ tag: 'None' })
            }}
          />
        )}
      </FieldArray>
    </>
  )
}

function TaskTypeSelector() {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { taskKey, isCorrectiveAction, isDisabled, isSubTask } = context

  return (
    <FormControl>
      <InputLabel id="typeLabel">Task Type</InputLabel>
      <Select
        labelId="typeLabel"
        id="type"
        label="Task Type"
        error={formik.getFieldMeta(`${taskKey}.type`).touched && !!formik.getFieldMeta(`${taskKey}.type`).error}
        {...formik.getFieldProps(`${taskKey}.type`)}
        onChange={(e) => {
          // Should probably add a dialog/modal here eventually to confirm, since this will clear subtasks from the task
          formik.setFieldValue(`${taskKey}.type`, e.target.value)
          // Reset all values associated to task types
          formik.setFieldValue(`${taskKey}.correctness`, null)
          formik.setFieldValue(`${taskKey}.options`, [])
          formik.setFieldValue(`${taskKey}.expectedScans`, 0)
          if (!isSubTask) {
            // Clear both subtasks and subtask correctness; should be clean slate for subtasks every time to prevent faulty checks
            formik.setFieldValue(`${taskKey}.subtasks`, null)
            formik.setFieldValue(`${taskKey}.subtaskCorrectness`, null)
          }
        }}
        disabled={isDisabled}
      >
        {!isCorrectiveAction && [
          <MenuItem key={TaskType.BINARY} value={TaskType.BINARY}>
            Yes/No
          </MenuItem>,
          <MenuItem key={TaskType.TEMPERATURE} value={TaskType.TEMPERATURE}>
            Bluetooth Temp
          </MenuItem>,
          <MenuItem key={TaskType.TEMPERATURE_MANUAL} value={TaskType.TEMPERATURE_MANUAL}>
            Manual Temp
          </MenuItem>,
          <MenuItem key={TaskType.BLE_TEMPERATURE_ONLY} value={TaskType.BLE_TEMPERATURE_ONLY}>
            Bluetooth Only Temp
          </MenuItem>,
          <MenuItem key={TaskType.DISH_TEMPERATURE} value={TaskType.DISH_TEMPERATURE}>
            Bluetooth Dish Temp
          </MenuItem>,
          <MenuItem key={TaskType.NUMBER} value={TaskType.NUMBER}>
            Number
          </MenuItem>,
          <MenuItem key={TaskType.TIME} value={TaskType.TIME}>
            Time
          </MenuItem>,
          <MenuItem key={TaskType.DATE} value={TaskType.DATE}>
            Date
          </MenuItem>,
          <MenuItem key={TaskType.TEXT} value={TaskType.TEXT}>
            Note
          </MenuItem>,
          <MenuItem key={TaskType.PICTURE} value={TaskType.PICTURE}>
            Picture
          </MenuItem>,
          <MenuItem key={TaskType.TOTAL_SCANS} value={TaskType.TOTAL_SCANS}>
            Total Scans
          </MenuItem>,
          <MenuItem key={TaskType.SLIDER_NUMERIC} value={TaskType.SLIDER_NUMERIC}>
            Slider (numeric)
          </MenuItem>,
        ]}
        <MenuItem key={TaskType.SELECT} value={TaskType.SELECT}>
          Select
        </MenuItem>
        <MenuItem key={TaskType.SIGNATURE} value={TaskType.SIGNATURE}>
          Signature
        </MenuItem>
        ,
        <MenuItem key={TaskType.NUMBER_AND_SELECT} value={TaskType.NUMBER_AND_SELECT}>
          Number and Select
        </MenuItem>
      </Select>
    </FormControl>
  )
}

function TaskOptionSelector() {
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { task, taskKey, handleUpdateTaskModalType } = context
  const [, optionsMeta] = useField(`${taskKey}.options`) // get meta for options directly instead of using useFormikContext()

  const hasOptions = (task.options?.length ?? 0) > 0
  const hasOneOption = (task.options?.length ?? 0) === 1
  return (
    <FieldArray name={`${taskKey}.options`}>
      {(optionsHelper) => (
        <Grid2 size={{ xs: 'auto' }}>
          <FormControl error={optionsMeta.touched && !!optionsMeta.error}>
            <InputLabel id="selectOptionsLabel">Options</InputLabel>
            <Select labelId="selectOptionsLabel" id="selectOptions" label="Options" value="total">
              {!hasOptions && (
                <MenuItem
                  value="total"
                  onClick={() => {
                    optionsHelper.push('')
                    handleUpdateTaskModalType({ tag: 'CreateOption', value: 0 })
                  }}
                >
                  Create Option
                </MenuItem>
              )}
              {hasOptions && [
                <MenuItem key="total" disabled value="total">
                  <em>{hasOneOption ? '1 Option' : `${task.options?.length} Options`}</em>
                </MenuItem>,
                <MenuItem
                  key="create"
                  value="create"
                  onClick={() => {
                    const newIndex = task.options?.length ?? 1
                    optionsHelper.push('')
                    handleUpdateTaskModalType({ tag: 'CreateOption', value: newIndex })
                  }}
                >
                  <Typography color="primary" variant="overline" sx={{ '&': { textDecoration: 'underline' } }}>
                    Create Option
                  </Typography>
                </MenuItem>,
              ]}
              {hasOptions &&
                task.options?.map((option, index) => {
                  return (
                    <MenuItem
                      key={index}
                      value={index}
                      onClick={() => {
                        handleUpdateTaskModalType({ tag: 'CreateOption', value: index })
                      }}
                    >
                      {option}
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          ml: 1,
                          mt: 0.25,
                          fontStyle: 'italic',
                        }}
                      >
                        {task.correctness?.value === option ? '(Correct)' : ''}
                      </Typography>
                    </MenuItem>
                  )
                })}
            </Select>
          </FormControl>
        </Grid2>
      )}
    </FieldArray>
  )
}

function TaskNumericSlider() {
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { taskKey } = context

  // Using useField to get the values and setValue functions for min, max, and step rather than useFormikContext()
  const [{ value: taskNumericOptionsMinValue }, , { setValue: setTaskNumericOptionsMinValue }] = useField(
    `${taskKey}.sliderNumericOptions.min`
  )
  const [{ value: taskNumericOptionsMaxValue }, , { setValue: setTaskNumericOptionsMaxValue }] = useField(
    `${taskKey}.sliderNumericOptions.max`
  )
  const [{ value: taskNumericOptionsStepValue }, , { setValue: setTaskNumericOptionsStepValue }] = useField(
    `${taskKey}.sliderNumericOptions.step`
  )

  return (
    <Stack direction="row" gap={0.25}>
      <TextField
        variant="outlined"
        type="number"
        label="Min"
        placeholder="Min"
        sx={{ maxWidth: '65px', marginRight: '1%' }}
        value={taskNumericOptionsMinValue}
        onBlur={(e) => setTaskNumericOptionsMinValue(e.target.value)}
      />

      <TextField
        variant="outlined"
        type="number"
        label="Max"
        placeholder="Max"
        sx={{ maxWidth: '65px', marginRight: '1%' }}
        value={taskNumericOptionsMaxValue}
        onBlur={(e) => setTaskNumericOptionsMaxValue(e.target.value)}
      />

      <TextField
        variant="outlined"
        type="number"
        label="Step (Optional)"
        placeholder="0.5"
        sx={{ maxWidth: '110px' }}
        value={taskNumericOptionsStepValue}
        onBlur={(e) => setTaskNumericOptionsStepValue(e.target.value)}
      />
    </Stack>
  )
}

function TaskCorrectness() {
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { task, taskKey, temperatureInC, isDisabled } = context
  const [{ value: taskCorrectness }, correctnessMeta, { setValue: setTaskCorrectness }] = useField<Task['correctness']>(
    `${taskKey}.correctness`
  )
  const correctness = taskCorrectness ?? null

  const temperatureUnit = temperatureInC ? '°C' : '°F'
  const temperature = getTemperatureConverted(task.type, correctness?.value, temperatureInC)

  // Used to be able to write a temperature and only convert on blur
  const [localTemperature, setLocalTemperature] = useState(temperature)

  switch (task.type) {
    case TaskType.BINARY:
      return (
        <FormControl>
          <InputLabel id="correctAnswerLabel">Correct Answer</InputLabel>
          <Select
            labelId="correctAnswerLabel"
            id="correctAnswer"
            label="Correct Answer"
            name="correctAnswer"
            value={correctness?.value == null ? 'none' : correctness.value}
            error={!!correctnessMeta.error}
            onChange={(event) => {
              if (event.target.value === 'none') {
                setTaskCorrectness(null)
              } else {
                // input values cant be booleans, so we need to parse from string to boolean
                setTaskCorrectness({
                  operation: TaskCorrectnessComparisson.EQUAL,
                  value: event.target.value === 'true',
                })
              }
            }}
            disabled={isDisabled}
          >
            <MenuItem value="none">No Correct Answer</MenuItem>
            <MenuItem value="true">Correct Answer - Yes</MenuItem>
            <MenuItem value="false">Correct Answer - No</MenuItem>
          </Select>
        </FormControl>
      )
    case TaskType.TIME:
      return (
        <>
          <FormControl>
            <InputLabel id="correctAnswerCheckLabel">Correct Answer Check</InputLabel>
            <Select
              labelId="correctAnswerCheckLabel"
              id="correctAnswerCheck"
              label="Correct Answer Check"
              name="correctAnswerCheck"
              value={correctness?.operation == null ? 'none' : correctness.operation}
              onChange={(event) => {
                if (event.target.value === 'none') {
                  setTaskCorrectness(null)
                } else {
                  setTaskCorrectness({
                    operation: event.target.value as TaskCorrectnessComparisson,
                    value: correctness?.value ?? '',
                  })
                }
              }}
              disabled={isDisabled}
            >
              <MenuItem value="none">No Correct Answer</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.GREATER}>&gt;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.GREATER}>&gt;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.LESSER}>&lt;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.EQUAL}>=</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.GREATER_EQUAL}>&ge;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.LESSER_EQUAL}>&le;</MenuItem>
            </Select>
          </FormControl>
          {correctness != null && (
            <DatePicker
              selected={
                correctness.value != null && typeof correctness.value === 'string' && correctness.value !== ''
                  ? timeToDate(correctness.value)
                  : new Date()
              }
              onChange={(date) => {
                if (date) {
                  setTaskCorrectness({
                    operation: correctness.operation ?? TaskCorrectnessComparisson.EQUAL,
                    value: dateToTime(date),
                  })
                }
              }}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="h:mm aa"
              customInput={<TextField fullWidth label="Time" />}
            />
          )}
        </>
      )
    case TaskType.NUMBER:
      return (
        <>
          <FormControl>
            <InputLabel id="correctAnswerCheckLabel">Correct Answer Check</InputLabel>
            <Select
              labelId="correctAnswerCheckLabel"
              id="correctAnswerCheck"
              label="Correct Answer Check"
              name="correctAnswerCheck"
              value={correctness?.operation == null ? 'none' : correctness.operation}
              onChange={(event) => {
                if (event.target.value === 'none') {
                  setTaskCorrectness(null)
                } else {
                  setTaskCorrectness({
                    operation: event.target.value as TaskCorrectnessComparisson,
                    value: correctness?.value ?? 0,
                  })
                }
              }}
              disabled={isDisabled}
            >
              <MenuItem value="none">No Correct Answer</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.GREATER}>&gt;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.LESSER}>&lt;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.EQUAL}>=</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.GREATER_EQUAL}>&ge;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.LESSER_EQUAL}>&le;</MenuItem>
            </Select>
          </FormControl>
          {correctness != null && (
            <TextField
              variant="outlined"
              type="number"
              name="number"
              label="Number"
              placeholder="Number"
              value={correctness.value == null ? 0 : correctness.value}
              onChange={(event) => {
                setTaskCorrectness({
                  operation: correctness.operation ?? TaskCorrectnessComparisson.EQUAL,
                  value: event.target.value,
                })
              }}
            />
          )}
        </>
      )
    case TaskType.TEMPERATURE:
    case TaskType.TEMPERATURE_MANUAL:
    case TaskType.DISH_TEMPERATURE:
    case TaskType.BLE_TEMPERATURE_ONLY:
      return (
        <>
          <FormControl>
            <InputLabel id="correctAnswerCheckLabel">Correct Answer Check</InputLabel>
            <Select
              labelId="correctAnswerCheckLabel"
              id="correctAnswerCheck"
              label="Correct Answer Check"
              name="correctAnswerCheck"
              value={correctness?.operation == null ? 'none' : correctness.operation}
              onChange={(event) => {
                if (event.target.value === 'none') {
                  setTaskCorrectness(null)
                } else {
                  setTaskCorrectness({
                    operation: event.target.value as TaskCorrectnessComparisson,
                    value: temperature,
                  })
                }
              }}
              disabled={isDisabled}
            >
              <MenuItem value="none">No Correct Answer</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.GREATER}>&gt;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.LESSER}>&lt;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.EQUAL}>=</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.GREATER_EQUAL}>&ge;</MenuItem>
              <MenuItem value={TaskCorrectnessComparisson.LESSER_EQUAL}>&le;</MenuItem>
            </Select>
          </FormControl>
          {correctness != null && (
            <TextField
              variant="outlined"
              type="text"
              name="temperature"
              label={`Temperature ${temperatureUnit}`}
              placeholder={`Temperature ${temperatureUnit}`}
              value={localTemperature}
              onChange={(event) => {
                setLocalTemperature(event.target.value)
              }}
              onBlur={(event) => {
                const temperature = parseFloat(event.target.value)
                if (isNaN(temperature)) {
                  setTaskCorrectness({
                    operation: correctness.operation ?? TaskCorrectnessComparisson.EQUAL,
                    value: '',
                  })
                  setLocalTemperature('')
                  return
                }

                const finalTemperature = temperatureInC ? event.target.value : String((temperature - 32) * (5 / 9))
                setLocalTemperature(getTemperatureConverted(task.type, finalTemperature, temperatureInC))

                setTaskCorrectness({
                  operation: correctness.operation ?? TaskCorrectnessComparisson.EQUAL,
                  value: finalTemperature,
                })
              }}
              disabled={isDisabled}
            />
          )}
        </>
      )

    default:
      return null
  }
}

function AdditionalTaskOptions() {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { task, taskKey, isDisabled, handleUpdateTaskModalType } = context

  const hasDescription = (task.description?.length ?? 0) > 0
  const hasDraftDescription = (task.draftDescription?.length ?? 0) > 0
  const hasCorrectiveAction = !!task.correctiveAction

  return (
    <FormGroup row>
      <FormControlLabel
        control={<Checkbox checked={hasDescription} />}
        onClick={() => {
          if (hasDescription) {
            formik.setFieldValue(`${taskKey}.draftDescription`, task.description)
            formik.setFieldValue(`${taskKey}.description`, null)
            return
          } else if (hasDraftDescription) {
            formik.setFieldValue(`${taskKey}.draftDescription`, task.draftDescription)
          }
          handleUpdateTaskModalType({ tag: 'Description' })
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          if (hasDescription) {
            formik.setFieldValue(`${taskKey}.draftDescription`, task.description)
            handleUpdateTaskModalType({ tag: 'Description' })
          }
        }}
        label={
          hasDescription || hasDraftDescription ? (
            <Link
              href="#"
              sx={{ position: 'relative', zIndex: 10 }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (hasDescription) {
                  formik.setFieldValue(`${taskKey}.draftDescription`, task.description)
                }
                handleUpdateTaskModalType({ tag: 'Description' })
              }}
            >
              Description
            </Link>
          ) : (
            'Description'
          )
        }
        disabled={isDisabled}
      />
      <FormControlLabel
        control={<Checkbox checked={hasCorrectiveAction} />}
        onClick={() => {
          if (hasCorrectiveAction) {
            formik.setFieldValue(`${taskKey}.correctiveAction`, null)
          }

          if (!hasCorrectiveAction) {
            handleUpdateTaskModalType({ tag: 'CorrectiveAction' })
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          if (hasCorrectiveAction) {
            handleUpdateTaskModalType({ tag: 'CorrectiveAction' })
          }
        }}
        label={
          hasCorrectiveAction ? (
            <Link
              href="#"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleUpdateTaskModalType({ tag: 'CorrectiveAction' })
              }}
            >
              Corrective Action
            </Link>
          ) : (
            'Corrective Action'
          )
        }
        disabled={isDisabled || !taskTypeHasCorrectness(task.type)}
      />

      <FormControlLabel
        control={<Checkbox {...formik.getFieldProps({ name: `${taskKey}.allowS3`, type: 'checkbox' })} />}
        label="Required Image"
        disabled={true} // Hardcode as disabled for now; product ask
      />
      <FormControlLabel
        control={<Checkbox {...formik.getFieldProps({ name: `${taskKey}.allowNotes`, type: 'checkbox' })} />}
        label="Required Comment"
        disabled={true} // Hardcode as disabled for now; product ask
      />

      <FormControlLabel
        control={<Checkbox {...formik.getFieldProps({ name: `${taskKey}.naEnabled`, type: 'checkbox' })} />}
        label={'N/A Enabled'}
        disabled={isDisabled}
      />
    </FormGroup>
  )
}

function SubTaskList() {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { customerId, task, taskListType, index, parentIndex, isDisabled } = context

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 108,
          left: 0,
          borderLeft: '1px solid #C4C4C4',
          width: 1,
          /* (94px + 36px) = height of top of form + half of the text field height
           * task length - 1 = using 0 based becase we don't need the next number for first item
           * (36px + 58px + 36px) = half of text + radio group + half of text
           */
          height: `calc((94px + 36px) + ${(task.subtasks?.length ?? 1) - 1} * (36px + 58px + 36px))`,
        }}
      />
      <Box sx={{ ml: 8, position: 'relative' }}>
        <Droppable droppableId={`${DroppableAreaSubtaskPrefix}-Droppable-${index}`} type={`${DroppableAreaSubtaskPrefix}-${index}`}>
          {(dropProvided) => (
            <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
              {task.subtasks?.map((subtask, childIndex) => {
                return (
                  <Fragment key={subtask.id}>
                    <Box
                      sx={{
                        position: 'absolute',
                        /* (36px) = half of text
                         * childIndex = 0 based index because we don't need the second set of numbers
                         * (36px + 58px + 36px) = half of text + radio group + half of text
                         */
                        top: `calc((36px) + ${childIndex} * (36px + 58px + 36px))`,
                        left: -64,
                        borderBottom: '1px solid #C4C4C4',
                        height: '1px',
                        width: 64,
                        '&:before': {
                          content: `'On ${task.subtaskCorrectness?.value ? 'Yes' : 'No'}'`,
                          fontSize: 9,
                          position: 'absolute',
                          top: -11,
                          left: 8,
                        },
                      }}
                    />
                    <TaskConfigurationNew
                      key={subtask.id}
                      customerId={customerId}
                      parentIndex={index}
                      index={childIndex}
                      task={subtask}
                      isSubTask={true}
                      taskListType={taskListType}
                      isDisabled={isDisabled}
                    />
                  </Fragment>
                )
              })}
              {dropProvided.placeholder}
            </div>
          )}
        </Droppable>
      </Box>
    </>
  )
}

// |========================================================================|
// |========================== Custom Buttons ==============================|
// |========================================================================|

function AddTaskButton() {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { task, taskKey, hasSubTasks, index, parentIndex, taskCollectionHelper, isDisabled, isSubTask, handleUpdateTaskModalType } = context

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleAddTask = () => {
    if (isSubTask) {
      const taskList = formik.values.taskList
      const subTaskList = parentIndex !== undefined ? taskList[parentIndex]?.subtasks : undefined
      if (subTaskList) {
        if (index === subTaskList.length - 1) {
          taskCollectionHelper.push(createEmptyTask())
        } else {
          taskCollectionHelper.insert(index + 1, createEmptyTask())
        }
      }
    } else {
      const newTaskList = [...formik.values.taskList]
      if (index === newTaskList.length - 1) {
        formik.setFieldValue('taskList', [...newTaskList, createEmptyTask()])
      } else {
        newTaskList.splice(index + 1, 0, createEmptyTask())
        formik.setFieldValue('taskList', newTaskList)
      }
    }
  }

  const handleAddSubTask = () => {
    if (isSubTask) return

    if (task.type === TaskType.BINARY) {
      if (hasSubTasks) {
        const subtasks = getIn(formik.values, `${taskKey}.subtasks`) || []
        formik.setFieldValue(`${taskKey}.subtasks`, [createEmptyTask(), ...subtasks])
      } else {
        formik.setFieldValue(`${taskKey}.subtaskCorrectness`, { operation: '=', value: true })
        handleUpdateTaskModalType({ tag: 'SubtaskIf' })
      }
    }
  }

  return (
    <>
      {isSubTask ? (
        <Button type="button" variant="contained" color="primary" onClick={handleAddTask} disabled={isDisabled}>
          <AddIcon /> Add Subtask
        </Button>
      ) : (
        <ButtonGroup variant="contained" sx={{ borderRadius: '5px', overflow: 'hidden' }}>
          <Button startIcon={<AddIcon />} onClick={handleAddTask} disabled={isDisabled}>
            Add Task
          </Button>

          {task.type === TaskType.BINARY && (
            <>
              <Button onClick={handleMenuOpen} sx={{ minWidth: '40px', padding: '6px', color: 'white' }}>
                <KeyboardArrowDown />
              </Button>

              <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                <MenuItem
                  onClick={() => {
                    handleMenuClose()
                    handleAddSubTask()
                  }}
                >
                  <AddIcon /> Add Sub-Task
                </MenuItem>
              </Menu>
            </>
          )}
        </ButtonGroup>
      )}
    </>
  )
}

function DeleteTaskButton() {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { taskCollection, index, parentTaskKey, taskCollectionHelper, isDisabled, isSubTask, handleUpdateTaskModalType } = context
  return (
    <>
      <Button
        type="button"
        variant="contained"
        color="error"
        onClick={() => {
          taskCollectionHelper.remove(index)

          // We just removed the last subtask, so let's remove subtaskCorrectness
          if (isSubTask && formik.getFieldProps(taskCollection).value.length === 1) {
            formik.setFieldValue(`${parentTaskKey}.subtaskCorrectness`, null)
          }
        }}
        disabled={isDisabled}
      >
        <DeleteIcon />
      </Button>
    </>
  )
}

// |========================================================================|
// |============================== Dialogs =================================|
// |========================================================================|

interface SubTaskDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

function SubTaskDialog(props: SubTaskDialogProps) {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { task, taskKey } = context
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Show All Subtasks on:</DialogTitle>
      <DialogContent>
        <FormControl>
          <RadioGroup
            row
            name="subtaskCorrectness"
            value={task.subtaskCorrectness?.value}
            onChange={(event) => {
              // input values cant be booleans, so we need to parse from string to boolean
              formik.setFieldValue(`${taskKey}.subtaskCorrectness`, { operation: '=', value: event.target.value === 'true' })
            }}
          >
            <FormControlLabel value={true} control={<Radio />} label="Yes" />
            <FormControlLabel value={false} control={<Radio />} label="No" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

interface DescriptionDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

function DescriptionDialog(props: DescriptionDialogProps) {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { taskKey } = context
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Description</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter below any additional details for the task. These will be displayed to the user to provide further description and aid
          them in completing the task.
        </DialogContentText>
        <TextField
          autoFocus
          label="Description"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          {...formik.getFieldProps(`${taskKey}.draftDescription`)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button onClick={props.onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

interface CreateOptionDialogProps {
  open: boolean
  optionIndex: number
  onClose: () => void
  onDelete: () => void
}

function CreateOptionDialog(props: CreateOptionDialogProps) {
  const formik = useFormikContext<FormValues>()
  const context = useContext(TaskConfigContext)
  if (!context) {
    throw new Error('TaskConfigContext must be defined.')
  }
  const { taskKey } = context

  const optionKey = `${taskKey}.options.${props.optionIndex}`
  const correctness = (getIn(formik.values, `${taskKey}.correctness`) ?? null) as Task['correctness']
  const fieldProps = formik.getFieldProps(optionKey)
  const taskType = (getIn(formik.values, `${taskKey}.type`) ?? null) as TaskType

  // type number and select should not have any
  // correctness because this is a composite field
  // and correctness can't be defined for only one portion of the task
  const canHaveCorrectness = taskTypeHasCorrectness(taskType)

  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Create Option</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            '& .MuiFormControl-root': { my: 1 },
          }}
        >
          <TextField autoFocus label="Option" type="text" fullWidth variant="outlined" {...fieldProps} value={fieldProps.value ?? ''} />
          <FormControlLabel
            control={
              <Checkbox
                checked={correctness?.value === fieldProps.value}
                onChange={(event) => {
                  if (event.target.checked) {
                    formik.setFieldValue(`${taskKey}.correctness`, {
                      operation: TaskCorrectnessComparisson.EQUAL,
                      value: fieldProps.value,
                    })
                  } else {
                    formik.setFieldValue(`${taskKey}.correctness`, null)
                  }
                }}
              />
            }
            label="Correct Answer"
            disabled={!canHaveCorrectness}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onDelete}>Remove</Button>
        <Button onClick={props.onClose}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

// |========================================================================|
// |============================= Utilities ================================|
// |========================================================================|

const getTemperatureConverted = (
  taskType: Task['type'],
  value: TaskCorrectnessType['value'] | undefined,
  temperatureInC: boolean
): TaskCorrectnessType['value'] => {
  if (value == null) {
    return ''
  }

  switch (taskType) {
    case TaskType.TEMPERATURE:
    case TaskType.TEMPERATURE_MANUAL:
    case TaskType.DISH_TEMPERATURE:
    case TaskType.BLE_TEMPERATURE_ONLY: {
      const temperature = parseFloat(value as string)
      const convertedTemperature = temperatureInC ? temperature : temperature * (9 / 5) + 32

      if (isNaN(convertedTemperature)) {
        return ''
      }

      const numberAsString = convertedTemperature.toString()
      const index = numberAsString.indexOf('.')

      if (index !== -1) {
        return numberAsString.substring(0, index + 3) // +3 because 1 for the dot and 2 for the decimals
      } else {
        return numberAsString // No decimal points
      }
    }

    default:
      return value
  }
}
