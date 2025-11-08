import moment from 'moment'
import * as Yup from 'yup'
import { match } from 'ts-pattern'
import { Frequency } from 'rrule'

import { defaultTimeFormat } from '../../../webapp-lib/pathspot-react'
import { FormValue, ScheduleDates, getNameFromIcs, getStartFromForm, icsToForm, modifyICSwithAttrs, validateICS } from './scheduling'

// Needed until we upgrade typescript to 5.1
declare global {
  // eslint-disable-next-line
  namespace Intl {
    type Key = 'calendar' | 'collation' | 'currency' | 'numberingSystem' | 'timeZone' | 'unit'

    function supportedValuesOf(input: Key): string[]
  }
}

export const enum TaskType {
  // Option related
  BINARY = 'BINARY',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',

  // Temperature related
  TEMPERATURE = 'TEMPERATURE',
  DISH_TEMPERATURE = 'DISH_TEMPERATURE',
  TEMPERATURE_MANUAL = 'TEMPERATURE_MANUAL',
  BLE_TEMPERATURE_ONLY = 'BLE_TEMPERATURE_ONLY',
  SENSOR = 'SENSOR',

  // Image related
  PICTURE = 'PICTURE',
  SIGNATURE = 'SIGNATURE',

  // Time related
  DATE = 'DATE',
  TIME = 'TIME',

  // Number related
  NUMBER = 'NUMBER',
  SLIDER_NUMERIC = 'SLIDER_NUMERIC',
  NUMBER_AND_SELECT = 'NUMBER_AND_SELECT',
  TOTAL_SCANS = 'TOTAL_SCANS',

  // Miscellaneous
  TEXT = 'TEXT',
}

const TYPE_WITH_CORRECTNESS = [
  TaskType.BINARY,
  TaskType.TEMPERATURE,
  TaskType.DISH_TEMPERATURE,
  TaskType.BLE_TEMPERATURE_ONLY,
  TaskType.TEMPERATURE_MANUAL,
  TaskType.TIME,
  TaskType.DATE,
  TaskType.NUMBER,
  TaskType.SELECT,
  TaskType.MULTI_SELECT,
  TaskType.SLIDER_NUMERIC,
  TaskType.TOTAL_SCANS,
]
export const taskTypeHasCorrectness = (type: TaskType): boolean => {
  return TYPE_WITH_CORRECTNESS.includes(type)
}

export const enum TaskCorrectnessComparisson {
  GREATER = '>',
  LESSER = '<',
  EQUAL = '=',
  GREATER_EQUAL = '>=',
  LESSER_EQUAL = '<=',
  NOT_EQUAL = '!=',
  INCLUDE = 'INCLUDE',
}

export type TaskCorrectness = {
  operation: TaskCorrectnessComparisson
  value: boolean | number | string | Array<string>
  value2?: boolean | number | string | null
}

export type TemperatureUnit = 'C' | 'F'

export type CorrectiveAction = {
  id: number | string | null
  isCorrectiveAction: true
  name: string | null
  description: string | null
  active: boolean | null
  assignable: boolean | null
  customerId: number
  lastModified: string | null
  document: Task[] | null
}

export type Task = {
  assignable: boolean
  active: boolean
  attachments: []
  completed: boolean
  description: string | null
  draftDescription: string | null
  expectedAnswer: null
  allowNotes: boolean
  allowS3: boolean
  naEnabled: boolean
  flag: boolean
  id: string
  readonly lastModified: number
  readonly lastModifiedBy: number
  name: string
  notes: string
  response: null
  readonly showSubtaskIf: null
  type: TaskType
  options: string[] | null
  sliderNumericOptions: SliderNumericOptions | null
  expectedScans: number | null
  subtaskCorrectness: TaskCorrectness | null
  subtasks: Task[] | null
  correctness: TaskCorrectness | null
  correctiveAction: CorrectiveAction | null
  correctiveActionRecipients: {
    failAlertEmail: number[]
    failAlertSms: number[]
    anyAlertEmail: number[]
    anyAlertSms: number[]
  } | null
}

export type SliderNumericOptions = {
  max: string
  min: string
  step?: string
}

export type Epoch = {
  str: string
  epoch: number
  epoch_ms: number
}

export const enum AssignmentType {
  Location = 'Location',
  User = 'User',
}

type Assignment = {
  id?: number
  active: boolean
  assignmentName: string
  departmentId: number | null
  isOverride: boolean
  locationId: number | null
  userIds: number[] | null
  jobIds: number[] | null
  scheduleIcs: string
  timezone: string
  reminderInterval: number | null
}

type LocationAssignment = Omit<Assignment, 'timezone'> & {
  timezone: null
}

export type TaskList = {
  id: number | string | null
  isCorrectiveAction: false
  name: string | null
  description: string | null
  active: boolean | null
  assignable: boolean | null
  customerId: number
  lastModified: string | null
  document: Task[] | null
  assignments: Assignment[]
  internalTags: string[] | null
}

type LocationSimpleInfo = {
  name: string
  timezone: string
  resetTime: number
}

