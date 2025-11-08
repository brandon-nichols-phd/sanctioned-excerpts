import { useMemo } from 'react'
import useSWR from 'swr'
import moment, { Moment } from 'moment'
import _ from 'lodash'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher } from '../../api/api'
import {
  API_URL_TASKS_REPORTING_LOCATIONS,
  API_URL_TASKS_REPORTING_ACTIVE_TASKLISTS,
  API_URL_TASKS_REPORTING_ACTIVE_TASKLISTS_DATES,
} from '../../api/constants'
import { Epoch } from './data/task'

export type Return = {
  locations: Array<{ locationId: number; locationName: string }>
  customers: Array<{ customerId: number; customerName: string }>
  taskLists: TaskList[]
  activeDates: Moment[]
}

type Props = {
  locationIds: number[]
  taskListIds: number[]
  customerId: number | null
}

const getDatesQueryParams = (customerId: number, locationIds: number[], taskListIds: number[], taskLists: TaskList[]): string => {
  const queryParams = new URLSearchParams()
  queryParams.append('customerId', customerId.toString())
  queryParams.append('locationIds', locationIds.join(','))

  if (taskListIds.includes(-1)) {
    // This is for the "all" case
    queryParams.append('taskListIds', taskLists.map((taskList) => taskList.id).join(','))
  } else {
    queryParams.append('taskListIds', taskListIds.join(','))
  }

  return queryParams.toString()
}

type Location = {
  locationId: number
  locationName: string
  customerId: number
  customerName: string
}

type TaskList = {
  id: number
  name: string | null
  customerId: number
  locationIds: number[]
}

type ActiveDates = Epoch[]

export const useTaskReportingDropdowns = (props: Props): Return => {
  const { authState } = useAuthContext()
  const { data: locations } = useSWR<Location[]>(`${API_URL_TASKS_REPORTING_LOCATIONS}`, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
  })

  const { data: taskLists } = useSWR<TaskList[]>(`${API_URL_TASKS_REPORTING_ACTIVE_TASKLISTS}`, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
  })

  const datesUrl =
    props.customerId && props.locationIds.length && props.taskListIds.length
      ? `${API_URL_TASKS_REPORTING_ACTIVE_TASKLISTS_DATES}?${getDatesQueryParams(
          props.customerId,
          props.locationIds,
          props.taskListIds,
          taskLists ?? []
        )}`
      : null

  const { data: activeDates } = useSWR<ActiveDates>(datesUrl, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
  })

  return useMemo(
    () => ({
      customers: _.sortBy(
        _.uniqBy(locations ?? [], (item) => item.customerId).map((item) => _.pick(item, ['customerId', 'customerName'])),
        (customer) => customer.customerName
      ),
      locations: _.sortBy(
        locations?.filter(
          (location) =>
            location.customerId === props.customerId && taskLists?.some((taskList) => taskList.locationIds.includes(location.locationId))
        ) ?? [],
        [
          // TECH DEBT: Location `0` will be used accross some report-related endpoints to denote tasklists that are
          // assigned directly to users.
          (location) => location.locationId !== 0,
          (location) => location.locationName,
        ]
      ),
      taskLists: _.sortBy(
        taskLists?.filter(
          (taskList) =>
            props.customerId === taskList.customerId && props.locationIds.some((locationId) => taskList.locationIds.includes(locationId))
        ) ?? [],
        (taskList) => taskList.name
      ),
      activeDates: activeDates?.map((epoch) => moment.utc(epoch.epoch_ms)) ?? [],
    }),
    [locations, taskLists, activeDates, props.customerId, props.locationIds]
  )
}
