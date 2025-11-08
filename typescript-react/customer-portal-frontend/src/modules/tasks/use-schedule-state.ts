import { useReducer, Reducer, Dispatch } from 'react'
import { RRule } from 'rrule'
import { match, P } from 'ts-pattern'

import { icsToForm, FormValue, SingleFormValue, MultipleFormValue, changeRecurrence } from './data/scheduling'

type Props = {
  schedule: string[] | null
  initialState?: ScheduleState
  defaultName: string
}

export type SingleScheduleState = SingleFormValue
export type MultiplecheduleState = MultipleFormValue
export type ScheduleState = FormValue
export type ScheduleDispatch = Dispatch<Actions>

type Actions =
  | { type: 'setDate'; dateType: 'Start' | 'End'; index?: number; value: Date }
  | { type: 'setLockedDate'; index?: number; value: Date | null }
  | { type: 'setRecurrence'; value: RRule | null }
  | { type: 'setRecurrenceOnly'; value: RRule | null }
  | { type: 'changeRecurrence'; value: RRule | null }
  | { type: 'modifyMultiple'; value: 'add' | 'remove'; index?: number }
  | { type: 'setName'; index?: number; value: string }
  | { type: 'setReminder'; index?: number; value: number | null }
  | { type: 'updateState'; state: ScheduleState }

type Return = [ScheduleState, ScheduleDispatch]

const reducer: Reducer<ScheduleState, Actions> = (state, action) => {
  return match(state)
    .returnType<FormValue>()
    .with({ tag: 'Single' }, (state) => {
      return match(action)
        .returnType<FormValue>()
        .with({ type: 'setDate', dateType: 'Start', value: P.select() }, (value) => ({ ...state, start: value }))
        .with({ type: 'setDate', dateType: 'End', value: P.select() }, (value) => ({ ...state, end: value }))
        .with({ type: 'setLockedDate', value: P.select() }, (value) => ({ ...state, locked: value }))
        .with({ type: 'setRecurrence', value: P.select() }, (value) => ({ ...state, recurrence: value }))
        .with({ type: 'setRecurrenceOnly', value: P.select() }, (value) => ({ ...state, recurrence: value }))
        .with({ type: 'setName', value: P.select() }, (value) => ({ ...state, name: value }))
        .with({ type: 'setReminder', value: P.select() }, (value) => ({ ...state, reminder: value }))
        .with({ type: 'changeRecurrence', value: P.select() }, (value) => changeRecurrence(state, value))
        .with({ type: 'modifyMultiple', value: 'add' }, (action) => {
          const newDates = [
            {
              start: state.start,
              end: state.end,
              locked: state.locked,
            },
            {
              start: new Date(),
              end: new Date(),
              locked: null,
            },
          ]
          const newNames = [state.name, `${state.name} ${action.index}`]
          const newReminders = [state.reminder, null]
          const newExclusionDates = [null, null]

          return {
            tag: 'Multiple',
            dates: newDates,
            recurrence: state.recurrence,
            names: newNames,
            reminders: newReminders,
            exclusionDates: newExclusionDates,
          }
        })
        .with({ type: 'updateState', state: P.select() }, (value) => value)
        .otherwise(() => state)
    })
    .with({ tag: 'Multiple' }, (state) => {
      return match(action)
        .returnType<FormValue>()
        .with({ type: 'setDate', dateType: 'Start', index: P.not(undefined) }, (action) => {
          const newDates = state.dates.concat()
          const date = newDates[action.index] as { start: Date; end: Date; locked: Date | null }
          newDates[action.index] = { ...date, start: action.value ?? date.start }
          return { ...state, dates: newDates }
        })
        .with({ type: 'setDate', dateType: 'End', index: P.not(undefined) }, (action) => {
          const newDates = state.dates.concat()
          const date = newDates[action.index] as { start: Date; end: Date; locked: Date | null }
          newDates[action.index] = { ...date, end: action.value ?? date.end }
          return { ...state, dates: newDates }
        })
        .with({ type: 'setLockedDate', index: P.not(undefined) }, (action) => {
          const newDates = state.dates.concat()
          const date = newDates[action.index] as { start: Date; end: Date; locked: Date | null }
          newDates[action.index] = { ...date, locked: action.value ?? date.locked }
          return { ...state, dates: newDates }
        })
        .with({ type: 'setRecurrence', value: P.select() }, (recurrence, _action) => {
          return {
            tag: 'Single',
            start: state.dates[0]!.start,
            end: state.dates[0]!.end,
            locked: state.dates[0]!.locked,
            recurrence,
            name: state.names[0] ?? '',
            reminder: null,
            exclusionDates: state.exclusionDates[0] ?? null,
          }
        })
        .with({ type: 'setRecurrenceOnly', value: P.select() }, (value) => ({ ...state, recurrence: value }))
        .with({ type: 'changeRecurrence', value: P.select() }, (value) => changeRecurrence(state, value))
        .with({ type: 'modifyMultiple', value: 'remove', index: P.intersection(P.not(undefined), P.select()) },(index, _action) => {
          const newDates = state.dates.concat()
          const newExclusionDates = state.exclusionDates.concat()
          const newNames = state.names.concat()
          const newReminders = state.reminders.concat()

          newDates.splice(index, 1)
          newExclusionDates.splice(index, 1)
          newNames.splice(index, 1)
          newReminders.splice(index, 1)

          if (newDates.length === 1) {
            return {
              tag: 'Single',
              start: newDates[0]!.start,
              end: newDates[0]!.end,
              locked: newDates[0]!.locked,
              recurrence: state.recurrence,
              name: newNames[0] ?? '',
              reminder: null,
              exclusionDates: newExclusionDates[0] ?? null,
            };
          }

          return { ...state, dates: newDates, names: newNames, reminders: newReminders, exclusionDates: newExclusionDates }
        })
        .with({ type: 'modifyMultiple', value: 'add', index: P.intersection(P.not(undefined), P.select()) }, (index) => {
          const newDates = state.dates.concat()
          newDates.push({
            start: new Date(),
            end: new Date(),
            locked: null,
          })

          const newNames = state.names.concat()
          newNames.push(`${state.names[0]} ${index}`)

          const newExclusionDates = state.exclusionDates.concat()
          newExclusionDates.push(null)

          return { ...state, dates: newDates, names: newNames, exclusionDates: newExclusionDates }
        })
        .with(
          { type: 'setName', index: P.intersection(P.not(undefined), P.select('index')), value: P.select('value') },
          ({ index, value }) => {
            const newNames = state.names.concat()
            newNames.splice(index, 1, value)
            return {
              ...state,
              names: newNames,
            }
          }
        )
        .with(
          { type: 'setReminder', index: P.intersection(P.not(undefined), P.select('index')), value: P.select('value') },
          ({ index, value }) => {
            const newReminders = state.reminders.concat()
            newReminders.splice(index, 1, value)
            return {
              ...state,
              reminders: newReminders,
            }
          }
        )
        .with({ type: 'updateState', state: P.select() }, (value) => value)
        .otherwise(() => state)
    })
    .exhaustive()
}

const reducerInit = (value: { ics: string[] | null; initialState: ScheduleState | undefined }): ScheduleState => {
  if (value.initialState) {
    return value.initialState
  }
  return icsToForm(value.ics)
}

export const useScheduleState = (props: Props): Return => {
  const [state, dispatch] = useReducer(reducer, { ics: props.schedule, initialState: props.initialState }, reducerInit)
  return [state, dispatch]
}
