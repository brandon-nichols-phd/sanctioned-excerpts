import _ from 'lodash'
import moment from 'moment'
import percentRound from 'percent-round'

import { Epoch, TaskCorrectness, TaskType } from './data/task' // Assuming these are correctly defined
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend Day.js with necessary plugins
dayjs.extend(utc)
dayjs.extend(timezone)

// --- Top-level Constants ---
const MS_IN_DAY = 86400000
const DAILY_DATE_FORMAT = '[Y]YYYY[M]MM[D]DD'

// --- Type Definitions (Your existing types are assumed to be here) ---
export type Interval = 'Daily' | 'Monthly' | 'Weekly'

type PerDateEntry = {
  // Renamed from PerDate[string] for clarity
  start: Epoch
  due: Epoch
  lock: Epoch
  firstCompletion: Epoch | null
  lastCompletion: Epoch | null
  avgTimeBetweenTasks: number | null
  completionInterval: number | null
  lateCount: number
  completedCount: number
  missedCount: number
  flaggedCount: number
  onTimeCount: number
  rawResponses: Record<
    string,
    {
      name: string
      hasData: boolean
      correctness: object // Consider more specific type if possible
      flagged: boolean
      userId?: number
      assignedChecklistId?: number
      attachmentsS3Url?: string[]
      completionStatus?: string
      correctiveActionResponse?: object // Consider more specific type
      createdWhen?: Epoch
      documentTaskId?: string
      id?: string
      isLate?: boolean
      notesHtml?: string
      parentDocumentTaskId?: string | null
      response?: string
      temperatureReadingC?: string | null
      triggeredCa?: boolean
      userName?: string
    }
  >
}

type PerDate = Record<string, PerDateEntry>

export type TaskListReportAssignment = {
  name: string | null
  checklistName: string
  timezone: string
  recurrence: string | null
  taskCount: number
  locationId: number | null
  userIds?: number[]
  userNames?: string[]
  locationName: string | null
  perDate: PerDate
}

export type DailyTasklistReport = {
  totalScans: { totalScans: number }
  checklistData: Record<number, TaskListReportAssignment> // Assuming key is number (e.g., assignmentId)
}

export type IndividualTaskListReportTaskResponse = {
  correctness: TaskCorrectness | null
  flagged: boolean
  isLate: boolean
  name: string
  description: string | null
  parentTaskId: string | null
  subtaskCorrectness: TaskCorrectness | null
  assignedChecklistId: number
  attachmentsS3Url: Array<{
    addedWhen: number
    addedby: number
    customerId: number
    file: string
    hash: string
    type: string
    uri: string
    presignedUrl: string
  }> | null
  completionStatus: string
  correctiveActionResponse: string | null
  firstUpdatedWhen: Epoch | null
  lastUpdatedWhen: Epoch | null
  documentTaskId: string
  taskType: TaskType
  id: string
  notesHtml: string
  parentDocumentTaskId: string | null
  response: string | null
  temperatureReadingC: string | null
  triggeredCa: boolean
  userId?: number
  skipped: boolean

  // CLEANUP: The property below should be only for the object type and not the string type. We need to make that
  // change after we transition the backend code to the new way of calculating metrics.
  userName?:
    | {
        first: string
        last: string
      }
    | string

  // CLEANUP: The properties below should be deleted after we transition the backend code to the new way of calculating
  // metrics.
  isSubtask?: boolean
  hasData?: boolean
  createdWhen: Epoch | null
}

export type NumericString = `${number}`
export type Numeric = NumericString | number

export type IndividualTaskListReportAssignmentTiming = {
  name: string
  recurrence: string | null
  start: Epoch
  due: Epoch
  lock: Epoch
  completedCount: number
  lateCount: number
  missedCount: number
  responses: Record<string, IndividualTaskListReportTaskResponse>
}

export type IndividualTaskListReportLocationAssignments = {
  name: string
  timezone: string
  assignments: Record<string, IndividualTaskListReportAssignmentTiming>
}

export type IndividualTaskListReportUserAssignments = {
  namesMap: Record<Numeric, string[]>
  timezonesMap: Record<Numeric, string>
  assignments: Record<string, IndividualTaskListReportAssignmentTiming>
}

export type IndividualTaskListReport = Record<
  Numeric,
  {
    name: string
    locations: Record<Numeric, IndividualTaskListReportLocationAssignments>
    users: IndividualTaskListReportUserAssignments
  }
>
type Dates = [Date | null, Date | null]

