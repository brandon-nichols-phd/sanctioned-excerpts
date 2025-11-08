import { EventAttributes, createEvent } from 'ics'
import ical, { VEvent } from 'node-ical'
import { RRule, ByWeekday, Weekday, Frequency, Options } from 'rrule'
import moment, { Moment } from 'moment'
import { match, P } from 'ts-pattern'
import _ from 'lodash'

export const enum Recurrence {
  DAILY,
  WEEKLY_ON_MONDAY,
  FIRST_DAY_OF_MONTH,
  CUSTOM,
}
export const DAYS = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU]

type VAlarm = {
  type: 'VALARM'
  action: 'audio' | 'display' | 'email' | 'procedure'
  description: string
  duration: string
  trigger: string
}

export type ScheduleDates = {
  start: Date
  end: Date
  locked: Date | null
}

export type SingleFormValue = {
  tag: 'Single'
  recurrence: RRule | null
  name: string
  reminder: number | null
  exclusionDates: number[][] | null
} & ScheduleDates

export type MultipleFormValue = {
  tag: 'Multiple'
  dates: ScheduleDates[]
  names: string[]
  reminders: (number | null)[]
  recurrence: RRule | null
  exclusionDates: (number[][] | null)[]
}

export type FormValue = SingleFormValue | MultipleFormValue

export const frequencyToReccurence = (form: FormValue): Recurrence => {
  return match(form)
    .returnType<Recurrence>()
    .with({ recurrence: P.nullish }, () => Recurrence.DAILY)
    .with(
      {
        tag: 'Single',
        recurrence: {
          options: {
            freq: Frequency.DAILY,
          },
        },
      },
      () => Recurrence.DAILY
    )
    .with(
      {
        recurrence: {
          options: {
            byweekday: [0],
          },
        },
      },
      () => Recurrence.WEEKLY_ON_MONDAY
    )
    .with(
      {
        recurrence: {
          options: {
            bymonthday: [1],
          },
        },
      },
      () => Recurrence.FIRST_DAY_OF_MONTH
    )
    .otherwise(() => Recurrence.CUSTOM)
}

export const getNameFromIcs = (ics: string, defaultName: string): string => {
  const { event } = parseEventFromIcs(ics)
  const name = event.summary

  if (name === 'Untitled event' || name == null) {
    return defaultName
  }

  return name
}

const parseTrigger = (triggerStr: string): { hours: number; minutes: number; seconds: number } => {
  const timeTriggerMatch = [...triggerStr.matchAll(/(\d+)([HMS])/g)]

  const trigger = { hours: 0, minutes: 0, seconds: 0 }

  timeTriggerMatch.forEach((match) => {
    const value = parseInt(match[1]!, 10)
    const unit = match[2]

    switch (unit) {
      case 'H':
        trigger.hours = value
        break
      case 'M':
        trigger.minutes = value
        break
      case 'S':
        trigger.seconds = value
        break
      default:
        trigger.minutes = value
        break
    }
  })

  return trigger
}

function constructExclusionDates(exclusionDates?: Record<string, Date>) {
  return exclusionDates
    ? Object.values(exclusionDates).map((exdate) => {
        const exdateAsMoment = moment(exdate)
        return [exdateAsMoment.year(), exdateAsMoment.month() + 1, exdateAsMoment.date()]
      })
    : null
}

function findAlarm(event: VEvent): VAlarm | undefined {
  return Object.values(event).find((value) => typeof value === 'object' && value.type === 'VALARM') as VAlarm | undefined
}
function parseEventFromIcs(ics: string): { event: VEvent; alarm: VAlarm | undefined } {
  const calResponse = ical.sync.parseICS(ics)
  const event = Object.values(calResponse).find((item) => item.type === 'VEVENT') as VEvent | undefined
  if (!event) {throw new Error('ICS data does not contain a VEVENT entry')}
  const alarm = findAlarm(event)

  return { event, alarm }
}

