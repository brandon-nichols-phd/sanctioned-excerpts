import { useFocusEffect } from '@react-navigation/native';
import React, { FC, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setContext } from '../../../store/slices/contextSlice';
import { State } from '../../../store/types/store-types';
import FilterBar from './FilterBar';
import TaskSort from '../headers/tasks-headers/TaskSort';
import TaskFilters from '../headers/tasks-headers/TaskFilters';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { useChecklist } from '../../hooks/use-checklist';
import { useTasks } from '../../hooks/use-tasks';
import { TaskList } from './TaskList';
import { CheckList } from './Checklist';

const Tasks: FC = () => {
  const [{ hasSearch, tasks, sectionList }, { saveTask, uploadAttachment }] = useTasks();
  const showBottomFilters = useSelector((state: State) => state.tasks.showBottomFilters);
  const showSortOptions = useSelector((state: State) => state.tasks.showSortOptions);
  const selectedTask = useSelector((state: State) => state.tasks.selected);
  const bottomTabContext = useSelector((state: State) => state.context.bottomTabContext);
  const dispatch = useDispatch();

  // used as checklist component props and handling for filtering
  const { tasklist, filteredTasks } = useChecklist();

  useFocusEffect(
    useCallback(() => {
      const payload = { context: 'Tasks' };
      dispatch(setContext(payload));
    }, [dispatch])
  );

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        <View style={styles.filterBarContainer}>
          <FilterBar />
        </View>
        <View>
          <TaskList
            tasks={tasks}
            hasSearch={hasSearch}
            sectionList={sectionList}
            selected={selectedTask}
            bottomTabContext={bottomTabContext}
          />
        </View>
      </View>

      <View style={styles.taskContainer}>
        <CheckList
          tasklistName={tasklist?.name ?? ''}
          tasklistDescription={tasklist?.description}
          checklist={filteredTasks ? filteredTasks : tasklist?.tasks ?? null}
          level={0}
          saveTask={saveTask}
          uploadAttachment={uploadAttachment}
        />
      </View>

      {/* filtering and sorting modals */}
      {showBottomFilters && !showSortOptions ? (
        <View>
          <TaskFilters showFilter={showBottomFilters} />
        </View>
      ) : null}

      {showSortOptions && !showBottomFilters ? (
        <View>
          <TaskSort show={showSortOptions} />
        </View>
      ) : null}
    </View>
  );
};

export default Tasks;

const styles = StyleSheet.create({
  container: {
    width: windowWidth,
    height: windowHeight,
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  listContainer: {
    width: windowWidth * 0.45,
    height: windowHeight,
    backgroundColor: 'white',
    paddingBottom: '15%',
    marginHorizontal: '.5%',
  },
  taskContainer: {
    width: windowWidth * 0.55,
    height: windowHeight,
    backgroundColor: 'white',
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  filterBarContainer: {
    top: '5%',
    right: '5%',
  },
});
