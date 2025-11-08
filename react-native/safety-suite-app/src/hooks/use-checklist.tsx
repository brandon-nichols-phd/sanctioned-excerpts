import React, {
  useMemo,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  PropsWithChildren,
  FC,
} from 'react';
import { useSelector } from 'react-redux';
import { State } from '../../store/types/store-types';
import { Task, TaskList, TaskType } from '../data/task';
import { shouldShowSubtasks } from '../../utils/task-utils';

/**
 * This hook's purpose is to control the filtering for
 * the checklist component. the values in the return are the
 * props for Checklist and should be used in the parent component
 * for each Checklist reference
 *
 * note:
 *  Any place we navigate in tasks it looks like we dispatch a setTaskSelected action
 *  So we shouldn't need to worry about any specific prop or matching on assignedId from nav props
 */

export type ChecklistQuickFilters =
  | 'Flagged'
  | 'Incomplete'
  | 'Comments'
  | 'Pictures'
  | '';

export const checklistQuickFilters: ChecklistQuickFilters[] = [
  'Flagged',
  'Incomplete',
  'Comments',
  'Pictures',
];

export type ChecklistState = {
  tasklist: TaskList | null;
  filteredTasks: Task[] | null;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  filter: ChecklistQuickFilters;
  setFilter: Dispatch<SetStateAction<ChecklistQuickFilters>>;
  handleShowFilters: () => void;
  handleQuickFilterSelect: (filter: ChecklistQuickFilters) => void;
  hasBle: boolean;
  handleTaskTypeChange: (taskId: string, type: TaskType) => void;
};

const ChecklistContext = createContext<ChecklistState | null>(null);

export const useChecklist = (): ChecklistState => {
  const context = useContext(ChecklistContext);
  if (context === null) {
    throw new Error('useChecklist must be used within a useChecklistProvider');
  }
  return context;
};
export const ChecklistProvider: FC<PropsWithChildren> = (props) => {
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filter, setFilter] = useState<ChecklistQuickFilters>('');
  const [hasBleSet, setHasBleSet] = useState<Set<string>>(new Set<string>());

  const tasks: TaskList[] = useSelector((state: State) => state.tasks.tasks);
  const selected: TaskList | null = useSelector((state: State) => state.tasks.selected);

  /**
   * used to set ble provider active if user
   * switched task type to ble from manual entry
   * and vice versa
   */
  const handleTaskTypeChange = useCallback(
    (taskId: string, type: TaskType) => {
      const tasksWithBle = new Set(hasBleSet);
      if (type === TaskType.TEMPERATURE) {
        tasksWithBle.add(taskId);
      } else if (tasksWithBle.has(taskId)) {
        tasksWithBle.delete(taskId);
      }
      setHasBleSet(tasksWithBle);
    },
    [hasBleSet]
  );

  const tasklist: TaskList | null = useMemo(() => {
    const t = tasks.find((tt) => tt.assignedId === selected?.assignedId);
    return t ?? null;
  }, [tasks, selected]);

  const handleShowFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const taskHasFilter = (task: Task, currFilter: ChecklistQuickFilters): boolean => {
    switch (currFilter) {
      case 'Flagged':
        return task.flag;
      case 'Incomplete':
        return !task.completed;
      case 'Comments':
        return task.notes.length > 0;
      case 'Pictures':
        return task.attachments.length > 0;
      default:
        return false;
    }
  };

  const handleFilterTasks = useCallback(
    (tasksToFilter: Task[] | null, filterBy: ChecklistQuickFilters): Task[] => {
      return (
        tasksToFilter?.reduce((acc: Task[], task: Task) => {
          const hasSubtasks = task.subtasks.length > 0;
          const showSubtasks = shouldShowSubtasks(task, task.skipped);

          if (hasSubtasks && showSubtasks) {
            const subtasks = handleFilterTasks(task.subtasks, filterBy);
            const hasFilteredSubtasks = subtasks.length > 0;

            if (hasFilteredSubtasks) {
              acc.push(task); // Always show parent task irregardless of filter if we are showing subtasks
              acc.push(...subtasks);
            } else if (taskHasFilter(task, filterBy)) {
              // No subtasks to show so lets see if we need to hide/show parent
              acc.push(task);
            }

            return acc;
          }

          if (taskHasFilter(task, filterBy)) {
            acc.push(task);
          }

          return acc;
        }, []) ?? []
      );
    },
    []
  );

  const filteredTasks: Task[] | null = useMemo(() => {
    if (!filter) {
      return null;
    }
    return handleFilterTasks(tasklist?.tasks || [], filter);
  }, [filter, handleFilterTasks, tasklist?.tasks]);

  const handleQuickFilterSelect = useCallback(
    (selectedFilter: ChecklistQuickFilters) => {
      if (selectedFilter === filter) {
        setFilter('');
      } else {
        setFilter(selectedFilter);
      }
    },
    [filter]
  );

  const state: ChecklistState = useMemo(
    () => ({
      tasklist,
      filteredTasks,
      showFilters,
      setShowFilters,
      filter,
      setFilter,
      handleShowFilters,
      handleQuickFilterSelect,
      hasBle: hasBleSet.size > 0,
      handleTaskTypeChange,
    }),
    [
      filter,
      handleQuickFilterSelect,
      handleShowFilters,
      showFilters,
      tasklist,
      filteredTasks,
      hasBleSet,
      handleTaskTypeChange,
    ]
  );

  return (
    <ChecklistContext.Provider value={state}>{props.children}</ChecklistContext.Provider>
  );
};