export const modifyICSwithAttrs = (ics: string, attrs: { name: string; reminder: number | null }, timestamp: Moment): string => {
  const { event, alarm } = parseEventFromIcs(ics)
  const timeTrigger = alarm?.trigger ? parseTrigger(alarm.trigger) : { hours: 0, minutes: 0, seconds: 0 }
  // If we don't have any values let's set seconds to 1 so that we keep the alarm since the library
  // removes the alarm if all values are 0
  const seconds = timeTrigger.hours === 0 && timeTrigger.minutes === 0 && timeTrigger.seconds === 0 ? 1 : timeTrigger.seconds
  const endAlarm = {
    hours: timeTrigger.hours,
    minutes: timeTrigger.minutes,
    seconds,
    before: true,
  }
  const startDate = moment(event.start)
  const lockDate = moment(event.end)

  const exclusionDates = constructExclusionDates(event.exdate)

  // Remove dtstart if present
  const rrule = event.rrule ? new RRule(_.omit(fixOrigOptionsForWeekdays(event.rrule.origOptions), 'dtstart')) : null

  const { value } = createEvent({
    timestamp: [timestamp.year(), timestamp.month() + 1, timestamp.date(), timestamp.hours(), timestamp.minute()],
    title: attrs.name,
    description: `${attrs.reminder ?? ''}`,
    startInputType: 'local',
    startOutputType: 'local',
    start: [startDate.year(), startDate.month() + 1, startDate.date(), startDate.hours(), startDate.minute()],
    endInputType: 'local',
    endOutputType: 'local',
    end: [lockDate.year(), lockDate.month() + 1, lockDate.date(), lockDate.hours(), lockDate.minute()],
    recurrenceRule: rrule?.toString().replace('RRULE:', ''),
    alarms: [
      {
        action: 'display',
        trigger: endAlarm,
        duration: { minutes: 15 },
      },
    ],
    // BACKLOG ITEM: The ics library version that we use has the wrong type for this field (it's too narrow). We force them to match to keep the
    // compiler happy. This shoud be fixed on their latest version but we can't upgrade to it just yet (see the comment below).
    ...(exclusionDates ? { exclusionDates: exclusionDates as unknown as string } : {}),
  } as EventAttributes)

  // BACKLOG ITEM: The current version of the ics library has a bug when creating an event with an alarm. Instead of adding the carriage return (`\r`)
  // it escapes the new line character (`\n`); we make the replacement to fix the issue. This bug is fixed on their latest version but we can't use
  // that one right now because it has another bug with a new dependency they add (see https://github.com/adamgibbons/ics/issues/270)
  return value?.replace('\\n', '\r\n') ?? ''
}

export const icsToForm = (icss: string[] | null): FormValue => {
  if (!icss || icss.length === 0) {
    const timeNow = moment()
    return {
      tag: 'Single',
      name: '',
      start: timeNow.toDate(),
      end: timeNow.endOf('day').toDate(),
      locked: null,
      recurrence: null,
      reminder: null,
      exclusionDates: null,
    }
  }

  const schedules = icss.map((ics) => {
    const { event, alarm } = parseEventFromIcs(ics)

    // Remove dtstart if present
    const rrule = event.rrule ? new RRule(_.omit(fixOrigOptionsForWeekdays(event.rrule.origOptions), 'dtstart')) : null
    const timeTrigger = alarm?.trigger ? parseTrigger(alarm.trigger) : { hours: 0, minutes: 0, seconds: 0 }
    const endDiff = moment.duration({
      hours: timeTrigger.hours,
      minutes: timeTrigger.minutes,
      seconds: timeTrigger.seconds,
    })
    const startDate = moment(event.start)
    // The lock date is stored on the "DTEND" part of the ICS.
    const lockDate = moment(event.end)
    // Only subtract from the locked date if the delta is at least a minute. This is to maintain visual consistency
    // since we only show up to the minutes part of the date in the form. This will gives us the end (late) date.
    const endDate = lockDate.clone().subtract(endDiff.asMinutes() >= 1 ? endDiff : 0, 'minutes')
    const reminder = parseInt(event.description, 10)

    const exclusionDates = constructExclusionDates(event.exdate)

    return {
      start: startDate.toDate(),
      end: endDate.toDate(),
      locked: lockDate.toDate(),
      name: event.summary,
      recurrence: rrule,
      reminder: isNaN(reminder) ? null : reminder,
      exclusionDates,
    }
  })

  if (schedules.length === 1) {
    return {
      tag: 'Single',
      start: schedules[0]!.start,
      end: schedules[0]!.end,
      locked: schedules[0]!.locked,
      recurrence: schedules[0]!.recurrence,
      name: schedules[0]!.name,
      reminder: schedules[0]!.reminder,
      exclusionDates: schedules[0]!.exclusionDates,
    }
  }

  return {
    tag: 'Multiple',
    dates: schedules.map((schedule) => ({ start: schedule.start, end: schedule.end, locked: schedule.locked })),
    names: schedules.map((schedule) => schedule.name),
    reminders: schedules.map((schedule) => schedule.reminder),
    recurrence: schedules[0]!.recurrence,
    exclusionDates: schedules.map((schedule) => schedule.exclusionDates),
  }
}

