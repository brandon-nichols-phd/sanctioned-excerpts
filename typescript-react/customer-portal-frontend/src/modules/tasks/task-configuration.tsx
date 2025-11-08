import React, { FC, Fragment, useState } from 'react'
import { useFormikContext, useField, FieldArray, getIn, FormikErrors } from 'formik'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Grid,
  Box,
  Link,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  Radio,
  RadioGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  Alert,
  Chip,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, Settings as SettingsIcon } from '@mui/icons-material'
import CIcon from '@coreui/icons-react'

import {
  createEmptyTask,
  FormValues,
  Task,
  TaskCorrectness as TaskCorrectnessType,
  TaskCorrectnessComparisson,
  TaskListDetailsResponse,
  TaskListType,
  TaskType,
  taskTypeHasCorrectness,
} from './data/task'
import { TaskCorrectiveAction } from './task-corrective-action'
import { dateToTime, timeToDate } from './data/scheduling'
import useAuthContext from '../../api/authentication/useAuthContext'

const DroppableAreaTaskName = 'TASKS'
const DroppableAreaSubtaskPrefix = 'SUBTASKS'
const DroppableAreaSubtaskNamePattern = /^SUBTASKS-(\d+)$/g


export const TaskListConfiguration: FC<{
  customerId: number
  taskListType: TaskListType
  taskListDetails?: TaskListDetailsResponse
  tasks: Task[]
  disabled: boolean
  canEditOptions?: boolean
}> = ({ customerId, taskListType, taskListDetails, tasks, disabled, canEditOptions = false }) => {
  const isCaTaskListType = taskListType === TaskListType.CorrectiveAction
  const formik = useFormikContext<FormValues>()

  // Only show taskList errors after a submit attempt
  const errorsToDisplay =
    formik.submitCount > 0 ? extractFormikError(formik.errors.taskList ?? null) : []

  return (
    <DragDropContext
      onDragEnd={({ destination, source, type }) => {
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
          return
        }

        if (type === DroppableAreaTaskName) {
          const newTaskList = [...formik.values.taskList]
          const [sourceTask] = newTaskList.splice(source.index, 1)
          newTaskList.splice(destination.index, 0, sourceTask!)
          formik.setFieldValue('taskList', newTaskList)
        } else {
          const parentTaskIndexCheck = DroppableAreaSubtaskNamePattern.exec(type)
          if (parentTaskIndexCheck) {
            const parentTaskIndex = parentTaskIndexCheck[1] ? parseInt(parentTaskIndexCheck[1], 10) : -1
            const newSubtaskList = [...(formik.values.taskList[parentTaskIndex]?.subtasks ?? [])]
            const [sourceSubtask] = newSubtaskList.splice(source.index, 1)
            newSubtaskList.splice(destination.index, 0, sourceSubtask!)
            formik.setFieldValue(`taskList.${parentTaskIndex}.subtasks`, newSubtaskList)
          }
        }
      }}
    >
      <Card>
        <CardHeader title="Configure Tasks" />
        <CardContent>
          {errorsToDisplay.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorsToDisplay.map((error) => (
                <Typography key={error}>{error}</Typography>
              ))}
            </Alert>
          )}

          <Droppable droppableId={`${DroppableAreaTaskName}-Droppable`} type={DroppableAreaTaskName}>
            {(dropProvided) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                {tasks.map((task, index) => (
                  <TaskConfiguration
                    key={task.id}
                    customerId={customerId}
                    index={index}
                    task={task}
                    isSubTask={false}
                    taskListType={taskListType}
                    taskListDetails={taskListDetails}
                    disabled={disabled}
                    canEditOptions={canEditOptions} 
                  />
                ))}
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
                  onClick={() => taskListHelper.push(createEmptyTask())}
                  disabled={disabled}
                >
                  Add Task
                </Button>
              )}
            </FieldArray>
          </CardActions>
        )}
      </Card>
    </DragDropContext>
  )
}

type TaskModal = 'Description' | 'SubtaskIf' | 'CorrectiveAction' | { tag: 'CreateOption'; value: number } | { tag: 'CreateMulitpleOptionDialog'; value: string } | 'None'

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

