import { UserInteraction } from './UserInteraction';

export const pathsToIgnore: string[] = [
  // '@@INIT',
  // 'persist/PERSIST',
  'context/setCustomer',
  'context/setLocations',
  'context/setUsersList',
  'userInteraction/setLastUserAction',
  'device/setDeviceOrientation',
  'labels/setLabels',
  'notes/setNotes',
  'tasks/setTasks',
  'user/setUsersList',
];

export const middleware = [UserInteraction];
