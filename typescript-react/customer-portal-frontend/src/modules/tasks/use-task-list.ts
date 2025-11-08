import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import useSWRMutation, { MutationFetcher } from 'swr/mutation'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { API_URL_TASKS_GET_LIST, API_URL_TASKS_TOGGLE_ACTIVE } from '../../api/constants'

import { mapTaskListToTable, TaskListStatus, TaskListStatusForTable } from './data/task'

type Return = {
  taskListStatusForTable: TaskListStatusForTable[] | undefined
  isLoading: boolean
  error: unknown
  toggleActiveStatus: (taskId: number) => void
}

const updateTaskActive: MutationFetcher<unknown, string, { taskId: number; active: boolean }> = async (url, { arg }) => {
  return await api.withAuth().url(url).post(arg).json().then(api.zjson)
}

export const useTaskList = (): Return => {
  const { authState } = useAuthContext()
  const { data, error, isLoading, mutate } = useSWR<TaskListStatus[]>(API_URL_TASKS_GET_LIST, authFetcher(authState.accessToken), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const { trigger } = useSWRMutation(API_URL_TASKS_TOGGLE_ACTIVE, updateTaskActive)

  const tasks = useMemo(() => {
    return data?.filter((taskList) => taskList.noteId === null).map(mapTaskListToTable)
  }, [data])

  const toggleActiveStatus = useCallback(
    (taskId: number) => {
      const taskIndex = data?.findIndex((t) => t.id === taskId) ?? -1
      if (taskIndex === -1 || !data) {
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Data exists at index per above check
      const task = data[taskIndex]!
      const newTask = { ...task, active: !task.active }
      const newData = [...data]
      newData[taskIndex] = newTask
      mutate(newData, { revalidate: false })
      trigger({ taskId, active: newTask.active })
    },
    [data, mutate, trigger]
  )

  return useMemo(
    () => ({ taskListStatusForTable: tasks, error, isLoading, toggleActiveStatus }),
    [toggleActiveStatus, tasks, error, isLoading]
  )
}