const inferStartDate = (form: SingleFormValue): Moment => {
  const recurrence = form.recurrence ? frequencyToReccurence(form) : Recurrence.DAILY
  const startDate = moment(form.start)

  switch (recurrence) {
    // Currently the "Custom" recurrence is just a wrapper around daily recurrences but with repetitions. Therefore, we
    // let the check fall through to the "Daily" handler.
    case Recurrence.CUSTOM:
    case Recurrence.DAILY:
      if (!form.recurrence) {
        // If the schedule is for a single day then return said day.
        return startDate
      }

      // Generate the recurrence rule with the weekdays normalized and with today as the start date.
      const rruleWithStartDate = new RRule({ ...fixOrigOptionsForWeekdays(form.recurrence.origOptions), dtstart: startDate.toDate() })

      // For a "Daily" recurrence "today" might not part of the chosen days when the list is supposed to be opened so
      // we get the first occurrence for the given rule and use that to set the proper start date.
      let newDate: Date | null = null
      rruleWithStartDate.all((date) => {
        newDate = date
        return false
      })

      // Make sure that the calculated start date has the proper time set.
      const newStartDate = newDate ? mergeDateWithTime(moment(newDate), startDate) : startDate
      return newStartDate
    case Recurrence.WEEKLY_ON_MONDAY:
      // Change the date part of the start date to "Monday" of the current week.
      return startDate.isoWeekday(1)
    case Recurrence.FIRST_DAY_OF_MONTH:
      // Change the date part of the start date to the first of the current month.
      return startDate.date(1)
  }
}

const inferLockedDate = (form: SingleFormValue, startDate: Moment): Moment => {
  const recurrence = form.recurrence ? frequencyToReccurence(form) : Recurrence.DAILY
  const lockDate = moment(form.locked ? form.locked : form.end)

  switch (recurrence) {
    // Currently the "Custom" recurrence is just a wrapper around daily recurrences but with repetitions. Therefore, we
    // let the check fall through to the "Daily" handler.
    case Recurrence.CUSTOM:
    case Recurrence.DAILY:
      // For a "Daily" recurrence the lock date is whatever was set or the same as the end date. Note that if a locked
      // date was set the date part should match the start date and the time part should be at or after the end date.
      return mergeDateWithTime(startDate, lockDate)
    case Recurrence.WEEKLY_ON_MONDAY:
      // For a "Weekly" recurrence we lock the tasklist on Sunday at the end of the day.
      return startDate.clone().isoWeekday(7).endOf('day')
    case Recurrence.FIRST_DAY_OF_MONTH: {
      // For a "Montly" recurrence we lock the tasklist on the last day at the end of the day.
      return startDate.clone().endOf('month')
    }
  }
}

const mergeDateWithTime = (desiredDate: Moment, desiredTime: Moment) => {
  return desiredDate.clone().set({
    hour: desiredTime.hour(),
    minute: desiredTime.minute(),
    second: desiredTime.second(),
    millisecond: desiredTime.millisecond(),
  })
}