// --- Helper Functions (Your existing helpers) ---
const generateDateRange = (startDate: Date | null, endDate: Date | null, rangeType: 'days' | 'weeks') => {
  const start = moment(startDate)
  const end = moment(endDate)
  const diff = end.diff(start, rangeType)
  return Array.from({ length: Math.max(0, diff + 1) }, (_, index) => moment(start).add(index, rangeType)) // Ensure length is non-negative
}

const getAllDays = (dates: Dates): string[] => {
  if (!dates[0] || !dates[1]) return [] // Handle null dates
  return generateDateRange(dates[0], dates[1], 'days').map((date) => date.format(DAILY_DATE_FORMAT))
}

const inferAssignmentRecurrenceFromDateKey = (dateKey: string) => {
  if (dateKey.includes('D')) return 'Daily'
  if (dateKey.includes('W')) return 'Weekly'
  if (dateKey.includes('M')) return 'Monthly'
  if (dateKey.includes('J')) return '-' // Or 'AdHoc'/'Job'
  return 'Unknown'
}

type SplitRecurrenceData = { [key in ReturnType<typeof inferAssignmentRecurrenceFromDateKey>]?: [string, PerDateEntry][] }

const splitDateDataByRecurrence = (assignment: TaskListReportAssignment): SplitRecurrenceData => {
  return Object.entries(assignment.perDate).reduce((accum, [dateKey, perDateEntry]) => {
    const recurrence = inferAssignmentRecurrenceFromDateKey(dateKey)
    if (Object.hasOwn(accum, recurrence)) {
      accum[recurrence]!.push([dateKey, perDateEntry])
    } else {
      accum[recurrence] = [[dateKey, perDateEntry]]
    }
    return accum
  }, {} as SplitRecurrenceData)
}

// --- Stats Calculation Functions (Your existing stats functions) ---
export const getAllDaysFormatted = (interval: Interval, dates: Dates): string[] => {
  if (!dates[0] || !dates[1]) return []
  if (interval === 'Daily') {
    return generateDateRange(dates[0], dates[1], 'days').map((date) => date.format('MM/DD'))
  }
  return generateDateRange(dates[0], dates[1], 'weeks').map((week) => week.startOf('week').format('MM/DD'))
}

type Stats = {
  tasksOnTime: { count: number; percentage: string }
  tasksLate: { count: number; percentage: string }
  tasksMissed: { count: number; percentage: string }
  listsOnTime: number
  listsLate: number
  listsMissed: number
  users: number
}

export const getStats = (report: DailyTasklistReport): Stats => {
  // ... (implementation as you provided, assuming it's correct for your needs)
  const totalTasks = getTotalTasks(report)
  const tasksOnTime = getTotalTasksOnTime(report)
  const tasksLate = getTotalTasksLate(report)
  const tasksMissed = getTotalTasksMissed(report)
  const percentages = totalTasks > 0 ? percentRound([tasksOnTime, tasksLate, tasksMissed]) : [0, 0, 0]

  return {
    tasksOnTime: { count: tasksOnTime, percentage: totalTasks !== 0 ? (percentages[0] ?? 0).toFixed() : '0' },
    tasksLate: { count: tasksLate, percentage: totalTasks !== 0 ? (percentages[1] ?? 0).toFixed() : '0' },
    tasksMissed: { count: tasksMissed, percentage: totalTasks !== 0 ? (percentages[2] ?? 0).toFixed() : '0' },
    listsOnTime: getTotalTaskListsOnTime(report),
    listsLate: getTotalTaskListsLate(report),
    listsMissed: getTotalTaskListsMissed(report),
    users: getTotalOfUsers(report),
  }
}

const getTotalTaskListsOnTime = (report: DailyTasklistReport): number => {
  return Object.values(report.checklistData).reduce<number>((sum, assignment) => {
    const dailyData = splitDateDataByRecurrence(assignment)['Daily']
    const listsSums =
      dailyData?.reduce<number>((daySum, [, dateData]) => {
        return daySum + (dateData.missedCount + dateData.lateCount > 0 ? 0 : 1)
      }, 0) ?? 0
    return sum + listsSums
  }, 0)
}

const getTotalTaskListsLate = (report: DailyTasklistReport): number => {
  return Object.values(report.checklistData).reduce<number>((sum, assignment) => {
    const dailyData = splitDateDataByRecurrence(assignment)['Daily']
    const listsSums =
      dailyData?.reduce<number>((daySum, [, dateData]) => {
        return daySum + (dateData.missedCount > 0 ? 0 : dateData.lateCount > 0 ? 1 : 0)
      }, 0) ?? 0
    return sum + listsSums
  }, 0)
}