export const TaskConfiguration: FC<{
  customerId: number
  index: number
  parentIndex?: number
  task: Task
  isSubTask: boolean
  taskListType: TaskListType
  taskListDetails?: TaskListDetailsResponse
  disabled: boolean
  canEditOptions?: boolean
  }> = ({
    customerId,
    index,
    parentIndex,
    task,
    isSubTask,
    taskListType,
    taskListDetails,
    disabled,
    canEditOptions = false,
  }) => {
  const {
    authState: { temperatureInC },
  } = useAuthContext()
  const formik = useFormikContext<FormValues>()
  const [taskModal, setTaskModal] = useState<TaskModal>('None')

  const optionsReadOnly = !canEditOptions   // <-- single place to control options editor

  const taskCollection = isSubTask ? `taskList.${parentIndex}.subtasks` : `taskList`
  const parentTaskKey = `taskList.${parentIndex}`
  const taskKey = `${taskCollection}.${index}`

  const hasDescription = (task.description?.length ?? 0) > 0
  const hasDraftDescription = (task.draftDescription?.length ?? 0) > 0
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0
  const hasCorrectiveAction = !!task.correctiveAction
  const isSliderNumeric = task.type === TaskType.SLIDER_NUMERIC

  const configuredOptionCount = (task.options ?? []).filter((o) => !!o?.trim()).length
  const tasksWithAnyOptions = task.type === TaskType.SELECT || task.type === TaskType.MULTI_SELECT || task.type === TaskType.NUMBER_AND_SELECT

  const canHaveCorrectiveAction = taskTypeHasCorrectness(task.type)
  const isCaTaskListType = taskListType === TaskListType.CorrectiveAction
  const draggableId = isSubTask ? `S-${task.id}` : `T-${task.id}`
  const checkboxesStyle = hasSubtasks ? { ml: 2 } : {}

  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={disabled}>
      {(dragProvided) => (
        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
          <Box sx={{ '&': { position: 'relative' } }}>
            <Grid container rowSpacing={1} columnSpacing={2} alignItems="center" justifyContent="flex-start">
              <FieldArray name={taskCollection}>
                {(taskCollectionHelper) => (
                  <>
                    <Grid item xs={4} container {...dragProvided.dragHandleProps}>
                      <Grid item alignItems={'center'} justifyContent={'center'} sx={{ margin: 'auto' }}>
                        <CIcon name={'cil-menu'} className={'mx-2'} />
                      </Grid>
                      <Grid item xs={true}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          type="text"
                          label="Name"
                          placeholder="Name"
                          error={formik.getFieldMeta(`${taskKey}.name`).touched && !!formik.getFieldMeta(`${taskKey}.name`).error}
                          {...formik.getFieldProps(`${taskKey}.name`)}
                          disabled={disabled}
                        />
                      </Grid>
                    </Grid>
                    <Grid item xs="auto">
                      <FormControl>
                        <InputLabel id="typeLabel">Task Type</InputLabel>
                        <Select
                          labelId="typeLabel"
                          id="type"
                          label="Task Type"
                          error={formik.getFieldMeta(`${taskKey}.type`).touched && !!formik.getFieldMeta(`${taskKey}.type`).error}
                          {...formik.getFieldProps(`${taskKey}.type`)}
                          onChange={(e) => {
                            formik.setFieldValue(`${taskKey}.type`, e.target.value)
                            // Reset all values associated to task types
                            formik.setFieldValue(`${taskKey}.correctness`, null)
                            formik.setFieldValue(`${taskKey}.options`, null)
                            formik.setFieldValue(`${taskKey}.expectedScans`, null)
                          }}
                          disabled={disabled}
                        >
                          {!isCaTaskListType && [
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
                          <MenuItem value={TaskType.SELECT}>Select</MenuItem>
                          <MenuItem value={TaskType.MULTI_SELECT}>Multi-Select</MenuItem>
                          <MenuItem value={TaskType.SIGNATURE}>Signature</MenuItem>
                          <MenuItem value={TaskType.NUMBER_AND_SELECT}>Number and Select</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {tasksWithAnyOptions && (
                      <Chip
                        label={
                          configuredOptionCount > 0
                            ? `Edit (${configuredOptionCount}) ${configuredOptionCount === 1 ? 'Option' : 'Options'}`
                            : 'Configure Options'
                        }
                        clickable={!optionsReadOnly}
                        onClick={
                          optionsReadOnly
                            ? undefined
                            : () => setTaskModal({ tag: 'CreateMulitpleOptionDialog', value: task.id })
                        }
                        icon={<SettingsIcon />}
                        sx={{
                          color: 'primary.main',
                          border: '1px solid',
                          borderRadius: 1,
                          borderColor: 'primary.main',
                          cursor: optionsReadOnly ? 'not-allowed' : 'pointer',
                          opacity: optionsReadOnly ? 0.5 : 1,
                          marginLeft: 2,
                          marginTop: 1,
                          height: 55,
                          pointerEvents: optionsReadOnly ? 'none' : 'auto',
                        }}
                      />
                    )}
                    {isSliderNumeric && (
                      <Grid item xs={3.5}>
                        <TextField
                          variant="outlined"
                          type="number"
                          label="Min"
                          placeholder="Min"
                          sx={{ maxWidth: '65px', marginRight: '1%' }}
                          {...formik.getFieldProps(`${taskKey}.sliderNumericOptions.min`)}
                        />
                        <TextField
                          variant="outlined"
                          type="number"
                          label="Max"
                          placeholder="Max"
                          sx={{ maxWidth: '65px', marginRight: '1%' }}
                          {...formik.getFieldProps(`${taskKey}.sliderNumericOptions.max`)}
                        />

                        <TextField
                          variant="outlined"
                          type="number"
                          label="Step (Optional)"
                          placeholder="0.5"
                          sx={{ maxWidth: '110px' }}
                          {...formik.getFieldProps(`${taskKey}.sliderNumericOptions.step`)}
                        />
                      </Grid>
                    )}
                    {task.type === TaskType.TOTAL_SCANS && (
                      <Grid item xs="auto">
                        <TextField
                          variant="outlined"
                          type="number"
                          label="Expected Scans"
                          placeholder="Expected Scans"
                          {...formik.getFieldProps(`${taskKey}.expectedScans`)}
                        />
                      </Grid>
                    )}
                    {taskTypeHasCorrectness(task.type) && (
                      <TaskCorrectness task={task} taskKey={taskKey} disabled={disabled} userTemperatureUnitC={temperatureInC} />
                    )}
                    {!isSubTask && task.type === TaskType.BINARY && (
                      <Grid item xs="auto" sx={{ ml: 3 }}>
                        <FieldArray name={`${taskKey}.subtasks`}>
                          {(subtasksHelper) => (
                            <Button
                              type="button"
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                if (hasSubtasks) {
                                  subtasksHelper.push(createEmptyTask())
                                } else {
                                  formik.setFieldValue(`${taskKey}.subtaskCorrectness`, { operation: '=', value: true })
                                  setTaskModal('SubtaskIf')
                                }
                              }}
                              disabled={disabled}
                            >
                              <AddIcon />
                            </Button>
                          )}
                        </FieldArray>
                      </Grid>
                    )}
                    {!isCaTaskListType && (
                      <Grid item xs="auto">
                        <Button
                          type="button"
                          variant="contained"
                          color="error"
                          sx={isSubTask ? { ml: 2 } : {}}
                          onClick={() => {
                            taskCollectionHelper.remove(index)

                            // We just removed the last subtask, so let's remove subtaskCorrectness
                            if (isSubTask && formik.getFieldProps(taskCollection).value.length === 1) {
                              formik.setFieldValue(`${parentTaskKey}.subtaskCorrectness`, null)
                            }
                          }}
                          disabled={disabled}
                        >
                          <DeleteIcon />
                        </Button>
                      </Grid>
                    )}
                    {!isCaTaskListType && (
                      <Grid item xs={12} sx={checkboxesStyle}>
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

                              setTaskModal('Description')
                            }}
                            onContextMenu={(event) => {
                              event.preventDefault()
                              if (hasDescription) {
                                formik.setFieldValue(`${taskKey}.draftDescription`, task.description)
                                setTaskModal('Description')
                              }
                            }}
                            label={
                              hasDescription || hasDraftDescription ? (
                                <Link
                                  href="#"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    if (hasDescription) {
                                      formik.setFieldValue(`${taskKey}.draftDescription`, task.description)
                                    }
                                    setTaskModal('Description')
                                  }}
                                >
                                  Description
                                </Link>
                              ) : (
                                'Description'
                              )
                            }
                            disabled={disabled}
                          />
                          <FormControlLabel
                            control={<Checkbox checked={hasCorrectiveAction} />}
                            onClick={() => {
                              if (hasCorrectiveAction) {
                                formik.setFieldValue(`${taskKey}.correctiveAction`, null)
                              }

                              if (!hasCorrectiveAction) {
                                setTaskModal('CorrectiveAction')
                              }
                            }}
                            onContextMenu={(event) => {
                              event.preventDefault()
                              if (hasCorrectiveAction) {
                                setTaskModal('CorrectiveAction')
                              }
                            }}
                            label={
                              hasCorrectiveAction ? (
                                <Link
                                  href="#"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setTaskModal('CorrectiveAction')
                                  }}
                                >
                                  Corrective Action
                                </Link>
                              ) : (
                                'Corrective Action'
                              )
                            }
                            disabled={disabled || !canHaveCorrectiveAction}
                          />

                          <FormControlLabel
                            control={<Checkbox {...formik.getFieldProps({ name: `${taskKey}.allowS3`, type: 'checkbox' })} />}
                            label="Required Image"
                            disabled={disabled}
                          />
                          <FormControlLabel
                            control={<Checkbox {...formik.getFieldProps({ name: `${taskKey}.allowNotes`, type: 'checkbox' })} />}
                            label="Required Comment"
                            disabled={disabled}
                          />

                          <FormControlLabel
                            control={<Checkbox {...formik.getFieldProps({ name: `${taskKey}.naEnabled`, type: 'checkbox' })} />}
                            label={'N/A Enabled'}
                            disabled={disabled}
                          />
                        </FormGroup>
                      </Grid>
                    )}
                    {task.type === TaskType.BINARY && hasSubtasks && (
                      <>
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 44,
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
                          <Droppable
                            droppableId={`${DroppableAreaSubtaskPrefix}-Droppable-${index}`}
                            type={`${DroppableAreaSubtaskPrefix}-${index}`}
                          >
                            {(dropProvided) => (
                              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                                {task.subtasks?.map((subtask, childIndex) => (
                                  <Fragment key={subtask.id}>
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        /* (36px) = half of text
                                         * childIndex = 0 based index because we don't need the second set of numbers
                                         * (36px + 58px + 36px) = half of text + radio group + half of text
                                         */
                                        top: `calc((36px) + ${childIndex} * (36px + 58px + 36px))`,
                                        left: -48,
                                        borderBottom: '1px solid #C4C4C4',
                                        height: '1px',
                                        width: 48,
                                        '&:before': {
                                          content: `'On ${task.subtaskCorrectness?.value ? 'Yes' : 'No'}'`,
                                          fontSize: 9,
                                          position: 'absolute',
                                          top: -11,
                                          left: 8,
                                        },
                                      }}
                                    />
                                    <TaskConfiguration
                                      customerId={customerId}
                                      parentIndex={index}
                                      index={childIndex}
                                      task={subtask}
                                      isSubTask={true}
                                      taskListType={taskListType}
                                      disabled={disabled}
                                      canEditOptions={canEditOptions}
                                    />
                                  </Fragment>
                                ))}
                                {dropProvided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </Box>
                      </>
                    )}
                    {!isSubTask && (
                      <FieldArray name={`${taskKey}.subtasks`}>
                        {(subtasksHelper) => (
                          <SubtaskDialog
                            taskKey={taskKey}
                            task={task}
                            open={taskModal === 'SubtaskIf'}
                            onClose={() => {
                              setTaskModal('None')
                            }}
                            onSave={() => {
                              subtasksHelper.push(createEmptyTask())
                              setTaskModal('None')
                            }}
                          />
                        )}
                      </FieldArray>
                    )}
                    <DescriptionDialog
                      taskKey={taskKey}
                      open={taskModal === 'Description'}
                      onClose={() => {
                        if (hasDescription) {
                          formik.setFieldValue(`${taskKey}.draftDescription`, task.description)
                        }
                        setTaskModal('None')
                      }}
                      onSave={() => {
                        setTaskModal('None')
                        formik.setFieldValue(`${taskKey}.description`, task.draftDescription)
                      }}
                    />
                    <TaskCorrectiveAction
                      customerId={customerId}
                      correctiveAction={task.correctiveAction}
                      recipients={task.correctiveActionRecipients}
                      possibleRoles={taskListDetails?.possibleRoles ?? []}
                      open={taskModal === 'CorrectiveAction'}
                      onSet={(correctiveAction, recipients) => {
                        formik.setFieldValue(`${taskKey}.correctiveAction`, correctiveAction)
                        formik.setFieldValue(`${taskKey}.correctiveActionRecipients`, recipients)
                      }}
                      onClose={() => {
                        setTaskModal('None')
                      }}
                    />
                    {tasksWithAnyOptions && (
                      <OptionsDialog
                        mode={task.type === TaskType.MULTI_SELECT ? 'multi' : 'single'}
                        taskKey={taskKey}
                        open={
                          typeof taskModal === 'object' &&
                          taskModal.tag === 'CreateMulitpleOptionDialog' &&
                          taskModal.value === task.id
                        }
                        onClose={() => setTaskModal('None')}
                        readOnly={optionsReadOnly}  
                      />
                    )}
                  </>
                )}
              </FieldArray>
            </Grid>
          </Box>
        </div>
      )}
    </Draggable>
  )
}

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