const singleFormToIcs = (singleForm: SingleFormValue, timestamp: Moment): string => {
  // Given a recurrence, the start date is the starting date and time for the first ocurrence. This means that the
  // tasklist is considered open from this point in time.
  const startDate = inferStartDate(singleForm)
  // Given a recurrence, the lock date is the final date and time for the first occurence. This means that the tasklist
  // can't be completed and is no longer available until it opens again.
  const lockDate = inferLockedDate(singleForm, startDate)
  // Given a recurrence, the end date is the final date and time for which the first occurence is considered late. This
  // means that a tasklist is considered late from this point in time.
  const endDate = mergeDateWithTime(lockDate, moment(singleForm.end))
  // We need to calculate the difference between the end date and the lock date in order to properly save it as a delta
  // on the ICS.
  const latePeriod = lockDate.diff(endDate, 'minutes')

  // This library doesn't include 0 values when setting alarms. In the backend if we send PT (aka supplying no values)
  // it breaks. With this we are sending a 1s alarm making the library always include it.
  const lockAlarm =
    latePeriod === 0
      ? {
          seconds: 1,
          before: true,
        }
      : {
          minutes: latePeriod,
          before: true,
        }

  const { value } = createEvent({
    timestamp: [timestamp.year(), timestamp.month() + 1, timestamp.date(), timestamp.hours(), timestamp.minute()],
    title: singleForm.name,
    description: `${singleForm.reminder ?? ''}`,
    startInputType: 'local',
    startOutputType: 'local',
    start: [startDate.year(), startDate.month() + 1, startDate.date(), startDate.hours(), startDate.minute()],
    endInputType: 'local',
    endOutputType: 'local',
    // This is not a mistake. We use the "DTEND" part of the ICS to specify the locked date.
    end: [lockDate.year(), lockDate.month() + 1, lockDate.date(), lockDate.hours(), lockDate.minute()],
    recurrenceRule: singleForm.recurrence?.toString().replace('RRULE:', ''),
    alarms: [
      {
        action: 'display',
        // We use a delta to store the end ("late") date.
        trigger: lockAlarm,
        duration: { minutes: 15 },
      },
    ],
    // BACKLOG ITEM: The ics library version that we use has the wrong type for this field (it's too narrow). We force them to match to keep the
    // compiler happy. This shoud be fixed on their latest version but we can't upgrade to it just yet (see the comment below).
    ...(singleForm.exclusionDates ? { exclusionDates: singleForm.exclusionDates as unknown as string } : {}),
  } as EventAttributes)

  // BACKLOG ITEM: The current version of the ics library has a bug when creating an event with an alarm. Instead of adding the carriage return (`\r`)
  // it escapes the new line character (`\n`); we make the replacement to fix the issue. This bug is fixed on their latest version but we can't use
  // that one right now because it has another bug with a new dependency they add (see https://github.com/adamgibbons/ics/issues/270)
  return value?.replace('\\n', '\r\n') ?? ''
}

export const formToIcs = (form: FormValue): string[] => {
  const timeNow = moment()
  return match(form)
    .returnType<string[]>()
    .with({ tag: 'Single' }, (singleForm) => {
      return [singleFormToIcs(singleForm, timeNow)]
    })
    .with({ tag: 'Multiple' }, (multipleForm) => {
      return multipleForm.dates.map((single, index) => {
        return singleFormToIcs(
          {
            ...single,
            tag: 'Single',
            recurrence: multipleForm.recurrence,
            name: multipleForm.names[index]!,
            reminder: multipleForm.reminders[index]!,
            exclusionDates: multipleForm.exclusionDates[index]!,
          },
          timeNow
        )
      })
    })
    .exhaustive()
}

export const getDateTime = (date: Date | null, form: FormValue): string => {
  if (!date) {
    return ''
  }

  if (!form.recurrence) {
    return moment(date).format('h:mm a')
  }

  const recurrence = frequencyToReccurence(form)

  switch (recurrence) {
    case Recurrence.CUSTOM: {
      return moment(date).format('h:mm a')
    }
    case Recurrence.DAILY: {
      return moment(date).format('h:mm a')
    }
    case Recurrence.WEEKLY_ON_MONDAY: {
      return moment(date).format('M/D/YYYY h:mm a')
    }
    case Recurrence.FIRST_DAY_OF_MONTH: {
      return moment(date).format('M/D/YYYY h:mm a')
    }
  }
}

export const reccurenceToText = (form: FormValue): string => {
  if (!form.recurrence) {
    return 'n/a'
  }

  const recurrence = frequencyToReccurence(form)

  switch (recurrence) {
    case Recurrence.CUSTOM: {
      return 'Custom'
    }
    case Recurrence.DAILY: {
      return 'Daily'
    }
    case Recurrence.WEEKLY_ON_MONDAY: {
      return 'Every Week on Monday'
    }
    case Recurrence.FIRST_DAY_OF_MONTH: {
      return 'First Day of the Month'
    }
  }
}

const changeToDateWithSameTime = (target: Date, toDate: Date): Date => {
  const targetDate = moment(target)
  const currentDate = moment(toDate)

  // Apply the time portion from the target date to the current date
  const newDateWithSameTime = mergeDateWithTime(currentDate, targetDate)

  return newDateWithSameTime.toDate()
}

