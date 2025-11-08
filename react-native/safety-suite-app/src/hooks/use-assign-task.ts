import { useMemo, useState, useEffect } from 'react';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { ApiResponse } from '../../api/constants';
import {
  assignTask,
  ASSIGN_TASK_URL,
  AssignPayload,
  getAssignableChecklists,
} from '../../api/tasks';
import {
  AssignableChecklistBackend,
  TaskListBackend,
  fromTaskListBackendToTaskList,
} from '../data/task';
import {
  FormValues,
  FrequencyOptions,
  RecurrenceCadence,
  generateAssignment,
} from '../data/task-scheduling';
import { addChecklist } from '../../store/slices/taskSlice';
import { defaultParams } from '../../api/utils';
import { State } from '../../store/types/store-types';

type Props = {
  checklistId: number | null;
};

type Return = {
  initialValues: AssignFormValues;
  assignableChecklists: AssignableChecklistBackend[];
  submitSave: (form: AssignFormValues) => Promise<ApiResponse<unknown>>;
};

export type AssignFormValues = FormValues;

const updateTask: MutationFetcher<
  ApiResponse<TaskListBackend | Record<string, never>>,
  string,
  AssignPayload
> = async (_url, { arg }) => {
  // TODO we should probably just move over this function here
  return assignTask(arg);
};

export const useAssignTask = (props: Props): Return => {
  const { trigger } = useSWRMutation(ASSIGN_TASK_URL, updateTask);

  const currentUser = useSelector((state: State) => state.user.currUser);
  const contextState = useSelector((state: State) => state.context);
  const dispatch = useDispatch();

  const [assignableChecklists, setAssignableChecklists] = useState<
    AssignableChecklistBackend[]
  >([]);

  useEffect(() => {
    if (contextState.online) {
      const defParams = defaultParams(contextState, currentUser);
      if (defParams) {
        getAssignableChecklists(defParams)
          .then((resp) => {
            if (resp.status === 200 && resp.data) {
              setAssignableChecklists(resp.data);
            }
          })
          .catch((e) => console.error('Error fetching assignable checklists: ', e));
      }
    }
  }, [contextState, currentUser]);

  // assignment name should be: checklist name - who assigned checklist
  const assignerName = currentUser?.name ?? '';
  const checklist = assignableChecklists.find(
    (aChecklist) => aChecklist.id === props.checklistId
  );
  const checklistName = checklist?.name || '';
  const checklistDefaultDuration = checklist?.assignment_default_duration || null;
  const checklistDefaultReimnders = checklist?.assignment_default_reminders || null;
  const assignedNameLocation = checklistName.trim();
  const assignedNameUser = `${checklistName.trim()} - ${assignerName.trim()}`;

  return useMemo(
    () => ({
      initialValues: {
        name: assignedNameLocation,
        description: '',
        selectedAssign: 'Locations',
        usersSelected: currentUser?.id ? [currentUser.id] : [],
        locationSelected: contextState.locationId,
        rolesSelected: [],
        frequency: FrequencyOptions.Once,
        cadence: RecurrenceCadence.DAILY,
        startDate: new Date(),
        endDate: !!checklistDefaultDuration
          ? moment().add(checklistDefaultDuration, 'seconds').toDate()
          : moment().endOf('day').toDate(),
        until: null,
        includeLockedTime: false,
        lockedTime: !!checklistDefaultDuration
          ? moment().add(checklistDefaultDuration, 'seconds').toDate()
          : moment().endOf('day').toDate(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        reminderIntervals:
          checklistDefaultReimnders?.map(
            (reminder) =>
              `${Math.floor(reminder / 3600)}:${Math.floor((reminder % 3600) / 60)
                .toString()
                .padStart(2, '0')}:00`
          ) || null,
        reminderInterval: checklistDefaultReimnders?.[0]
          ? `${Math.floor(checklistDefaultReimnders[0] / 3600)}:${Math.floor(
              (checklistDefaultReimnders[0] % 3600) / 60
            )
              .toString()
              .padStart(2, '0')}:00`
          : null,
        userId: currentUser?.id ?? -1,
        defaultLocationId: contextState.locationId || -1,
        noteId: null,
        type: null,
        department: null,
      },
      assignableChecklists,
      submitSave: async (form) => {
        if (!props.checklistId) {
          return Promise.reject('Requires checklist id');
        }

        const departmentId: number | null =
          form.selectedAssign === 'Locations' ? form.department : null;

        let assignedNameDepartment = '';
        if (departmentId && currentUser) {
          currentUser.locations.some((loc) => {
            const department = loc.departments.find((dep) => dep.id === departmentId);
            if (department) {
              assignedNameDepartment = `${assignedNameLocation} (Department: ${department.name})`;
              return true;
            }
            return false;
          });
        }

        const locationName = assignedNameDepartment
          ? assignedNameDepartment
          : assignedNameLocation;

        const formValues = {
          ...form,
          name: form.selectedAssign === 'Users' ? assignedNameUser : locationName,
          department: departmentId ?? null,
        };

        const required = defaultParams(contextState, currentUser);
        const response = await trigger({
          ...required,
          checklistId: props.checklistId,
          assignment: generateAssignment(formValues),
        });

        if (response.status === 200 && response.data?.assignment != null) {
          const backendTaskList = response.data as TaskListBackend;
          const newTaskLists = await fromTaskListBackendToTaskList([backendTaskList]);
          if (newTaskLists[0]) {
            const newTaskList = newTaskLists[0];
            dispatch(addChecklist({ checklist: newTaskList }));
          }
        }

        return response;
      },
    }),
    [
      contextState,
      props.checklistId,
      currentUser,
      dispatch,
      assignedNameLocation,
      assignedNameUser,
      assignableChecklists,
      trigger,
    ]
  );
};
