import { RecurrenceCadence, TaskList } from '../../src/data/task';
import { checklistProgress } from '../../utils/task-utils';

const dummyTaskList: TaskList = {
  id: 1,
  description: '',
  checklistId: 1,
  noteId: null,
  name: '',
  assignedId: 1,
  timezone: '',
  lastModified: 0,
  lastModifiedBy: null,
  responses: {},
  sharingWith: {
    users: null,
    roles: null,
    location: null,
  },
  config: {
    dateRange: {
      start: 0,
      end: 0,
    },
    startTime: 0,
    endTime: 0,
    lockedTime: 0,
  },
  recurrence: {
    cadence: RecurrenceCadence.DAILY,
    ics: null,
  },
  tasks: [],
};

describe('checklistProgres', () => {
  it('should return 0 if the checklist is empty', () => {
    const progress = checklistProgress(dummyTaskList);
    expect(progress).toBe(0);
  });
});