export type TaskListDetailsResponse = {
  possibleLocations: Record<number, LocationSimpleInfo>
  possibleRoles: Record<number, string>
  possibleUsers: Record<number, string>
  taskList: TaskList
}

export type UpdatableTaskList = Omit<TaskList, 'assignments'> & {
  assignments: Array<Assignment | LocationAssignment>
}

export type UpdatableTaskListDetails = Omit<TaskListDetailsResponse, 'taskList'> & {
  taskList: UpdatableTaskList
}

export type CreateTaskListDetailsResponse = Array<
  TaskListDetailsResponse & {
    customerId: number
    customerName: string
  }
>

export type TaskListStatus = {
  id: number
  name: string
  noteId: string | null
  description: string | null
  active: boolean
  assignable: boolean
  customerId: number
  customerName: string
  taskCount: number
  lastModified: Epoch | null
  schedules: string[]
  firstTimingStarts: Epoch[]
  lastTimingEnds: (Epoch | null)[]
}

export type TaskListStatusForTable = Omit<TaskListStatus, 'active'> & {
  active: string
  start: string
  end: string
  recurrence: string
}

export type Override = {
  id: number[]
  type: AssignmentType
  assignedLocation: { label: string; value: string } | null
  assignedRoles: Array<{ label: string; value: string }>
  assignedUsers: Array<{ label: string; value: string }>
  timezone: string | null
  shareAcrossUsers: boolean
  schedule: string[] | null
  reminderInterval: number | null
}

export const enum TaskListType {
  TaskList = 1,
  CorrectiveAction,
}

export type FormValues = {
  name: string
  description: string
  assignable: boolean
  active: boolean
  taskListType: TaskListType
  assignmentType: AssignmentType
  assignedLocations: Array<{ label: string; value: string }>
  assignedRoles: Array<{ label: string; value: string }>
  assignedUsers: Array<{ label: string; value: string }>
  overrides: Override[]
  timezone: string
  shareAcrossUsers: boolean
  schedule: string[] | null
  taskList: Task[]
  assignmentTracker: {
    originalAssignmentType: AssignmentType
    originalShareAcrossUsers: boolean
    originalAssignmentsDates: ScheduleDates[]
    originalIdsByScheduleIndex: Pick<Assignment, 'id' | 'locationId' | 'userIds'>[][]
  }
}

export const enum TaskFormSchemaType {
  REGULAR = '',
  A1_HOLDING = 'A1_HOLDING',
  A1_COOKING = 'A1_COOKING',
  A2_COOLING = 'A2_COOLING',
}

export const getTasklistRestriction = (checklistInternalTags?: string[] | null) => {
  const internalTags = checklistInternalTags ?? []
  if (internalTags.includes(TaskFormSchemaType.A1_HOLDING)) {
    return TaskFormSchemaType.A1_HOLDING
  } else if (internalTags.includes(TaskFormSchemaType.A1_COOKING)) {
    return TaskFormSchemaType.A1_COOKING
  } else if (internalTags.includes(TaskFormSchemaType.A2_COOLING)) {
    return TaskFormSchemaType.A2_COOLING
  } else {
    return TaskFormSchemaType.REGULAR
  }
}

export const getTaskFormSchema = (schemaType: TaskFormSchemaType) => {
  switch (schemaType) {
    case TaskFormSchemaType.A1_HOLDING:
      return A1HoldingFormSchema
    case TaskFormSchemaType.A1_COOKING:
      return A1CookingFormSchema
    case TaskFormSchemaType.A2_COOLING:
      return A2CoolingFormSchema
    case TaskFormSchemaType.REGULAR:
      return RegularFormSchema
  }
}

const getTaskIndexFromYupPath = (path: string) => {
  return parseInt(path.match(/\d+/)?.[0] ?? '-1') + 1
}

const getTaskLabelFromYupPath = (path: string): string => {
  const taskMatch = path.match(/^taskList\[(\d+)\]/)
  const subtaskMatch = path.match(/^taskList\[(\d+)\]\.subtasks\[(\d+)\]/)

  if (subtaskMatch) {
    const taskIndex = parseInt(subtaskMatch[1]!, 10) + 1
    const subtaskIndex = parseInt(subtaskMatch[2]!, 10) + 1
    return `Subtask #${subtaskIndex} of Task #${taskIndex}`
  }

  if (taskMatch) {
    const taskIndex = parseInt(taskMatch[1]!, 10) + 1
    return `Task #${taskIndex}`
  }

  return 'Task'
}