export const changeRecurrence = (form: FormValue, rrule: RRule | null): FormValue => {
  const dateNow = moment()
  return match(form)
    .returnType<FormValue>()
    .with({ tag: 'Multiple' }, (selections, _value) => {
      // If changing recurrence from multiple, just reset back to single.
      return {
        tag: 'Single',
        start: dateNow.toDate(),
        end: dateNow.endOf('day').toDate(),
        locked: null,
        recurrence: rrule,
        name: selections.names[0] ?? '', 
        reminder: selections.reminders[0] ?? null, 
        exclusionDates: selections.exclusionDates[0] ?? null,
      }
    })
    .with({ tag: 'Single' }, (singleForm) => {
      const newRecurrence = frequencyToReccurence({ ...singleForm, recurrence: rrule })
      const canSpecifyLockDate = [Recurrence.DAILY, Recurrence.CUSTOM].includes(newRecurrence)
      const endOfDay = dateNow.clone().endOf('day').toDate()

      // If the new frequency makes this a custom recurrence then make sure we switch to 'Multiple'.
      if (newRecurrence === Recurrence.CUSTOM) {
        return {
          tag: 'Multiple',
          dates: [
            {
              start: changeToDateWithSameTime(singleForm.start, dateNow.toDate()),
              end: changeToDateWithSameTime(singleForm.end, endOfDay),
              locked: canSpecifyLockDate && singleForm.locked ? changeToDateWithSameTime(singleForm.locked, endOfDay) : null,
            },
          ],
          names: [singleForm.name],
          reminders: [singleForm.reminder],
          recurrence: rrule,
          exclusionDates: [singleForm.exclusionDates],
        }
      } else {
        return {
          ...singleForm,
          start: changeToDateWithSameTime(singleForm.start, dateNow.toDate()),
          end: changeToDateWithSameTime(singleForm.end, endOfDay),
          locked: canSpecifyLockDate && singleForm.locked ? changeToDateWithSameTime(singleForm.locked, endOfDay) : null,
          recurrence: rrule,
        }
      }
    })
    .exhaustive()
}

const singleCustomScheduleText = (singleForm: SingleFormValue): string => {
  const recurrence = singleForm.recurrence?.toText() ?? ''
  const formattedRecurrence = recurrence[0]!.toUpperCase() + recurrence.slice(1)
  const startDate = moment(singleForm.start)
  const startTime = startDate.format('h:mm a')
  const endTime = moment(singleForm.end).format('h:mm a')
  const lockTime = singleForm.locked ? moment(singleForm.locked).format('h:mm a') : inferLockedDate(singleForm, startDate)

  return `${formattedRecurrence},  Starts at ${startTime} and Ends at ${endTime}, Lock time is ${lockTime}`
}

export const customScheduleText = (form: FormValue): string => {
  return match(form)
    .returnType<string>()
    .with({ tag: 'Single' }, (singleForm) => {
      return singleCustomScheduleText(singleForm)
    })
    .with({ tag: 'Multiple' }, (multipleForm) => {
      return multipleForm.dates
        .map((singleForm, index) => {
          return singleCustomScheduleText({
            tag: 'Single',
            start: singleForm.start,
            end: singleForm.end,
            locked: singleForm.locked,
            recurrence: multipleForm.recurrence,
            name: multipleForm.names[index]!,
            reminder: multipleForm.reminders[index]!,
            exclusionDates: multipleForm.exclusionDates[index]!,
          })
        })
        .join('\n\n')
    })
    .exhaustive()
}

const keyToDay = {
  0: RRule.MO,
  1: RRule.TU,
  2: RRule.WE,
  3: RRule.TH,
  4: RRule.FR,
  5: RRule.SA,
  6: RRule.SU,
}

export type MonthlyReccurrence = [1 | 2 | 3 | 4 | -1, 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7]

export const getMonthlyRecurrence = (values: MonthlyReccurrence): Partial<Options> => {
  return (
    match(values)
      .returnType<Partial<Options>>()
      // Day
      .with([P._, 7], ([cadence]) => ({
        bymonthday: cadence,
        byweekday: null,
      }))
      .with([P._, P._], ([cadence, day]) => {
        const dayT = day as Exclude<MonthlyReccurrence[1], 7>
        return {
          bymonthday: null,
          byweekday: keyToDay[dayT].nth(cadence),
        }
      })
      .exhaustive()
  )
}