const TaskCorrectness: FC<{ task: Task; taskKey: string; disabled: boolean; userTemperatureUnitC: boolean }> = ({
  task,
  taskKey,
  disabled,
  userTemperatureUnitC,
}) => {
  const [correctnessField, correctnessMeta, correctnessFieldHelper] = useField<Task['correctness']>(`${taskKey}.correctness`)
  const correctness = correctnessField.value ?? null

  const temperatureUnit = userTemperatureUnitC ? '°C' : '°F'
  const temperature = getTemperatureConverted(task.type, correctness?.value, userTemperatureUnitC)

  // Used to be able to write a temperatue and only convert on blur
  const [localTemperature, setLocalTemperature] = useState(temperature)

  switch (task.type) {
    case TaskType.BINARY:
      return (
        <Grid item xs="auto">
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
                  correctnessFieldHelper.setValue(null)
                } else {
                  // input values cant be booleans, so we need to parse from string to boolean
                  correctnessFieldHelper.setValue({
                    operation: TaskCorrectnessComparisson.EQUAL,
                    value: event.target.value === 'true',
                  })
                }
              }}
              disabled={disabled}
            >
              <MenuItem value="none">No Correct Answer</MenuItem>
              <MenuItem value="true">Correct Answer - Yes</MenuItem>
              <MenuItem value="false">Correct Answer - No</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      )
    case TaskType.TIME:
      return (
        <>
          <Grid item xs="auto">
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
                    correctnessFieldHelper.setValue(null)
                  } else {
                    correctnessFieldHelper.setValue({
                      operation: event.target.value as TaskCorrectnessComparisson,
                      value: correctness?.value ?? '',
                    })
                  }
                }}
                disabled={disabled}
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
          </Grid>
          {correctness != null && (
            <Grid item xs="auto">
              <DatePicker
                selected={
                  correctness.value != null && typeof correctness.value === 'string' && correctness.value !== ''
                    ? timeToDate(correctness.value)
                    : new Date()
                }
                onChange={(date) => {
                  if (date) {
                    correctnessFieldHelper.setValue({
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
            </Grid>
          )}
        </>
      )
    case TaskType.NUMBER:
      return (
        <>
          <Grid item xs="auto">
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
                    correctnessFieldHelper.setValue(null)
                  } else {
                    correctnessFieldHelper.setValue({
                      operation: event.target.value as TaskCorrectnessComparisson,
                      value: correctness?.value ?? 0,
                    })
                  }
                }}
                disabled={disabled}
              >
                <MenuItem value="none">No Correct Answer</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.GREATER}>&gt;</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.LESSER}>&lt;</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.EQUAL}>=</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.GREATER_EQUAL}>&ge;</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.LESSER_EQUAL}>&le;</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {correctness != null && (
            <Grid item xs="auto">
              <TextField
                variant="outlined"
                type="number"
                name="number"
                label="Number"
                placeholder="Number"
                value={correctness.value == null ? 0 : correctness.value}
                onChange={(event) => {
                  correctnessFieldHelper.setValue({
                    operation: correctness.operation ?? TaskCorrectnessComparisson.EQUAL,
                    value: event.target.value,
                  })
                }}
              />
            </Grid>
          )}
        </>
      )
    case TaskType.TEMPERATURE:
    case TaskType.TEMPERATURE_MANUAL:
    case TaskType.DISH_TEMPERATURE:
    case TaskType.BLE_TEMPERATURE_ONLY:
      return (
        <>
          <Grid item xs="auto">
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
                    correctnessFieldHelper.setValue(null)
                  } else {
                    correctnessFieldHelper.setValue({
                      operation: event.target.value as TaskCorrectnessComparisson,
                      value: temperature,
                    })
                  }
                }}
                disabled={disabled}
              >
                <MenuItem value="none">No Correct Answer</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.GREATER}>&gt;</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.LESSER}>&lt;</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.EQUAL}>=</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.GREATER_EQUAL}>&ge;</MenuItem>
                <MenuItem value={TaskCorrectnessComparisson.LESSER_EQUAL}>&le;</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {correctness != null && (
            <Grid item xs="auto">
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
                    correctnessFieldHelper.setValue({
                      operation: correctness.operation ?? TaskCorrectnessComparisson.EQUAL,
                      value: '',
                    })
                    setLocalTemperature('')
                    return
                  }

                  const finalTemperature = userTemperatureUnitC ? event.target.value : String((temperature - 32) * (5 / 9))
                  setLocalTemperature(getTemperatureConverted(task.type, finalTemperature, userTemperatureUnitC))

                  correctnessFieldHelper.setValue({
                    operation: correctness.operation ?? TaskCorrectnessComparisson.EQUAL,
                    value: finalTemperature,
                  })
                }}
                disabled={disabled}
              />
            </Grid>
          )}
        </>
      )

    default:
      return null
  }
}