type TaskYupSchema = {
  name: string
  correctiveAction?: any | null
  correctness: {
    operation?: string | null
    value?: any
  } | null
  type: string
  options?: any[] | null
  subtasks?: TaskYupSchema[] | null
}
const buildTaskSchema = (): Yup.ObjectSchema<TaskYupSchema> =>
  Yup.object().shape({
    name: Yup.string().required(({ path }) => `${getTaskLabelFromYupPath(path)} has no name.`),
    correctiveAction: Yup.object().nullable(),
    correctness: Yup.object()
      .shape({
        operation: Yup.string().nullable(),
        value: Yup.mixed().nullable(),
      })
      .nullable()
      .test('correctness', 'Invalid Correctness', (value, { parent, path, createError }) => {
        if (parent.correctiveAction != null && value?.operation == null) {
          return createError({
            message: `${getTaskLabelFromYupPath(path)} needs a correct answer to be set when setting a Corrective Action.`,
          })
        }
        return true
      }),
    type: Yup.string().required('Task type required'),
    options: Yup.array()
      .nullable()
      .test('options', 'Options validation', (value, { parent, path, createError }) => {
        const requiresOptions = [TaskType.SELECT, TaskType.MULTI_SELECT, TaskType.NUMBER_AND_SELECT]
        if (requiresOptions.includes(parent.type) && (!value || !value.length)) {
          return createError({ message: `Task #${getTaskIndexFromYupPath(path)} must have at least one option.` })
        }
        if (!requiresOptions.includes(parent.type) && value != null) {
          return createError({ message: `Task #${getTaskIndexFromYupPath(path)} should not have options.` })
        }
        return true
      }),
    subtasks: Yup.array()
      .of(
        Yup.lazy<Yup.ObjectSchema<TaskYupSchema>>(() => buildTaskSchema())
      )
      .nullable()
      .notRequired(),
  })

const taskSchema: Yup.ObjectSchema<TaskYupSchema> = buildTaskSchema();

const RegularFormSchema = Yup.object().shape({
  name: Yup.string().required('Task list name required'),
  taskList: Yup.array().of(taskSchema),
  schedule: Yup.array()
  .of(
    Yup.string()
      .required()
      .test('validate-ics', 'Invalid ICS', (value, { createError }) => {
        const result = validateICS(value)
        return result.valid || createError({ message: result.message })
      })
  )
  .nullable(),
})

//Variables below are ones supported for A1/A2, do not add enum members here unless the task type applies to A1/A2
const itemNameTaskTypes = [TaskType.TEXT, TaskType.SELECT]
const completedByTaskTypes = [TaskType.TEXT, TaskType.SELECT, TaskType.SIGNATURE]
const temperatureTaskTypes = [TaskType.TEMPERATURE, TaskType.TEMPERATURE_MANUAL, TaskType.BLE_TEMPERATURE_ONLY]

const completedByNamePattern = /^completed by/i