const getTotalTaskListsMissed = (report: DailyTasklistReport): number => {
  return Object.values(report.checklistData).reduce<number>((sum, assignment) => {
    const dailyData = splitDateDataByRecurrence(assignment)['Daily']
    const listsSums =
      dailyData?.reduce<number>((daySum, [, dateData]) => {
        return daySum + (dateData.missedCount > 0 ? 1 : 0)
      }, 0) ?? 0
    return sum + listsSums
  }, 0)
}

const getTotalOfUsers = (report: DailyTasklistReport): number => {
  const userIds = new Set<number>()
  Object.values(report.checklistData).forEach((assignment) => {
    Object.values(assignment.perDate).forEach((perDateEntry) => {
      Object.values(perDateEntry.rawResponses).forEach((resp) => {
        if (resp.userId != null) {
          // Check for not null and not undefined
          userIds.add(resp.userId)
        }
      })
    })
  })
  return userIds.size
}

const getTotalTasks = (report: DailyTasklistReport): number => {
  return Object.values(report.checklistData).reduce<number>((sum, assignment) => {
    const dailyData = splitDateDataByRecurrence(assignment)['Daily']
    const taskSum =
      dailyData?.reduce<number>(
        (newSum, [, dateValues]) => newSum + dateValues.onTimeCount + dateValues.lateCount + dateValues.missedCount,
        0
      ) ?? 0
    return sum + taskSum
  }, 0)
}

const getTotalTasksOnTime = (report: DailyTasklistReport): number => {
  return Object.values(report.checklistData).reduce<number>((sum, assignment) => {
    const dailyData = splitDateDataByRecurrence(assignment)['Daily']
    const onTimeSum = dailyData?.reduce<number>((newSum, [, dateValues]) => newSum + dateValues.onTimeCount, 0) ?? 0
    return sum + onTimeSum
  }, 0)
}

const getTotalTasksMissed = (report: DailyTasklistReport): number => {
  return Object.values(report.checklistData).reduce<number>((sum, assignment) => {
    const dailyData = splitDateDataByRecurrence(assignment)['Daily']
    const missedSum = dailyData?.reduce<number>((newSum, [, dateValues]) => newSum + dateValues.missedCount, 0) ?? 0
    return sum + missedSum
  }, 0)
}

const getTotalTasksLate = (report: DailyTasklistReport): number => {
  return Object.values(report.checklistData).reduce<number>((sum, assignment) => {
    const dailyData = splitDateDataByRecurrence(assignment)['Daily']
    const lateSum = dailyData?.reduce<number>((newSum, [, dateValues]) => newSum + dateValues.lateCount, 0) ?? 0
    return sum + lateSum
  }, 0)
}

// --- Row Generation Helper Functions ---
const getDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || !isFinite(totalSeconds) || totalSeconds < 0) {
    return '' // Or 'N/A', or handle as an error
  }
  if (totalSeconds === 0) {
    return '0m' // Or handle as desired, e.g., '' or '0s'
  }

  const duration = moment.duration(totalSeconds, 'seconds')
  const days = Math.floor(duration.asDays())
  const hours = duration.hours() // Hours component (0-23) after removing full days
  const minutes = duration.minutes() // Minutes component (0-59) after removing full hours
  const seconds = duration.seconds() // Seconds component (0-59)

  let parts: string[] = []

  if (days > 0) {
    parts.push(`${days}d`)
    if (hours > 0) {
      // Only show hours if there are any, even if days are present
      parts.push(`${hours}h`)
    } else if (days > 0 && parts.length === 1) {
      // If only days > 0 and no hours, show 0h for clarity e.g. "1d 0h"
      // parts.push(`0h`); // Optional: to make "1d" appear as "1d 0h".
      // If you prefer "1d", then remove this else if.
    }
  } else if (hours > 0) {
    // Less than a day, but at least 1 hour
    parts.push(`${hours}h`)
    if (minutes > 0) {
      // Only show minutes if there are any
      parts.push(`${minutes}m`)
    } else if (hours > 0 && parts.length === 1) {
      // If only hours > 0 and no minutes, show 0m
      // parts.push(`0m`); // Optional: to make "1h" appear as "1h 0m".
      // If you prefer "1h", then remove this else if.
    }
  } else if (minutes > 0) {
    // Less than an hour, but at least 1 minute
    parts.push(`${minutes}m`)
  } else if (seconds > 0) {
    // Less than a minute
    parts.push(`${seconds}s`)
  } else {
    return '0s' // Or handle extremely small positive durations as needed, e.g. round up to 1s
  }

  // If for some reason parts is empty (e.g. very small fraction of a second rounding to 0 for all components)
  if (parts.length === 0 && totalSeconds > 0) {
    return `<1s` // Or handle as desired
  }
  if (parts.length === 0 && totalSeconds === 0) {
    return '0s'
  }

  return parts.join(' ')
}

