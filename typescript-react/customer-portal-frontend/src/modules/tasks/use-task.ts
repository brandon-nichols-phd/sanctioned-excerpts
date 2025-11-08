import { useMemo, useCallback, useRef } from 'react'
import useSWR from 'swr'

import useAuthContext from '../../api/authentication/useAuthContext'
import { authFetcher, api } from '../../api/api'
import { API_URL_TASKS_POST_CA, API_URL_TASK_GET, API_URL_TASK_CHECKLIST_POST, API_URL_TASK_POST } from '../../api/constants'
import {
  CreateTaskListDetailsResponse,
  FormValues,
  formValuesToTaskList,
  migrateTaskList,
  TaskList,
  TaskListDetailsResponse,
  taskListDetailsResponseToFormValues,
  createBlankCaTaskListFormValues,
  TaskListType,
  UpdatableTaskListDetails,
  UpdatableTaskList,
  cleanEmptyOptionsFromTasklist,
} from './data/task'

type Loading = {
  isLoading: true
}

export type Create = {
  createTaskListDetailsResponse?: CreateTaskListDetailsResponse
  isLoading: false
  canEditAssignment: boolean
  error: unknown
}

export type Edit = {
  taskListCustomerId: number
  taskListDetails?: TaskListDetailsResponse
  formValues: FormValues
  updateTask: (formValues: FormValues) => Promise<TaskListDetailsResponse>
  isLoading: false
  canEditAssignment: boolean
  error: unknown
}

type Return = Loading | Create | Edit

type Props = {
  taskId?: string
  customerId: number | null
  taskListType: TaskListType | null
}

const _updateTask = async (details: UpdatableTaskList): Promise<TaskListDetailsResponse> => {
  return await api
    .withAuth()
    .url(API_URL_TASK_POST())
    .post(details)
    .json()
    .then(api.zjson)
    .then((resp) => (resp as { data: TaskListDetailsResponse }).data);
}

const _updateCorrectiveAction = async (details: UpdatableTaskList): Promise<TaskList> => {
  return await api
    .withAuth()
    .url(API_URL_TASKS_POST_CA)
    .post(details)
    .json()
    .then(api.zjson)
    .then((resp) => (resp as { data: TaskList }).data);
}

export const useTask = (props: Props): Return => {
  // We switch from create to edit after create, the way we detect it is with the taskId
  // So when we get the new id from the create response update it in a ref to reconfigure the hook
  const taskIdRef = useRef(props.taskId)

  const { authState } = useAuthContext()
  const { data, error, isLoading, mutate } = useSWR<TaskListDetailsResponse | CreateTaskListDetailsResponse>(
    API_URL_TASK_GET(taskIdRef.current),
    authFetcher(authState.accessToken),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const triggerUpdate = useCallback(
    (taskListResponse: UpdatableTaskListDetails, formValues: FormValues) => {
      let update: Promise<TaskListDetailsResponse>
      if (formValues.taskListType === TaskListType.CorrectiveAction) {
        update = _updateCorrectiveAction(formValuesToTaskList(taskListResponse, formValues)).then((response) => {
          // Set the new id we get back
          taskIdRef.current = `${response.id as number}`
          // Simulate the response received from updating a task list
          return { ...(data as TaskListDetailsResponse), taskList: { ...response, assignments: [] } }
        })
      } else {
        update = _updateTask(formValuesToTaskList(taskListResponse, formValues)).then((response) => {
          // Set the new id we get back
          taskIdRef.current = `${response.taskList.id as number}`
          return response
        })
      }
      return mutate(update, {
        revalidate: false,
      })
    },
    [data, mutate]
  )

  // TECH DEBT: Hardcoding these for now until we enable assignments again
  const canEditAssignment = true // [2388, 3209].includes(currentUser.userId)

  return useMemo(() => {
    if (isLoading || !data) {
      return { isLoading: true }
    }

    // New task and no customer and taskListType selected
    if (!taskIdRef.current && !props.customerId && !props.taskListType) {
      const createData = data as CreateTaskListDetailsResponse
      return {
        createTaskListDetailsResponse: createData,
        isLoading,
        error,
        canEditAssignment,
      }
    }

    // New task and customer and taskListType selected
    if (!taskIdRef.current && props.customerId && props.taskListType) {
      const createData = data as CreateTaskListDetailsResponse
      const taskListDetails = createData.find((response) => response.customerId === props.customerId)
      return {
        taskListDetails,
        formValues:
          props.taskListType === TaskListType.CorrectiveAction
            ? createBlankCaTaskListFormValues()
            : taskListDetailsResponseToFormValues(taskListDetails),
        isLoading,
        error,
        canEditAssignment,
        updateTask: (formValues: FormValues) => (taskListDetails ? triggerUpdate(taskListDetails, formValues) : Promise.reject()),
      }
    }

    // Edit task
    const editData = data as TaskListDetailsResponse
    editData.taskList = cleanEmptyOptionsFromTasklist(migrateTaskList(editData.taskList))

    return {
      taskListCustomerId: editData.taskList.customerId,
      taskListDetails: editData,
      formValues: taskListDetailsResponseToFormValues(editData),
      isLoading,
      error,
      canEditAssignment,
      updateTask: (formValues: FormValues) => triggerUpdate(editData, formValues),
    }
  }, [data, props.customerId, props.taskListType, error, isLoading, canEditAssignment, triggerUpdate])
}