const A1HoldingFormSchema = RegularFormSchema.shape({
  taskList: Yup.array(
    Yup.object().shape({
      name: Yup.string()
        .required(({ path }) => `Task #${getTaskIndexFromYupPath(path)} has no name.`)
        .when('type', {
          is: (type: string) => type !== TaskType.SIGNATURE,
          then: (schema) =>
            schema.matches(
              /^(cold|hot)(\s|$)/i,
              ({ path }) =>
                `Task #${getTaskIndexFromYupPath(path)} must have a name that starts with one of the words (Cold, Hot).`
            ),
        }),
      correctiveAction: Yup.object().nullable().oneOf([null]),
      correctness: Yup.object().nullable().oneOf([null]),
      options: Yup.array()
        .nullable()
        .oneOf([null], ({ path }) => `Task #${getTaskIndexFromYupPath(path)} must not contain options.`),
      type: Yup.string().oneOf(
        [TaskType.BINARY, TaskType.SIGNATURE],
        ({ path }) => `Task #${getTaskIndexFromYupPath(path)} must be of type ${TaskType.BINARY} or ${TaskType.SIGNATURE}.`
      ),
      subtasks: Yup.array()
        .nullable()
        .when('type', {
          is: (type: string) => type !== TaskType.SIGNATURE,
          then: (schema) =>
            schema.test('subtasks-types', 'Subtasks Types', (subtasks, { path, createError }) => {
              const expectedSubtaskTypesOrder = [itemNameTaskTypes, temperatureTaskTypes]
              const taskReadIndex = getTaskIndexFromYupPath(path)

          if (!subtasks || subtasks.length < expectedSubtaskTypesOrder.length) {
            return createError({
              message: `Task #${taskReadIndex} is missing expected subtasks.`,
            })
          }

          for (let l = 0; l < expectedSubtaskTypesOrder.length; l++) {
            if (!subtasks[l].name) {
              return createError({
                path: `${path}[${l}].name`,
                message: `Subtask #${l + 1} of task #${taskReadIndex} has no name.`,
              })
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The array loops through valid indexes
            const currentExpectedSubtaskType = expectedSubtaskTypesOrder[l]!
            if (!currentExpectedSubtaskType.includes(subtasks[l].type)) {
              return createError({
                path: `${path}[${l}].type`,
                message: `Subtask #${l + 1} of task #${taskReadIndex} must be one of types ${currentExpectedSubtaskType.join(', ')}.`,
              })
            }
          }

          if (subtasks.length > expectedSubtaskTypesOrder.length) {
            const lastSubtaskIndex = subtasks.length - 1
            if (
              completedByNamePattern.test(subtasks[lastSubtaskIndex].name) &&
              !completedByTaskTypes.includes(subtasks[lastSubtaskIndex].type)
            ) {
              return createError({
                path: `${path}[${lastSubtaskIndex}].type`,
                message: `Subtask #${lastSubtaskIndex + 1} of task #${taskReadIndex} must be one of types ${completedByTaskTypes.join(
                  ', '
                )}.`,
              })
            }
          }

          return true
        }),
      })
    })
  ),
})

const A1CookingFormSchema = RegularFormSchema.shape({
  taskList: Yup.array(
    Yup.object().shape({
      name: Yup.string().required(({ path }) => `Task #${getTaskIndexFromYupPath(path)} has no name.`),
      correctiveAction: Yup.object().nullable().oneOf([null]),
      correctness: Yup.object().nullable().oneOf([null]),
      type: Yup.string().oneOf(
        [TaskType.BINARY, TaskType.SIGNATURE],
        ({ path }) => `Task #${getTaskIndexFromYupPath(path)} must be of type ${TaskType.BINARY} or ${TaskType.SIGNATURE}.`
      ),
      options: Yup.array()
        .nullable()
        .oneOf([null], (ref) => `Task #${getTaskIndexFromYupPath(ref.path)} must not contain options.`),
      subtasks: Yup.array()
        .nullable()
        .when('type', {
          is: (type: string) => type !== TaskType.SIGNATURE,
          then: (schema) =>
            schema.test('subtasks-types', 'Subtasks Types', (subtasks, { path, createError }) => {
              const expectedSubtaskTypesOrder = [itemNameTaskTypes, [TaskType.TIME], temperatureTaskTypes]
              const taskReadIndex = getTaskIndexFromYupPath(path)

          if (!subtasks || subtasks.length < expectedSubtaskTypesOrder.length) {
            return createError({
              message: `Task #${taskReadIndex} is missing expected subtasks.`,
            })
          }

          for (let l = 0; l < expectedSubtaskTypesOrder.length; l++) {
            if (!subtasks[l].name) {
              return createError({
                path: `${path}[${l}].name`,
                message: `Subtask #${l + 1} of task #${taskReadIndex} has no name.`,
              })
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The array loops through valid indexes
            const currentExpectedSubtaskType = expectedSubtaskTypesOrder[l]!
            if (!currentExpectedSubtaskType.includes(subtasks[l].type)) {
              return createError({
                path: `${path}[${l}].type`,
                message: `Subtask #${l + 1} of task #${taskReadIndex} must be one of types ${currentExpectedSubtaskType.join(', ')}.`,
              })
            }
          }

          if (subtasks.length > expectedSubtaskTypesOrder.length) {
            const lastSubtaskIndex = subtasks.length - 1
            if (
              completedByNamePattern.test(subtasks[lastSubtaskIndex].name) &&
              !completedByTaskTypes.includes(subtasks[lastSubtaskIndex].type)
            ) {
              return createError({
                path: `${path}[${lastSubtaskIndex}].type`,
                message: `Subtask #${lastSubtaskIndex + 1} of task #${taskReadIndex} must be one of types ${completedByTaskTypes.join(
                  ', '
                )}.`,
              })
            }
          }

          return true
        }),
      })
    })
  ),
})

const A2CoolingFormSchema = RegularFormSchema.shape({
  taskList: Yup.array(
    Yup.object().shape({
      name: Yup.string().required(({ path }) => `Task #${getTaskIndexFromYupPath(path)} has no name.`),
      correctiveAction: Yup.object().nullable(),
      correctness: Yup.object()
        .shape({
          operation: Yup.string().nullable(),
          value: Yup.mixed().nullable(),
        })
        .nullable()
        .test('correctness', 'Invalid Correcteness', (value, { parent, path, createError }) => {
          if (parent.correctiveAction != null && value?.operation == null) {
            return createError({
              message: `Task #${getTaskIndexFromYupPath(path)} is missing the correct answer check.`,
            })
          }

          return true
        }),
      options: Yup.array()
        .nullable()
        .test('options', 'Empty Options', (value, { parent, path, createError }) => {
          const isSelectType = parent.type === TaskType.SELECT || parent.type === TaskType.NUMBER_AND_SELECT
          if (isSelectType && (value == null || !value.length)) {
            return createError({
              message: `Task #${getTaskIndexFromYupPath(path)} must have at least one option.`,
            })
          }
          return true
        }),
      type: Yup.string().required(),
      subtasks: Yup.array().nullable(),
    })
  ).test('tasks-order', 'Tasks Order', (tasks, { path, createError }) => {
    const expectedTaskTypesOrder = [itemNameTaskTypes, temperatureTaskTypes, temperatureTaskTypes, temperatureTaskTypes]

    if (!tasks || tasks.length < expectedTaskTypesOrder.length) {
      return createError({
        message: `The tasklist needs at least ${expectedTaskTypesOrder.length} tasks.`,
      })
    }

    for (let l = 0; l < expectedTaskTypesOrder.length; l++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The array loops through valid indexes
      if (!expectedTaskTypesOrder[l]!.includes(tasks[l]!.type as TaskType)) {
        return createError({
          path: `${path}[${l}].type`,
          message: `Task #${l + 1} must be one of types ${expectedTaskTypesOrder[l]?.join(', ')}.`,
        })
      }
    }

    const extraTaskIndex = expectedTaskTypesOrder.length
    if (tasks.length > extraTaskIndex) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Valid due to check above
      const targetTask = tasks[extraTaskIndex]!
      if (targetTask.type === TaskType.BINARY && targetTask.correctiveAction === null) {
        const expectedSubtaskTypesOrder = [temperatureTaskTypes, temperatureTaskTypes]

        const subtasks = targetTask.subtasks
        if (!subtasks || subtasks.length < expectedSubtaskTypesOrder.length) {
          return createError({
            message: `Task #${extraTaskIndex} is missing expected subtasks.`,
          })
        }

        const pathToSubtask = `${path}[${extraTaskIndex}].subtasks`
        for (let l = 0; l < expectedSubtaskTypesOrder.length; l++) {
          if (!subtasks[l].name) {
            return createError({
              path: `${pathToSubtask}[${l}].name`,
              message: `Subtask #${l + 1} of task #${extraTaskIndex + 1} has no name.`,
            })
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- The array loops through valid indexes
          const currentExpectedSubtaskType = expectedSubtaskTypesOrder[l]!
          if (!currentExpectedSubtaskType.includes(subtasks[l].type)) {
            return createError({
              path: `${pathToSubtask}[${l}].type`,
              message: `Subtask #${l + 1} of task #${extraTaskIndex + 1} must be one of types ${currentExpectedSubtaskType.join(', ')}.`,
            })
          }
        }
      }

      const lastTaskIndex = tasks.length - 1
      if (
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Valid due to calculation above
        completedByNamePattern.test(tasks[lastTaskIndex]!.name) &&
        !completedByTaskTypes.includes(tasks[lastTaskIndex]?.type as TaskType)
      ) {
        return createError({
          path: `${path}[${lastTaskIndex}].type`,
          message: `Task #${lastTaskIndex + 1} must be one of types ${completedByTaskTypes.join(', ')}.`,
        })
      }
    }

    return true
  }),
})

const mapEpochToTime = (epoch: Epoch): string => {
  return moment(epoch.epoch_ms).format(defaultTimeFormat)
}

const mapRecurrenceToString = (frequency: Frequency) => {
  switch (frequency) {
    case Frequency.DAILY:
      return 'Daily'
    case Frequency.WEEKLY:
      return 'Weekly'
    case Frequency.MONTHLY:
      return 'Monthly'
    default:
      return 'Unknown'
  }
}

const mapListToString = <InType>(list: (InType | null)[], mapper?: (input: InType) => string): string => {
  if (list.length === 1 && list[0] !== null) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Not undefined since length is 1
    const value = list[0]!
    return mapper ? mapper(value) : String(value)
  }

  if (list.length > 1) {
    return 'Multiple'
  }

  return '-'
}

export const mapTaskListToTable = (status: TaskListStatus): TaskListStatusForTable => {
  const recurrences = Array.from(new Set(status.schedules.map((schedule) => icsToForm([schedule]).recurrence?.options.freq ?? null)))
  return {
    ...status,
    active: status.active ? 'Yes' : 'No',
    start: mapListToString(status.firstTimingStarts, mapEpochToTime),
    end: mapListToString(status.lastTimingEnds, mapEpochToTime),
    recurrence: mapListToString(recurrences, mapRecurrenceToString),
  }
}

export const createEmptyOverride = (): Override => {
  // The task details endpoint that creates assignments ignores the id we pass, so we can set one helpers
  // We are using negatives, because the db stores the ids as positive integers, so these avoids any conflicts
  const randomId = -1 * Date.now()
  return {
    id: [randomId],
    type: AssignmentType.Location,
    assignedLocation: null,
    assignedRoles: [],
    assignedUsers: [],
    timezone: null,
    shareAcrossUsers: false,
    schedule: null,
    reminderInterval: null,
  }
}

export const createEmptyTask = (): Task => {
  return {
    assignable: true,
    active: true,
    attachments: [],
    completed: false,
    description: null,
    draftDescription: null,
    expectedAnswer: null,
    allowNotes: false,
    allowS3: false,
    naEnabled: false,
    flag: false,
    id: crypto.randomUUID(),
    lastModified: -1,
    lastModifiedBy: -1,
    name: '',
    notes: '',
    response: null,
    showSubtaskIf: null,
    type: TaskType.BINARY,
    options: null,
    sliderNumericOptions: null,
    expectedScans: 0,
    subtaskCorrectness: null,
    subtasks: null,
    correctness: null,
    correctiveAction: null,
    correctiveActionRecipients: null,
  }
}

const getLocationAssignment = (
  form: FormValues,
  location: FormValues['assignedLocations'][number],
  schedule: string,
  icsForm: FormValue,
  index: number
): LocationAssignment => {
  const currentReminder = icsForm.tag === 'Single' ? icsForm.reminder : icsForm.reminders[index]
  const currentAssignmentName = icsForm.tag === 'Single' ? icsForm.name : icsForm.names[index]
  const assignmentName = !currentAssignmentName || currentAssignmentName === 'Untitled event' ? form.name : currentAssignmentName
  const assignedJobIds = form.assignedRoles.map((role) => parseInt(role.value, 10))
  const locationAsInt = parseInt(location.value, 10)
  let existingAssignmentId: number | null = null

  // Make sure that originally we were working with location assignments before we try to match the changes to existing
  // assignments.
  if (form.assignmentTracker.originalAssignmentType === AssignmentType.Location) {
    // If location assignment exists for this schedule index then simply get its id.
    existingAssignmentId =
      index < form.assignmentTracker.originalIdsByScheduleIndex.length
        ? form.assignmentTracker.originalIdsByScheduleIndex[index]!.find((assignment) => assignment.locationId === locationAsInt)?.id ?? null
        : null
  }

  return {
    ...(existingAssignmentId && { id: existingAssignmentId }),
    active: true,
    assignmentName: assignmentName,
    departmentId: null,
    isOverride: false,
    locationId: locationAsInt,
    userIds: null,
    jobIds: assignedJobIds,
    scheduleIcs: schedule,
    timezone: null,
    reminderInterval: currentReminder!,
  }
}

const getUserAssignment = (
  form: FormValues,
  userIds: FormValues['assignedUsers'],
  schedule: string,
  icsForm: FormValue,
  index: number
): Assignment => {
  const currentReminder = icsForm.tag === 'Single' ? icsForm.reminder : icsForm.reminders[index]
  const currentAssignmentName = icsForm.tag === 'Single' ? icsForm.name : icsForm.names[index]
  const assignmentName = !currentAssignmentName || currentAssignmentName === 'Untitled event' ? form.name : currentAssignmentName
  const assignedUserIds = userIds.map((userId) => parseInt(userId.value, 10))
  let existingAssignmentId: number | null = null

  // Make sure that originally we were working with user assignments before we try to match the changes to existing
  // assignments. Also, switching between shared and non-shared or between repeatable and non-repeatable already
  // disqualifies us for matching the existing assignments since they should be represented separately on the backend.
  if (
    form.assignmentTracker.originalAssignmentType === AssignmentType.User &&
    form.assignmentTracker.originalShareAcrossUsers === form.shareAcrossUsers
  ) {
    const potentialAssignmentsExist = index < form.assignmentTracker.originalIdsByScheduleIndex.length

    // If we are sharing the assignment across users then for any new user we add we simply edit the existing single
    // assignment.
    if (form.shareAcrossUsers) {
      existingAssignmentId =
        potentialAssignmentsExist && form.assignmentTracker.originalIdsByScheduleIndex[index]!.length === 1
          ? form.assignmentTracker.originalIdsByScheduleIndex[index]![0]!.id ?? null
          : null
    } else {
      // If we are not sharing assignments then search for one that has exactly the target user assigned to it.
      existingAssignmentId = potentialAssignmentsExist
        ? form.assignmentTracker.originalIdsByScheduleIndex[index]!.find(
            (assignment) => assignment.userIds && assignment.userIds.length === 1 && assignment.userIds[0] === assignedUserIds[0]
          )?.id ?? null
        : null
    }
  }

  return {
    ...(existingAssignmentId && { id: existingAssignmentId }),
    active: true,
    assignmentName: assignmentName,
    departmentId: null,
    isOverride: false,
    locationId: null,
    userIds: assignedUserIds,
    jobIds: null,
    scheduleIcs: schedule,
    timezone: form.timezone || '',
    reminderInterval: currentReminder!,
  }
}
const getAssignments = (possibleLocations: Record<number, LocationSimpleInfo>, form: FormValues) => {
  return match(form)
    .returnType<Array<Assignment | LocationAssignment>>()
    .with({ assignmentType: AssignmentType.Location, assignedLocations: [{ value: '-1', label: 'All' }] }, () => {
      const icsForm = icsToForm(form.schedule)
      return (
        form.schedule?.flatMap((schedule, index) => {
          return Object.entries(possibleLocations)
            .map(([id, info]) => {
              return { label: info.name, value: id }
            })
            .map((location) => getLocationAssignment(form, location, schedule, icsForm, index))
        }) ?? []
      )
    })
    .with({ assignmentType: AssignmentType.Location }, () => {
      const icsForm = icsToForm(form.schedule)
      return (
        form.schedule?.flatMap((schedule, index) => {
          return form.assignedLocations.map((location) => getLocationAssignment(form, location, schedule, icsForm, index))
        }) ?? []
      )
    })
    .with({ assignmentType: AssignmentType.User, shareAcrossUsers: true }, () => {
      const icsForm = icsToForm(form.schedule)
      return (
        form.schedule?.map((schedule, index) => {
          return getUserAssignment(form, form.assignedUsers, schedule, icsForm, index)
        }) ?? []
      )
    })
    .with({ assignmentType: AssignmentType.User, shareAcrossUsers: false }, () => {
      const icsForm = icsToForm(form.schedule)
      return (
        form.schedule?.flatMap((schedule, index) => {
          return form.assignedUsers.map((user) => {
            return getUserAssignment(form, [user], schedule, icsForm, index)
          })
        }) ?? []
      )
    })
    .exhaustive()
}

export const formValuesToTaskList = (taskListResponse: UpdatableTaskListDetails, form: FormValues) => {
  const initialTaskList = taskListResponse.taskList
  const newTaskList = { ...initialTaskList }

  newTaskList.name = form.name
  newTaskList.description = form.description
  newTaskList.active = form.active
  newTaskList.assignable = form.assignable
  newTaskList.document = form.taskList
  newTaskList.assignments = getAssignments(taskListResponse.possibleLocations, form)

  const assignmentOverrides = form.overrides.flatMap((override) => {
    const locationId = override.type === AssignmentType.Location ? parseInt(override.assignedLocation?.value ?? '', 10) : null
    const jobIds = override.type === AssignmentType.Location ? override.assignedRoles.map((role) => parseInt(role.value, 10)) : null
    const userIds =
      override.type === AssignmentType.User
        ? override.shareAcrossUsers
          ? override.assignedUsers.map((user) => parseInt(user.value, 10))
          : [parseInt(override.assignedUsers[0]!.value, 10)]
        : null

    return (
      override.schedule?.map((ics, index) => ({
        id: override.id[index],
        active: true,
        assignmentName: getNameFromIcs(ics, initialTaskList.name ?? ''),
        departmentId: null,
        isOverride: true,
        locationId,
        userIds,
        jobIds,
        scheduleIcs: ics,
        timezone: override.type === AssignmentType.Location ? null : override.timezone,
        reminderInterval: override.reminderInterval === -1 ? null : override.reminderInterval,
      })) ?? []
    )
  })

  newTaskList.assignments.push(...assignmentOverrides)

  return newTaskList
}

export const migrateTaskList = (taskList: TaskList): TaskList => {
  const newTaskList = { ...taskList }

  newTaskList.document =
    newTaskList.document?.map((task) => {
      if (task.showSubtaskIf != null) {
        if (task.subtasks?.length) {
          return { ...task, subtaskCorrectness: { operation: TaskCorrectnessComparisson.EQUAL, value: task.showSubtaskIf } }
        } else {
          return { ...task, subtaskCorrectness: null, showSubtaskIf: null }
        }
      }

      return task
    }) ?? null

  return newTaskList
}

export const cleanEmptyOptionsFromTasklist = (taskList: TaskList) => {
  for (const task of taskList.document ?? []) {
    const options = task.options?.filter((option) => !!option.trim()) ?? []
    task.options = options.length > 0 ? options : null
  }
  return taskList
}

const getOverrides = (taskListDetails: TaskListDetailsResponse | undefined, overrideAssigments: Assignment[]): Override[] => {
  const allOverrides = overrideAssigments.map((assigment) => {
    const isLocation = assigment.locationId

    if (isLocation) {
      return {
        id: [assigment.id],
        type: AssignmentType.Location,
        assignedLocation: {
          value: `${assigment.locationId}`,
          label: taskListDetails?.possibleLocations[assigment.locationId as number]?.name ?? '',
        },
        assignedRoles:
          assigment.jobIds?.map((roleId) => ({
            value: `${roleId}`,
            label: taskListDetails?.possibleRoles[roleId] ?? '',
          })) ?? [],
        schedule: [assigment.scheduleIcs],
        reminderInterval: assigment.reminderInterval,
        timezone: null,
        assignedUsers: [],
        shareAcrossUsers: false,
      } as Override
    }

    return {
      id: [assigment.id],
      type: AssignmentType.User,
      assignedUsers:
        assigment.userIds?.map((userId) => ({
          value: `${userId}`,
          label: taskListDetails?.possibleUsers[userId] ?? '',
        })) ?? [],
      timezone: assigment.timezone,
      shareAcrossUsers: (assigment.userIds?.length ?? 1) > 1,
      schedule: [assigment.scheduleIcs],
      reminderInterval: assigment.reminderInterval,
      assignedLocation: null,
      assignedRoles: [],
    } as Override
  })

  return allOverrides.reduce<Override[]>((overrides, current) => {
    const currentIcsForm = icsToForm(current.schedule)

    // check if assignment exists
    const overrideIndex = overrides.findIndex((o) => {
      const isSameType = o.type === current.type
      if (!isSameType) {
        return false
      }

      const sameLocation = o.assignedLocation?.value === current.assignedLocation?.value
      const sameRoles = o.assignedRoles.every((role) => current.assignedRoles.some((c) => role.value === c.value))
      const sameUsers = o.assignedUsers.every((user) => current.assignedUsers.some((c) => user.value === c.value))

      const isSameAssigment = current.type === AssignmentType.Location ? sameLocation && sameRoles : sameUsers

      // It's not assigned to the same location/user, so skip
      if (!isSameAssigment) {
        return false
      }

      // Check if ICS is for the same day and its daily, it's the only multiple we support
      const oIcsForm = icsToForm(o.schedule)
      if (currentIcsForm.recurrence?.options.freq === Frequency.DAILY && oIcsForm.recurrence?.options.freq === Frequency.DAILY) {
        return moment(getStartFromForm(currentIcsForm)).isSame(getStartFromForm(oIcsForm), 'day')
      }

      return false
    })

    if (overrideIndex === -1) {
      return overrides.concat([current])
    }

    if (current.schedule?.[0]) {
      overrides[overrideIndex]!.schedule?.push(current.schedule[0])
      overrides[overrideIndex]!.id.push(current.id[0]!)
    }

    return overrides
  }, [])
}

const updateIcsForAssignments = (assignments: Assignment[], taskList: TaskList): Assignment[] => {
  const timeNow = moment()
  return assignments.map((assignment) => {
    return {
      ...assignment,
      scheduleIcs: modifyICSwithAttrs(
        assignment.scheduleIcs,
        {
          name: assignment.assignmentName ?? taskList.name,
          reminder: assignment.reminderInterval,
        },
        timeNow
      ),
    }
  })
}

export const taskListDetailsResponseToFormValues = (taskListDetails?: TaskListDetailsResponse): FormValues => {
  const processedAssignments = taskListDetails
    ? updateIcsForAssignments(taskListDetails.taskList.assignments, taskListDetails.taskList)
    : []
  processedAssignments.sort((assigL, assigR) => (assigL.id ?? 0) - (assigR.id ?? 0))
  const assignments = processedAssignments.filter(({ isOverride }) => !isOverride)
  const overrideAssigments = processedAssignments.filter(({ isOverride }) => isOverride)
  const assignedLocations = assignments
    .filter(({ locationId }) => locationId)
    .reduce<number[]>((ids, assignment) => {
      if (!assignment.locationId) {
        return ids
      }

      const uniqueIds = new Set([...ids, assignment.locationId])
      return Array.from(uniqueIds.values())
    }, [])
    .map((locationId) => ({
      value: `${locationId}`,
      label: taskListDetails?.possibleLocations[locationId]?.name ?? '',
    }))
  const assignedRoles = assignments
    .filter(({ jobIds }) => jobIds)
    .reduce<number[]>((ids, assignment) => {
      const uniqueIds = new Set([...ids, ...(assignment.jobIds || [])])
      return Array.from(uniqueIds.values())
    }, [])
    .map((roleId) => ({
      value: `${roleId}`,
      label: taskListDetails?.possibleRoles[roleId] ?? '',
    }))

  const assignedUsers = assignments
    .filter(({ userIds }) => userIds)
    .reduce<number[]>((ids, assignment) => {
      const uniqueIds = new Set([...ids, ...(assignment.userIds || [])])
      return Array.from(uniqueIds.values())
    }, [])
    .map((userId) => ({
      value: `${userId}`,
      label: taskListDetails?.possibleUsers[userId] ?? '',
    }))

  const assignmentType = assignedLocations.length > 0 ? AssignmentType.Location : AssignmentType.User

  // If we have assigned users, and the assignment has multiple user ids, it means we are sharing the assignment
  const shareAcrossUsers = assignedUsers.length > 0 && (assignments[0]!.userIds?.length ?? 0) > 1

  const assignmentIdsByScheduleIndex: FormValues['assignmentTracker']['originalIdsByScheduleIndex'] = []
  const schedules = assignments
    .filter(({ scheduleIcs }) => scheduleIcs)
    .reduce<string[]>((accum, assignment) => {
      // Remove UID since it will prevent detecing if its the same schedule
      const scheduleIcs = assignment.scheduleIcs.replace(/UID:\S+\r\n/, '')
      const scheduleIndex = accum.indexOf(scheduleIcs)
      const assignmendIds = { id: assignment.id, locationId: assignment.locationId, userIds: assignment.userIds }
      if (scheduleIndex === -1) {
        accum.push(scheduleIcs)
        assignmentIdsByScheduleIndex.push([assignmendIds])
      } else {
        // Keep track of which position, relative to the schedules, this assignment is being used for.
        assignmentIdsByScheduleIndex[scheduleIndex]!.push(assignmendIds)
      }
      return accum
    }, [])
  const icsForm = icsToForm(schedules)

  return {
    name: taskListDetails?.taskList.name ?? '',
    description: taskListDetails?.taskList.description ?? '',
    assignable: taskListDetails?.taskList.assignable ?? true,
    active: taskListDetails?.taskList.active ?? true,
    taskListType: taskListDetails?.taskList.isCorrectiveAction ? TaskListType.CorrectiveAction : TaskListType.TaskList,
    assignmentType,
    assignedLocations,
    assignedRoles,
    assignedUsers,
    shareAcrossUsers,
    overrides: getOverrides(taskListDetails, overrideAssigments),
    timezone: assignments[0]?.timezone ?? '',
    schedule: schedules,
    taskList: taskListDetails?.taskList.document ?? [],
    assignmentTracker: {
      originalAssignmentType: assignmentType,
      originalShareAcrossUsers: shareAcrossUsers,
      originalAssignmentsDates:
        icsForm.tag === 'Single' ? [{ start: icsForm.start, end: icsForm.end, locked: icsForm.locked }] : icsForm.dates,
      originalIdsByScheduleIndex: assignmentIdsByScheduleIndex,
    },
  }
}

export const createBlankCaTaskListFormValues = (): FormValues => {
  const emptyTask = createEmptyTask()
  const blankTaskListFormValues = taskListDetailsResponseToFormValues()

  blankTaskListFormValues.taskListType = TaskListType.CorrectiveAction

  emptyTask.type = TaskType.SELECT
  blankTaskListFormValues.taskList = [emptyTask]

  return blankTaskListFormValues
}
