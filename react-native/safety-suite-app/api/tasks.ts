import {
  Task,
  TaskType,
  AssignableChecklistBackend,
  TaskListBackend,
  S3Attachment,
} from '../src/data/task';
import {
  ApiResponse,
  BASE_URL_POWER_APP,
  CREATE,
  JWT,
  TASKS_BASE_URL,
  ApiParams,
  UPDATE_TASK,
} from './constants';
import { API_RESP_JSON, DefaultAPIParams, getApiResponse, getWrapper } from './utils';

const ASSIGN = 'assign';
const ASSIGN_LIST = 'list-assignable';
export const ASSIGN_TASK_URL = `${BASE_URL_POWER_APP}/${TASKS_BASE_URL}/${ASSIGN}`;
export const ASSIGNABLE_CHECKLISTS = (params?: ApiParams) => {
  if (params != null) {
    return `${BASE_URL_POWER_APP}/${TASKS_BASE_URL}/${ASSIGN_LIST}${getWrapper(params)}`;
  }
  return `${BASE_URL_POWER_APP}/${TASKS_BASE_URL}/${ASSIGN_LIST}`;
};

export const CREATE_TASK = `${BASE_URL_POWER_APP}/${TASKS_BASE_URL}/${CREATE}`;

// gets most recent sensor data tied to task
const SENSOR_DATA = 'sensor-data';
export type SensorUrlParams = { assignedId: number; taskId: string };
export const SENSOR_URL = (params: ApiParams, taskParams: SensorUrlParams) =>
  `${BASE_URL_POWER_APP}/${TASKS_BASE_URL}/${SENSOR_DATA}${getWrapper(
    params
  )}&assignedChecklistId=${taskParams.assignedId}&taskId=${taskParams.taskId}`;

type TaskUpdatePayload = {
  id: string;
  assignedChecklistId: number;
  assignedChecklistSnapshotId: number;
  documentTaskId: string;
  lastModified: number;
  lastModifiedBy: number;
  temperatureReadingC: number | string | null;
  notesHtml: string;
  completed: boolean;
  attachmentsS3Url: S3Attachment[];
  response: string | string[];
  flagged: boolean;
  correctiveActionResponse: string | null;
  parentDocumentTaskId: string | null;
  skipped: boolean;
};
// TODO set correct parentDocumentTaskId
const mapTaskForUpdate = (task: Task, userId: number): TaskUpdatePayload => {
  const isPictureCompleted =
    task.type === TaskType.PICTURE && task.attachments.length > 0;
  const completed =
    task.completed ||
    task.taskResponse.length > 0 ||
    (task.temperature?.length ?? 0) > 0 ||
    isPictureCompleted;

  return {
    id: task.id,
    assignedChecklistId: task.assingedToChecklistId,
    assignedChecklistSnapshotId: task.assingedToChecklistSnapshotId,
    documentTaskId: task.id,
    parentDocumentTaskId: task.parentTaskId,
    notesHtml: task.notes,
    flagged: task.flag,
    completed,
    lastModified: task.lastModified || Date.now(),
    lastModifiedBy: task.lastModifiedBy || userId,
    response: task.taskResponse || '',
    correctiveActionResponse: task.correctiveActionResponse || null,
    temperatureReadingC: task.temperature != null ? task.temperature : null,
    attachmentsS3Url: task.attachments,
    skipped: task.skipped,
  };
};

/** post to update task  */
export const updateTask = async (params: {
  completedTasks: Task[];
  requiredParams: DefaultAPIParams;
}): Promise<ApiResponse<Task>> => {
  const formattedTasks = params.completedTasks.map((task) => {
    return mapTaskForUpdate(task, params.requiredParams.userId);
  });

  const payload = {
    ...params.requiredParams,
    tasks: formattedTasks,
  };

  const res = await fetch(UPDATE_TASK, {
    method: 'post',
    headers: {
      Authorization: JWT,
      'Content-Type': API_RESP_JSON,
      Accept: API_RESP_JSON,
    },
    body: JSON.stringify(payload),
  });

  const response = await getApiResponse<{
    latest: Task;
    success: boolean;
  }>(res);

  return { status: res.status, data: response.data?.latest ?? null };
};

/**
 * used to create a checklist from notes
 * and later to create a checklist from scratch
 */

export type CreateTaskPayload = {
  noteId: string | null;
  checklist: {
    description: string;
    name: string;
    document: Partial<Task>[];
  };
  assignment: {
    assignmentName: string | null;
    jobIds: number[] | null;
    userIds: number[] | null;
    locationId: number | null;
    scheduleIcs: string;
  };
};

export const createTask = async (
  params: CreateTaskPayload
): Promise<ApiResponse<TaskListBackend | Record<string, never>>> => {
  try {
    const res = await fetch(CREATE_TASK, {
      method: 'post',
      headers: {
        Authorization: JWT,
        'Content-Type': API_RESP_JSON,
        Accept: API_RESP_JSON,
      },
      body: JSON.stringify(params),
    });

    return await getApiResponse<TaskListBackend>(res);
  } catch (e) {
    return { status: 500, data: null };
  }
};

export type AssignPayload = {
  checklistId: number;
  assignment: {
    assignmentName: string | null;
    jobIds: number[] | null;
    userIds: number[] | null;
    locationId: number | null;
    scheduleIcs: string;
    departmentId: number | null;
  };
};

export const assignTask = async (
  params: AssignPayload
): Promise<ApiResponse<TaskListBackend | Record<string, never>>> => {
  try {
    const res = await fetch(ASSIGN_TASK_URL, {
      method: 'post',
      headers: {
        Authorization: JWT,
        'Content-Type': API_RESP_JSON,
        Accept: API_RESP_JSON,
      },
      body: JSON.stringify(params),
    });

    return await getApiResponse(res);
  } catch (e) {
    console.error('[assingTask]: ', e);
    return { status: 500, data: null };
  }
};

/** gets all assignable checklists */
export const getAssignableChecklists = async (
  params: ApiParams
): Promise<ApiResponse<AssignableChecklistBackend[]>> => {
  try {
    const res = await fetch(ASSIGNABLE_CHECKLISTS(params), {
      method: 'get',
      headers: {
        Authorization: JWT,
        'Content-Type': API_RESP_JSON,
        Accept: API_RESP_JSON,
      },
    });
    return await getApiResponse(res);
  } catch (e) {
    console.error('[getAssignableChecklists]: ', e);
    return { status: 500, data: null };
  }
};