export const sortByName = <T extends { name?: string | null }>(a: T, b: T): number => {
  const nameA = a.name ?? ''
  const nameB = b.name ?? ''
  if (nameA === nameB) return 0
  return nameA < nameB ? -1 : 1
}

// --- Updated Row Data Types for React Keys ---
type ReportColumnItem = {
  key: string
  displayDate: string
  percentage: string
  isOnTime: boolean
}

type DailyRow = {
  name: string
  recurrence: string
  assignedTo: string
  completionInterval: string
  totalTasks: string
  column: Array<ReportColumnItem>
}

// --- Main Row Generation Functions ---
export const getDailyTaskListRows = (report: DailyTasklistReport, interval: Interval, dates: Dates): DailyRow[] => {
  const tastkListRows = Object.values(report.checklistData).reduce((accum, assignment) => {
    const allDailyAssignmentsForTask = splitDateDataByRecurrence(assignment)['Daily'] ?? []

    if (allDailyAssignmentsForTask.length > 0) {
      const reportDateKeys = getAllDays(dates)
      const relevantCompletionsData = allDailyAssignmentsForTask
        .filter(
          ([dateKey, data]) =>
            reportDateKeys.includes(dateKey) &&
            data?.completedCount > 0 &&
            data.firstCompletion?.epoch_ms != null &&
            data.lastCompletion?.epoch_ms != null &&
            data.start?.epoch_ms != null
        )
        .map(([, data]) => data)

      let averageStartsEpochMs: number | null = null
      let averageEndsEpochMs: number | null = null
      let averageCompletionIntervalSeconds: number | null = null
      let completionTimingStr: string = 'N/A'
      let avgIntervalDurationStr: string = ''

      if (relevantCompletionsData.length > 0) {
        const baseReferenceStartEpoch = relevantCompletionsData[0]!.start.epoch_ms

        const sumOfStartTimeOffsetsMs = relevantCompletionsData.reduce<number>((sum, data) => {
          const offset = data.firstCompletion!.epoch_ms - baseReferenceStartEpoch
          let timeOfDayOffsetMs = offset % MS_IN_DAY
          if (timeOfDayOffsetMs < 0) timeOfDayOffsetMs += MS_IN_DAY
          return sum + timeOfDayOffsetMs
        }, 0)
        averageStartsEpochMs = baseReferenceStartEpoch + sumOfStartTimeOffsetsMs / relevantCompletionsData.length

        const sumOfEndTimeOffsetsMs = relevantCompletionsData.reduce<number>((sum, data) => {
          const offset = data.lastCompletion!.epoch_ms - baseReferenceStartEpoch
          let timeOfDayOffsetMs = offset % MS_IN_DAY
          if (timeOfDayOffsetMs < 0) timeOfDayOffsetMs += MS_IN_DAY
          return sum + timeOfDayOffsetMs
        }, 0)
        averageEndsEpochMs = baseReferenceStartEpoch + sumOfEndTimeOffsetsMs / relevantCompletionsData.length

        if (averageStartsEpochMs != null && averageEndsEpochMs != null && !isNaN(averageStartsEpochMs) && !isNaN(averageEndsEpochMs)) {
          completionTimingStr = `${dayjs(averageStartsEpochMs).tz(assignment.timezone).format('h:mm a')} - ${dayjs(averageEndsEpochMs)
            .tz(assignment.timezone)
            .format('h:mm a')}`
        }

        const totalCompletionInterval = relevantCompletionsData.reduce<number>((sum, data) => sum + (data.completionInterval ?? 0), 0)
        if (relevantCompletionsData.length > 0) {
          averageCompletionIntervalSeconds = totalCompletionInterval / relevantCompletionsData.length
        }
        if (
          averageCompletionIntervalSeconds != null &&
          averageCompletionIntervalSeconds > 0 &&
          isFinite(averageCompletionIntervalSeconds)
        ) {
          avgIntervalDurationStr = getDuration(averageCompletionIntervalSeconds)
        }
      }

      const finalCompletionIntervalStr =
        completionTimingStr !== 'N/A' ? `${completionTimingStr}${avgIntervalDurationStr ? ` \n ${avgIntervalDurationStr}` : ''}` : 'N/A'

      const taskListBaseRow = {
        name: assignment.name ?? assignment.checklistName,
        assignedTo: assignment.userNames?.length ? assignment.userNames.join(', ') : assignment.locationName ?? 'Unknown',
        recurrence: 'Daily',
        completionInterval: finalCompletionIntervalStr,
        totalTasks: String(assignment.taskCount),
      }

      if (interval === 'Daily') {
        accum.push({
          ...taskListBaseRow,
          column: reportDateKeys.map((dayKey) => {
            const dateDataEntry = allDailyAssignmentsForTask.find(([key]) => key === dayKey)?.[1]
            const displayDate = dayjs(dayKey, DAILY_DATE_FORMAT).format('MM/DD')
            if (dateDataEntry) {
              const totalForPercentage = dateDataEntry.completedCount + dateDataEntry.missedCount
              return {
                key: dayKey,
                displayDate: displayDate,
                percentage: totalForPercentage > 0 ? `${Math.floor((dateDataEntry.completedCount / totalForPercentage) * 100)}%` : '0%',
                isOnTime: dateDataEntry.missedCount === 0 && dateDataEntry.lateCount === 0,
              }
            }
            return { key: dayKey, displayDate: displayDate, percentage: '-', isOnTime: false }
          }),
        })
      } else {
        // Weekly aggregation
        const reportWeeks = generateDateRange(dates[0], dates[1], 'weeks').map((mWeek) => ({
          year: mWeek.year(),
          isoWeekNum: mWeek.isoWeek(),
          key: `${mWeek.year()}-W${mWeek.isoWeek().toString().padStart(2, '0')}`,
          displayDate: mWeek.startOf('week').format('MM/DD'),
        }))

        accum.push({
          ...taskListBaseRow,
          column: reportWeeks.map((weekInfo) => {
            const daysInThisWeekData = allDailyAssignmentsForTask
              .filter(([dateKey]) => {
                const mDate = moment(dateKey, DAILY_DATE_FORMAT)
                return mDate.year() === weekInfo.year && mDate.isoWeek() === weekInfo.isoWeekNum
              })
              .map(([, data]) => data)

            if (daysInThisWeekData.length === 0) {
              return { key: weekInfo.key, displayDate: weekInfo.displayDate, percentage: '-', isOnTime: true }
            }

            const completedInWeek = daysInThisWeekData.reduce((sum, data) => sum + data.completedCount, 0)
            const missedInWeek = daysInThisWeekData.reduce((sum, data) => sum + data.missedCount, 0)
            const lateInWeek = daysInThisWeekData.reduce((sum, data) => sum + data.lateCount, 0)
            const totalRelevantInWeek = completedInWeek + missedInWeek

            return {
              key: weekInfo.key,
              displayDate: weekInfo.displayDate,
              percentage: totalRelevantInWeek > 0 ? `${Math.floor((completedInWeek / totalRelevantInWeek) * 100)}%` : '0%',
              isOnTime: lateInWeek === 0 && missedInWeek === 0,
            }
          }),
        })
      }
    }
    return accum
  }, [] as DailyRow[])

  return tastkListRows.sort(sortByName)
}

