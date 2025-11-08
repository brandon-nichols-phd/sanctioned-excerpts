import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { setContext } from '../../../../store/slices/contextSlice';
import { State } from '../../../../store/types/store-types';
import { HorizontalLine } from '../../../../utils/components/Lines';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import FilterBar from '../FilterBar';
import TaskFilters from '../../headers/tasks-headers/TaskFilters';
import TaskSort from '../../headers/tasks-headers/TaskSort';
import { TaskList } from '../TaskList';
import { useTasks } from '../../../hooks/use-tasks';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';

const styles = StyleSheet.create({
  container: {
    width: windowWidth,
    height: windowHeight,
    backgroundColor: 'white',
  },
  filterBar: {
    marginHorizontal: '1%',
  },
  list: {
    width: windowWidth,
    height: windowHeight,
  },
});

const IphoneTaskView = () => {
  const [{ hasSearch, tasks, sectionList }] = useTasks();
  const showBottomFilters = useSelector((state: State) => state.tasks.showBottomFilters);
  const showSortOptions = useSelector((state: State) => state.tasks.showSortOptions);
  const selectedTask = useSelector((state: State) => state.tasks.selected);
  const bottomTabContext = useSelector((state: State) => state.context.bottomTabContext);
  const dispatch = useDispatch();

  useFocusEffect(
    useCallback(() => {
      const payload = { context: 'Task List' };
      dispatch(setContext(payload));
    }, [dispatch])
  );

  return (
    <View style={styles.container}>
      <Text
        style={{
          marginHorizontal: '5%',
          marginVertical: '2.5%',
          textAlign: 'left',
          color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
          fontSize: 26,
          fontWeight: '600',
        }}
      >
        Tasks
      </Text>

      <View style={styles.filterBar}>
        <FilterBar />
      </View>

      <HorizontalLine mt={-25} />

      <View>
        <TaskList
          tasks={tasks}
          hasSearch={hasSearch}
          sectionList={sectionList}
          selected={selectedTask}
          bottomTabContext={bottomTabContext}
        />
      </View>

      {/* filtering and sorting modals */}
      {showBottomFilters && !showSortOptions ? (
        <View style={{}}>
          <TaskFilters showFilter={showBottomFilters} />
        </View>
      ) : null}

      {showSortOptions && !showBottomFilters ? (
        <View style={{}}>
          <TaskSort show={showSortOptions} />
        </View>
      ) : null}
    </View>
  );
};

export default IphoneTaskView;