const SubtaskDialog: FC<{ taskKey: string; task: Task; open: boolean; onClose: () => void; onSave: () => void }> = (props) => {
  const formik = useFormikContext<FormValues>()
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Show All Subtasks on:</DialogTitle>
      <DialogContent>
        <FormControl>
          <RadioGroup
            row
            name="subtaskCorrectness"
            value={props.task.subtaskCorrectness?.value}
            onChange={(event) => {
              // input values cant be booleans, so we need to parse from string to boolean
              formik.setFieldValue(`${props.taskKey}.subtaskCorrectness`, { operation: '=', value: event.target.value === 'true' })
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

const DescriptionDialog: FC<{ taskKey: string; open: boolean; onClose: () => void; onSave: () => void }> = (props) => {
  const formik = useFormikContext<FormValues>()
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
          {...formik.getFieldProps(`${props.taskKey}.draftDescription`)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button onClick={props.onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
const OptionsDialog: React.FC<{
  taskKey: string;
  open: boolean;
  onClose: () => void;
  mode: 'single' | 'multi';
  readOnly?: boolean;
}> = (props) => {
  const formik = useFormikContext<any>();
  const readOnly = !!props.readOnly;

  const optionsKey = `${props.taskKey}.options`;
  const correctnessKey = `${props.taskKey}.correctness`;

  const options: string[] = getIn(formik.values, optionsKey) || [];
  const correctness = getIn(formik.values, correctnessKey) || null;

  const readSelectedStrings = (): string[] => {
    if (!correctness) return [];
    if (props.mode === 'multi') return Array.isArray(correctness.value) ? correctness.value : [];
    return typeof correctness.value === 'string' && correctness.value ? [correctness.value] : [];
  };
  const writeSelectedStrings = (selected: string[]) => {
    if (readOnly) return; // <-- block writes
    if (props.mode === 'multi') {
      formik.setFieldValue(
        correctnessKey,
        selected.length ? { operation: TaskCorrectnessComparisson.INCLUDE, value: selected } : null
      );
    } else {
      formik.setFieldValue(
        correctnessKey,
        selected.length ? { operation: TaskCorrectnessComparisson.EQUAL, value: selected[0] } : null
      );
    }
  };

  const selectedStrings = readSelectedStrings();

  const [localSelectedIndex, setLocalSelectedIndex] = React.useState<number>(() => {
    if (props.mode !== 'single') return -1;
    const s = selectedStrings[0];
    return s ? options.findIndex((o) => o === s) : -1;
  });

  React.useEffect(() => {
    if (props.mode !== 'single') return;
    const s = selectedStrings[0];
    const idx = s ? options.findIndex((o) => o === s) : -1;
    setLocalSelectedIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, options.length]);

  const addOption = () => { if (!readOnly) formik.setFieldValue(optionsKey, [...options, '']); };

  const deleteOption = (index: number) => {
    if (readOnly) return;
    const updated = [...options];
    const removed = updated[index];
    updated.splice(index, 1);

    if (props.mode === 'single') {
      if (localSelectedIndex === index) {
        writeSelectedStrings([]);
        setLocalSelectedIndex(-1);
      } else if (localSelectedIndex > index) {
        setLocalSelectedIndex(localSelectedIndex - 1);
      }
    } else {
      const next = selectedStrings.filter((s) => s !== removed);
      writeSelectedStrings(next);
    }

    formik.setFieldValue(optionsKey, updated);
  };

  const updateOptionText = (index: number, next: string) => {
    if (readOnly) return;
    const updated = [...options];
    const prev = updated[index];
    updated[index] = next;

    if (props.mode === 'single') {
      if (localSelectedIndex === index) {
        writeSelectedStrings(next ? [next] : []);
        if (!next) setLocalSelectedIndex(-1);
      }
    } else {
      const nextSelected = selectedStrings.map((s) => (s === prev ? next : s)).filter(Boolean);
      writeSelectedStrings(nextSelected);
    }

    formik.setFieldValue(optionsKey, updated);
  };

  const toggleSelect = (index: number) => {
    if (readOnly) return;
    const option = options[index];
    if (!option) return;

    if (props.mode === 'multi') {
      const exists = selectedStrings.includes(option);
      const next = exists ? selectedStrings.filter((s) => s !== option) : [...selectedStrings, option];
      writeSelectedStrings(next);
    } else {
      if (localSelectedIndex === index) {
        writeSelectedStrings([]);
        setLocalSelectedIndex(-1);
      } else {
        writeSelectedStrings([option]);
        setLocalSelectedIndex(index);
      }
    }
  };

  const hasErrors = () =>
    options.some((_, i) => {
      const err = getIn(formik.errors, `${optionsKey}.${i}`);
      const touched = getIn(formik.touched, `${optionsKey}.${i}`);
      return touched && !!err;
    });

  const handleClose = () => {
    // on close, surface any validation for options array
    formik.setFieldTouched(optionsKey, true, false);
    formik.validateForm();
    props.onClose();
  };

  return (
    <Dialog open={props.open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{props.mode === 'multi' ? 'Create Options' : 'Create Option(s)'}</DialogTitle>
      <DialogContent sx={{ paddingX: 3, paddingY: 0 }}>
        {options.map((option: string, index: number) => {
          const err = getIn(formik.errors, `${optionsKey}.${index}`);
          const touched = getIn(formik.touched, `${optionsKey}.${index}`);
          const checked = props.mode === 'multi' ? selectedStrings.includes(option) : localSelectedIndex === index;

          return (
            <Box key={index} sx={{ paddingTop: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <TextField
                  fullWidth
                  variant="outlined"
                  error={touched && !!err}
                  helperText={touched && err ? err : ''}
                  label={`Option ${index + 1}`}
                  value={option || ''}
                  onBlur={() => formik.setFieldTouched(`${optionsKey}.${index}`)}
                  onChange={(e) => updateOptionText(index, e.target.value)}
                  disabled={readOnly}
                />
                <DeleteIcon
                  onClick={() => !readOnly && deleteOption(index)}
                  sx={{
                    fontSize: 40,
                    marginTop: 1,
                    color: 'error.main',
                    cursor: readOnly ? 'default' : 'pointer',
                    opacity: readOnly ? 0.4 : 1,
                    pointerEvents: readOnly ? 'none' : 'auto',
                  }}
                />
              </Box>

              {props.mode === 'single' ? (
                <FormControlLabel
                  control={
                    <Radio
                      checked={checked}
                      onChange={() => toggleSelect(index)}
                      disabled={!option || readOnly}
                    />
                  }
                  label="Correct Answer"
                />
              ) : (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!option && checked}
                      onChange={() => toggleSelect(index)}
                      disabled={!option || readOnly}
                    />
                  }
                  label="Correct Answer"
                />
              )}
            </Box>
          )
        })}

        <Button
          startIcon={<AddIcon />}
          onClick={addOption}
          variant="contained"
          color="primary"
          sx={{ marginY: 2 }}
          disabled={readOnly}
        >
          Add Option
        </Button>
      </DialogContent>
      <DialogActions
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'flex-end',
          paddingX: 4,
          paddingBottom: 2,
          gap: 1,
        }}
      >
        <Button onClick={handleClose} color="error" variant="text" sx={{ paddingX: 3 }}>
          Close
        </Button>
        <Button
          onClick={() => { if (!hasErrors()) handleClose(); }}
          color="primary"
          variant="outlined"
          sx={{ paddingX: 4 }}
          disabled={hasErrors() || readOnly}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}