type OtherRow = {
  name: string
  recurrence: string
  start: string
  due: string
  assignedTo: string
  completionInterval: string
  totalTasks: string
  onTime: string
  late: string
  missed: string
  incorrect: string
}

export const getOtherTaskListRows = (report: DailyTasklistReport, dates: Dates): OtherRow[] => {
  const tastkListRows = Object.values(report.checklistData).reduce((accum, assignment) => {
    const datesDataByRecurrence = Object.entries(splitDateDataByRecurrence(assignment)).filter(
      ([recurrenceName]) => recurrenceName !== 'Daily'
    )

    const reportStartMoment = dates[0] ? moment(dates[0]).startOf('day') : null
    const reportEndMoment = dates[1] ? moment(dates[1]).endOf('day') : null

    datesDataByRecurrence.forEach(([recurrence, allPeriodsForRecurrence]) => {
      if (!allPeriodsForRecurrence) return // Should not happen if filter worked but good practice

      const filteredPeriodsInInterval = allPeriodsForRecurrence.filter(([, periodData]) => {
        if (!periodData.start?.epoch_ms) return false
        const periodStartMoment = moment(periodData.start.epoch_ms)
        const periodDueMoment = moment(periodData.due.epoch_ms)
        const startsBeforeReportEnds = reportEndMoment ? periodStartMoment.isSameOrBefore(reportEndMoment) : true
        const endsAfterReportStarts = reportStartMoment ? periodDueMoment.isSameOrAfter(reportStartMoment) : true
        return startsBeforeReportEnds && endsAfterReportStarts
      })

      if (filteredPeriodsInInterval.length === 0) return

      const stats = filteredPeriodsInInterval.reduce(
        (acc, [, periodData]) => {
          acc.onTimeCount += periodData.onTimeCount
          acc.lateCount += periodData.lateCount
          acc.missedCount += periodData.missedCount
          acc.flaggedCount += periodData.flaggedCount
          acc.relevantTasksCount += periodData.completedCount + periodData.missedCount
          return acc
        },
        { onTimeCount: 0, lateCount: 0, missedCount: 0, flaggedCount: 0, relevantTasksCount: 0 }
      )

      const firstPeriodInInterval = filteredPeriodsInInterval[0]?.[1]
      if (!firstPeriodInInterval?.start?.epoch_ms) return

      const validCompletionEntries = filteredPeriodsInInterval
        .map(([, data]) => data)
        .filter(
          (data) =>
            data.completedCount > 0 &&
            data.firstCompletion?.epoch_ms != null &&
            data.lastCompletion?.epoch_ms != null &&
            data.start?.epoch_ms != null
        )

      let averageStartsEpochMs: number | null = null
      let averageEndsEpochMs: number | null = null
      let averageCompletionIntervalSeconds: number | null = null
      let completionTimingStr: string = 'N/A'
      let avgIntervalDurationStr: string = ''

      if (validCompletionEntries.length > 0) {
        const baseReferenceStartEpoch = firstPeriodInInterval.start.epoch_ms

        const sumOfStartTimeOffsetsMs = validCompletionEntries.reduce<number>((sum, data) => {
          const offset = data.firstCompletion!.epoch_ms - baseReferenceStartEpoch
          let timeOfDayOffsetMs = offset % MS_IN_DAY
          if (timeOfDayOffsetMs < 0) timeOfDayOffsetMs += MS_IN_DAY
          return sum + timeOfDayOffsetMs
        }, 0)
        averageStartsEpochMs = baseReferenceStartEpoch + sumOfStartTimeOffsetsMs / validCompletionEntries.length

        const sumOfEndTimeOffsetsMs = validCompletionEntries.reduce<number>((sum, data) => {
          const offset = data.lastCompletion!.epoch_ms - baseReferenceStartEpoch
          let timeOfDayOffsetMs = offset % MS_IN_DAY
          if (timeOfDayOffsetMs < 0) timeOfDayOffsetMs += MS_IN_DAY
          return sum + timeOfDayOffsetMs
        }, 0)
        averageEndsEpochMs = baseReferenceStartEpoch + sumOfEndTimeOffsetsMs / validCompletionEntries.length

        if (averageStartsEpochMs != null && averageEndsEpochMs != null && !isNaN(averageStartsEpochMs) && !isNaN(averageEndsEpochMs)) {
          completionTimingStr = `${dayjs(averageStartsEpochMs).tz(assignment.timezone).format('h:mm a')} - ${dayjs(averageEndsEpochMs)
            .tz(assignment.timezone)
            .format('h:mm a')}`
        }

        const totalCompletionInterval = validCompletionEntries.reduce<number>((sum, data) => sum + (data.completionInterval ?? 0), 0)
        if (validCompletionEntries.length > 0) {
          averageCompletionIntervalSeconds = totalCompletionInterval / validCompletionEntries.length
        }
        if (
          averageCompletionIntervalSeconds != null &&
          averageCompletionIntervalSeconds > 0 &&
          isFinite(averageCompletionIntervalSeconds)
        ) {
          avgIntervalDurationStr = getDuration(averageCompletionIntervalSeconds)
        }
      }

      const finalCompletionIntervalStr =
        completionTimingStr !== 'N/A' ? `${completionTimingStr}${avgIntervalDurationStr ? ` \n ${avgIntervalDurationStr}` : ''}` : 'N/A'

      let displayStart: string
      let displayDue: string
      const MAX_ITEMS_TO_LIST = 5 // Define how many items to list before switching to "Multiple"

      if (filteredPeriodsInInterval.length > MAX_ITEMS_TO_LIST) {
        displayStart = 'Multiple'
        displayDue = 'Multiple'
      } else if (filteredPeriodsInInterval.length > 1) {
        // Map over each period to get its start time string
        const startTimes = filteredPeriodsInInterval.map(([, periodData]) => {
          return periodData.start?.epoch_ms ? dayjs(periodData.start.epoch_ms).tz(assignment.timezone).format('M/D h:mma') : 'N/A' // Or some other placeholder if a specific start is missing
        })
        displayStart = startTimes.join('; ') // Join with semicolon and space, or just comma, or newline

        // Map over each period to get its due time string
        const dueTimes = filteredPeriodsInInterval.map(([, periodData]) => {
          return periodData.due?.epoch_ms ? dayjs(periodData.due.epoch_ms).tz(assignment.timezone).format('M/D h:mma') : 'N/A' // Or some other placeholder
        })
        displayDue = dueTimes.join('; ')
      } else if (filteredPeriodsInInterval.length === 1 && firstPeriodInInterval) {
        // There's exactly one period in the filtered set
        displayStart = firstPeriodInInterval.start?.epoch_ms
          ? dayjs(firstPeriodInInterval.start.epoch_ms).tz(assignment.timezone).format('M/D h:mma')
          : '-'
        displayDue = firstPeriodInInterval.due?.epoch_ms
          ? dayjs(firstPeriodInInterval.due.epoch_ms).tz(assignment.timezone).format('M/D h:mma')
          : '-'
      } else {
        // No periods or firstPeriodInInterval is not defined
        displayStart = '-'
        displayDue = '-'
      }

      accum.push({
        name: assignment.name ?? assignment.checklistName,
        recurrence: recurrence,
        assignedTo: assignment.userNames?.length ? assignment.userNames.join(', ') : assignment.locationName ?? 'Unknown',
        completionInterval: finalCompletionIntervalStr,
        totalTasks: String(assignment.taskCount),
        start: displayStart,
        due: displayDue,
        onTime: stats.relevantTasksCount > 0 ? `${Math.floor((stats.onTimeCount / stats.relevantTasksCount) * 100)}%` : '0%',
        late: stats.relevantTasksCount > 0 ? `${Math.floor((stats.lateCount / stats.relevantTasksCount) * 100)}%` : '0%',
        missed: stats.relevantTasksCount > 0 ? `${Math.floor((stats.missedCount / stats.relevantTasksCount) * 100)}%` : '0%',
        incorrect:
          stats.relevantTasksCount > 0
            ? `${Math.floor((stats.flaggedCount / stats.relevantTasksCount) * 100)}%` + ` (${stats.flaggedCount})`
            : '0% (0)',
      })
    })
    return accum
  }, [] as OtherRow[])

  return tastkListRows.sort(sortByName)
}

