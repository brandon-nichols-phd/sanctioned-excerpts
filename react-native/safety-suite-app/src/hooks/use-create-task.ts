import { useMemo } from 'react';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';

import { ApiResponse } from '../../api/constants';
import { createTask, CREATE_TASK, CreateTaskPayload } from '../../api/tasks';
import { TaskListBackend, TaskType, fromTaskListBackendToTaskList } from '../data/task';
import {
  FormValues,
  FrequencyOptions,
  RecurrenceCadence,
  generateTaskList,
} from '../data/task-scheduling';
import { addChecklist } from '../../store/slices/taskSlice';
import { defaultParams } from '../../api/utils';
import { State } from '../../store/types/store-types';

type Props = {
  selectedText: string;
};

type Return = {
  initialValues: CreateFormValues;
  submitSave: (form: CreateFormValues) => Promise<ApiResponse<unknown>>;
};

export type CreateFormValues = FormValues & {
  includeLockedTime: boolean;
};

const updateTask: MutationFetcher<
  ApiResponse<TaskListBackend | Record<string, never>>,
  string,
  CreateTaskPayload
> = async (_url, { arg }) => {
  // TODO we should probably just move over this function here
  return createTask(arg);
};

export const useCreateTask = (props: Props): Return => {
  const { trigger } = useSWRMutation(CREATE_TASK, updateTask);

  const currentUser = useSelector((state: State) => state.user.currUser);
  const contextState = useSelector((state: State) => state.context);
  const selectedNote = useSelector((state: State) => state.notes.selected);

  const dispatch = useDispatch();

  return useMemo(
    () => ({
      initialValues: {
        name: props.selectedText,
        description: '',
        selectedAssign: 'Locations',
        usersSelected: currentUser?.id ? [currentUser.id] : [],
        locationSelected: contextState.locationId,
        rolesSelected: [],
        frequency: FrequencyOptions.Once,
        cadence: RecurrenceCadence.DAILY,
        startDate: new Date(),
        endDate: moment().endOf('day').toDate(),
        until: null,
        includeLockedTime: false,
        lockedTime: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        reminderInterval: null, // this stays until we have n reminders feature set up
        reminderIntervals: null,
        userId: currentUser?.id ?? -1,
        defaultLocationId: contextState.locationId || -1,
        noteId: selectedNote?.id || null,
        type: TaskType.BINARY,
        department: null,
      },
      submitSave: async (form) => {
        const required = defaultParams(contextState, currentUser);
        const taskList = generateTaskList(form);
        const createRes = await trigger({
          ...required,
          ...taskList,
        });

        if (createRes.status === 200 && createRes.data?.assignment != null) {
          const backendTaskList = createRes.data as TaskListBackend;
          const newTaskLists = await fromTaskListBackendToTaskList([backendTaskList]);
          if (newTaskLists[0]) {
            const newTaskList = newTaskLists[0];
            dispatch(addChecklist({ checklist: newTaskList }));
          }
        }

        return createRes;
      },
    }),
    [props.selectedText, contextState, currentUser, dispatch, selectedNote?.id, trigger]
  );
};