export const updateRecurrence = (originalRRule: RRule | null, options: Partial<Options>): RRule => {
  return new RRule({
    ..._.omit(fixOrigOptionsForWeekdays(originalRRule?.origOptions ?? {}), 'dtstart'),
    ...options,
  })
}

export const recurrencetoMonthly = (rrule: RRule | null): MonthlyReccurrence => {
  return match(rrule)
    .returnType<MonthlyReccurrence>()
    .with(
      {
        origOptions: {
          bymonthday: P.intersection(P.number, P.select()),
          byweekday: P.nullish,
        },
      },
      (monthday) => {
        return [monthday, 7] as MonthlyReccurrence
      }
    )
    .with(
      {
        origOptions: {
          bymonthday: P.nullish,
          byweekday: {
            n: P.select('n'),
            weekday: P.select('weekday'),
          },
        },
      },
      ({ n, weekday }) => {
        return [n ?? -1, weekday] as MonthlyReccurrence
      }
    )
    .otherwise(() => [-1, 0])
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules
const enOrdinalRules = new Intl.PluralRules('en-US', { type: 'ordinal' })

const suffixes = new Map([
  ['one', 'st'],
  ['two', 'nd'],
  ['few', 'rd'],
  ['other', 'th'],
])

export const formatOrdinals = (n: number): string => {
  const rule = enOrdinalRules.select(n)
  const suffix = suffixes.get(rule)
  return `${n}${suffix}`
}

// Needed for correctness field
export const timeToDate = (time: string): Date => {
  return moment(time, 'h:mm a').toDate()
}

export const dateToTime = (date: Date): string => {
  return moment(date).format('h:mm a')
}

export const getStartFromForm = (form: FormValue): Date => {
  return match(form)
    .returnType<Date>()
    .with({ tag: 'Single' }, (singleForm) => {
      return singleForm.start
    })
    .with({ tag: 'Multiple' }, (multipleForm) => {
      return multipleForm.dates[0]!.start
    })
    .exhaustive()
}

function numberToWeekdayString(input: number): Weekday {
  switch (input) {
    case 0:
      return RRule.MO
    case 1:
      return RRule.TU
    case 2:
      return RRule.WE
    case 3:
      return RRule.TH
    case 4:
      return RRule.FR
    case 5:
      return RRule.SA
    case 6:
      return RRule.SU
    default:
      throw `Unknown weekday number ${input}`
  }
}

const fixOrigOptionsForWeekdays = (origOptions: Partial<Options>): Partial<Options> => {
  if (origOptions.byweekday) {
    origOptions.byweekday = normaliseByWeekday(origOptions.byweekday)
  }

  return origOptions
}

const parseICalDuration = (icalDuration?: string | null): moment.Duration | false => {
  if (!icalDuration) {
    return false
  }
  const matches = icalDuration.match(/^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i)

  if (!matches) {
    return false
  }

  const [, , weeks, days, hours, minutes, seconds] = matches

  const duration = moment.duration({
    weeks: weeks ? parseInt(weeks, 10) : 0,
    days: days ? parseInt(days, 10) : 0,
    hours: hours ? parseInt(hours, 10) : 0,
    minutes: minutes ? parseInt(minutes, 10) : 0,
    seconds: seconds ? parseInt(seconds, 10) : 0,
  })

  const durationMs = duration.asMilliseconds()

  if (durationMs === 0) {
    return false
  }

  return moment.duration(Math.abs(durationMs))
}

const normaliseEventDuration = (
  event: VEvent | undefined,
  alarm: VAlarm | undefined
): moment.Duration | false => {
  if (!event) {
    return false
  }

  const eventStart = event.start ? moment(event.start) : null
  const eventEnd = event.end ? moment(event.end) : null

  if (eventStart && eventEnd) {
    const diff = moment.duration(eventEnd.diff(eventStart))

    if (diff.asMilliseconds() > 0) {
      return diff
    }
  }

  const durationField = (event as VEvent & { duration?: unknown }).duration

  if (durationField) {
    if (moment.isDuration(durationField)) {
      const ms = durationField.asMilliseconds()
      if (ms > 0) {
        return moment.duration(ms)
      }
    } else if (typeof durationField === 'object') {
      const coercedDuration = moment.duration(durationField as moment.DurationInputObject)

      if (coercedDuration.asMilliseconds() > 0) {
        return moment.duration(coercedDuration.asMilliseconds())
      }
    }

    if (typeof durationField === 'number' && durationField > 0) {
      return moment.duration(durationField, 'seconds')
    }

    if (typeof durationField === 'string') {
      const parsedDuration = parseICalDuration(durationField)

      if (parsedDuration) {
        return parsedDuration
      }
    }
  }

  const alarmTriggerDuration = alarm?.trigger ? parseICalDuration(alarm.trigger) : false

  if (alarmTriggerDuration) {
    return alarmTriggerDuration
  }
  return false
}

export const validateICS = _.memoize((ics: string): { valid: boolean; message: string } => {
  const calResponse = ical.sync.parseICS(ics)
  const events = Object.values(calResponse).filter((item) => item.type === 'VEVENT') as VEvent[]
  const firstEvent = events[0]
  const alarm = firstEvent ? findAlarm(firstEvent) : undefined
  const rrule = firstEvent!.rrule ? new RRule(_.omit(fixOrigOptionsForWeekdays(firstEvent!.rrule.origOptions))) : null

  let message = 'ok'

  if (!rrule) {
    return { valid: true, message }
  }

  const today = new Date()
  const oneYearFromNow = moment().add(366, 'days').toDate()
  const parsedDuration = normaliseEventDuration(firstEvent, alarm)

  if (!parsedDuration) {
    return { valid: false, message: "Schedule's duration is not set correctly, adjust the times" }
  }
  if (parsedDuration.asMilliseconds() <= 0) {
    return { valid: false, message: "Schedule's duration is not set correctly, adjust the times" }
  }

  const occurrences = rrule.between(today, oneYearFromNow, true)
  const isMonthly = rrule.options.freq === RRule.MONTHLY
  const lockTime = firstEvent?.end ? moment(firstEvent.end) : null

  const endOfOccurrence = (start: Date): moment.Moment => {
    if (isMonthly) {
      const m = moment(start).endOf('month')
      if (lockTime) {
        m.set({
          hour: lockTime.hour(),
          minute: lockTime.minute(),
          second: lockTime.second(),
          millisecond: lockTime.millisecond(),
        })
      }
      return m
    }
    return moment(start).add(parsedDuration)
  }

  let overlaps = false
  let currentStart = occurrences.shift()? moment(occurrences.shift() as Date): null
  const occs = rrule.between(today, oneYearFromNow, true)
  if (occs.length === 0) return { valid: true, message }
  let current = moment(occs[0])

  for (let i = 1; i < occs.length; i++) {
    const currentEnd = endOfOccurrence(current.toDate())
    const nextStart = moment(occs[i])
    if (currentEnd.isAfter(nextStart)) {
      overlaps = true
      message = "Schedule's recurrence overlaps between events"
      break
    }
    current = nextStart
  }

  return { valid: !overlaps, message }
})

// All of the following code taken from https://github.com/jkbrzt/rrule/issues/493#issuecomment-1317136869

const WEEKDAY_STRINGS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const stringToWeekday = (input: typeof WEEKDAY_STRINGS[number]): Weekday => {
  switch (input) {
    case 'MO':
      return RRule.MO
    case 'TU':
      return RRule.TU
    case 'WE':
      return RRule.WE
    case 'TH':
      return RRule.TH
    case 'FR':
      return RRule.FR
    case 'SA':
      return RRule.SA
    case 'SU':
      return RRule.SU
    default:
      throw `Unknown weekday number ${input}`
  }
}

type NormaliseByWeekdayInput =
  | ByWeekday
  | string
  | {
      weekday: number
    }
  | null
  | undefined

const normaliseByWeekdayItem = (input: NormaliseByWeekdayInput): Weekday | undefined => {
  if (input == null) return undefined
  if (typeof input === 'object') {
    return numberToWeekdayString(input.weekday)
  }
  if (typeof input === 'number') {
    return numberToWeekdayString(input)
  }
  if (typeof input === 'string') {
    return stringToWeekday(input)
  }
  return input
}
const isDefined = <T>(value: NonNullable<T> | undefined | null): value is NonNullable<T> => {
  return value !== null && value !== undefined
}

const normaliseByWeekday = (input: NormaliseByWeekdayInput | NormaliseByWeekdayInput[]) => {
  if (Array.isArray(input)) return input.map(normaliseByWeekdayItem).filter(isDefined)
  return normaliseByWeekdayItem(input)
}

// End of copied code