type LocationRow = {
  name: string
  onTime: string
  late: string
  missed: string
  incorrect: string
  column: Array<ReportColumnItem>
}

// Helper for sortLocationReportTasklistByName
export const sortLocationReportTasklistByName = (a: LocationRow, b: LocationRow): number => {
  const nameA = a.name ?? ''
  const nameB = b.name ?? ''
  if (nameA === nameB) return 0
  return nameA < nameB ? -1 : 1
}

export const getLocationTaskListRows = (report: DailyTasklistReport, interval: Interval, intervalDates: Dates): LocationRow[] => {
  const reportDateKeys = getAllDays(intervalDates)
  const groupedByLocation = _.groupBy(report.checklistData, (assignment) => assignment.locationId ?? 'userAssignments') // Handle null locationId for user assignments

  const locationRows = Object.values(groupedByLocation).flatMap((checklistsInLocation) => {
    if (checklistsInLocation.length === 0) return [] // Should not happen with _.groupBy but good check

    const firstChecklist = checklistsInLocation[0]!
    const locationName = firstChecklist.userIds?.length ? 'User Assignments' : firstChecklist.locationName ?? 'Unknown Location'

    const dailyAggregatedStats = reportDateKeys.reduce<
      Record<
        string,
        {
          onTime: number
          completed: number
          late: number
          missed: number
          incorrect: number
          totalRelevant: number
        }
      >
    >((acc, dayKey) => {
      const statsForDay = { onTime: 0, completed: 0, late: 0, missed: 0, incorrect: 0, totalRelevant: 0 }
      checklistsInLocation.forEach((assignment) => {
        const dailyData = splitDateDataByRecurrence(assignment)['Daily']?.find(([dKey]) => dKey === dayKey)?.[1]
        if (dailyData) {
          statsForDay.onTime += dailyData.onTimeCount
          statsForDay.completed += dailyData.completedCount
          statsForDay.late += dailyData.lateCount
          statsForDay.missed += dailyData.missedCount
          statsForDay.incorrect += dailyData.flaggedCount
          statsForDay.totalRelevant += dailyData.completedCount + dailyData.missedCount
        }
      })
      if (Object.values(statsForDay).some((val) => val > 0) || reportDateKeys.includes(dayKey)) {
        // Ensure all report days are considered for columns
        acc[dayKey] = statsForDay // Store even if empty, to generate a column with '-'
      }
      return acc
    }, {})

    const allDaysWithStats = Object.values(dailyAggregatedStats)
    const overallTotalRelevant = allDaysWithStats.reduce((sum, day) => sum + day.totalRelevant, 0)
    const overallOnTime = allDaysWithStats.reduce((sum, day) => sum + day.onTime, 0)
    const overallLate = allDaysWithStats.reduce((sum, day) => sum + day.late, 0)
    const overallMissed = allDaysWithStats.reduce((sum, day) => sum + day.missed, 0)
    const overallIncorrect = allDaysWithStats.reduce((sum, day) => sum + day.incorrect, 0)

    const overallSummaryStats = {
      onTime: overallTotalRelevant > 0 ? `${Math.floor((overallOnTime / overallTotalRelevant) * 100)}%` : '0%',
      late: overallTotalRelevant > 0 ? `${Math.floor((overallLate / overallTotalRelevant) * 100)}%` : '0%',
      missed: overallTotalRelevant > 0 ? `${Math.floor((overallMissed / overallTotalRelevant) * 100)}%` : '0%',
      incorrect:
        overallTotalRelevant > 0 ? `${Math.floor((overallIncorrect / overallTotalRelevant) * 100)}%` + ` (${overallIncorrect})` : '0% (0)',
    }

    if (interval === 'Daily') {
      return [
        {
          name: locationName,
          ...overallSummaryStats,
          column: reportDateKeys.map((dayKey) => {
            const dayData = dailyAggregatedStats[dayKey]
            const displayDate = dayjs(dayKey, DAILY_DATE_FORMAT).format('MM/DD')
            if (dayData && (dayData.totalRelevant > 0 || dayData.late > 0 || dayData.missed > 0)) {
              // Check if there's actual data to display beyond just being an empty day
              return {
                key: dayKey,
                displayDate: displayDate,
                percentage: dayData.totalRelevant > 0 ? `${Math.floor((dayData.completed / dayData.totalRelevant) * 100)}%` : '0%',
                isOnTime: dayData.late === 0 && dayData.missed === 0,
              }
            }
            return { key: dayKey, displayDate: displayDate, percentage: '-', isOnTime: false }
          }),
        },
      ]
    } else {
      // Weekly aggregation
      const reportWeeks = generateDateRange(intervalDates[0], intervalDates[1], 'weeks').map((mWeek) => ({
        year: mWeek.year(),
        isoWeekNum: mWeek.isoWeek(),
        key: `${mWeek.year()}-W${mWeek.isoWeek().toString().padStart(2, '0')}`,
        displayDate: mWeek.startOf('week').format('MM/DD'),
      }))

      return [
        {
          name: locationName,
          ...overallSummaryStats,
          column: reportWeeks.map((weekInfo) => {
            const daysInThisWeekStats = Object.entries(dailyAggregatedStats)
              .filter(([dayKey]) => {
                const mDate = moment(dayKey, DAILY_DATE_FORMAT)
                return mDate.year() === weekInfo.year && mDate.isoWeek() === weekInfo.isoWeekNum
              })
              .map(([, stats]) => stats)

            if (
              daysInThisWeekStats.length === 0 ||
              daysInThisWeekStats.every((d) => d.totalRelevant === 0 && d.late === 0 && d.missed === 0)
            ) {
              return { key: weekInfo.key, displayDate: weekInfo.displayDate, percentage: '-', isOnTime: true }
            }

            const weekCompleted = daysInThisWeekStats.reduce((sum, day) => sum + day.completed, 0)
            const weekLate = daysInThisWeekStats.reduce((sum, day) => sum + day.late, 0)
            const weekMissed = daysInThisWeekStats.reduce((sum, day) => sum + day.missed, 0)
            const weekTotalRelevant = daysInThisWeekStats.reduce((sum, day) => sum + day.totalRelevant, 0)

            return {
              key: weekInfo.key,
              displayDate: weekInfo.displayDate,
              percentage: weekTotalRelevant > 0 ? `${Math.floor((weekCompleted / weekTotalRelevant) * 100)}%` : '0%',
              isOnTime: weekLate === 0 && weekMissed === 0,
            }
          }),
        },
      ]
    }
  })
  return locationRows.sort(sortLocationReportTasklistByName) // Apply sort after flatMap
}
