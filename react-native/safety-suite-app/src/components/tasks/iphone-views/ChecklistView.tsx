import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { setContext } from '../../../../store/slices/contextSlice';
import { platformIOS } from '../../../../utils/utils';
import { CheckList, translateFilter } from '../Checklist';
import { checklistQuickFilters, useChecklist } from '../../../hooks/use-checklist';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { FilterPill } from '../../../../utils/components/Pill';
import { TaskListItem } from '../TaskListItem';
import { useTasks } from '../../../hooks/use-tasks';

const ChecklistView = () => {
  const dispatch = useDispatch();

  // used as checklist component props and handling for filtering
  const { tasklist, filteredTasks, showFilters, filter, handleQuickFilterSelect } =
    useChecklist();
  const [, { saveTask, uploadAttachment }] = useTasks();

  useFocusEffect(
    useCallback(() => {
      if (!platformIOS.isPad) {
        const payload = { context: 'ChecklistView' };
        dispatch(setContext(payload));
      }
    }, [dispatch])
  );

  return !tasklist?.tasks.length ? (
    // Empty
    <View style={styles.container}>
      {/* checklist / task header */}
      <View style={styles.header} />

      {/* task list */}
      <View style={styles.list} />
    </View>
  ) : (
    <View style={styles.container}>
      {/* show quick filters for checklist */}
      {showFilters ? (
        <View style={styles.filterPillContainer}>
          {checklistQuickFilters.map((qfilter, index) => (
            <FilterPill
              key={index}
              title={translateFilter(qfilter)}
              filter={qfilter}
              onPress={handleQuickFilterSelect}
              selected={filter}
            />
          ))}
        </View>
      ) : null}

      {/* checklist / task header */}
      <View style={styles.header}>
        <TaskListItem
          item={tasklist}
          isSelected={true}
          bottomTabContext={'ChecklistView'}
        />
      </View>

      {/* task list */}
      <View style={styles.list}>
        <CheckList
          tasklistName={tasklist.name}
          tasklistDescription={tasklist.description}
          checklist={filteredTasks ? filteredTasks : tasklist.tasks}
          level={0}
          saveTask={saveTask}
          uploadAttachment={uploadAttachment}
        />
      </View>
    </View>
  );
};

export default ChecklistView;

const styles = StyleSheet.create({
  container: {
    width: windowWidth,
    height: windowHeight,
    backgroundColor: 'white',
  },
  header: {
    marginVertical: '2%',
  },
  list: {
    width: windowWidth,
    height: windowHeight,
    paddingBottom: windowHeight * 0.4,
  },
  filterPillContainer: {
    margin: '.5%',
    marginTop: '2%',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
});
