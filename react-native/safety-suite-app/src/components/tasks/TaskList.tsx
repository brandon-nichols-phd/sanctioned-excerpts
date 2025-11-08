import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { FC, useCallback, useMemo } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useDispatch } from 'react-redux';

import { setContext } from '../../../store/slices/contextSlice';
import { TaskFilterTypes } from '../../../store/types/store-types';
import { platformIOS } from '../../../utils/utils';
import { TaskListItem } from './TaskListItem';
import { TaskList as TaskListType, TaskSectionData } from '../../data/task';
import { setTaskFilters, setTaskSelected } from '../../../store/slices/taskSlice';
import PSectionList from '../../../utils/components/PSectionList';
import { isIphoneSe } from '../../../utils/Platform';

const getListItemKey = (item: TaskListType): string => `${item.assignedId}`;

export const TaskList: FC<{
  hasSearch: boolean;
  sectionList: TaskSectionData[];
  tasks: TaskListType[];
  paddingBottom?: number | string;
  selected: TaskListType | null;
  bottomTabContext: string;
}> = ({ hasSearch, sectionList, tasks, selected, bottomTabContext }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const orderedTasks = useMemo(() => {
    if (bottomTabContext !== 'Tasks' || !selected || !platformIOS.isPad) {
      return tasks;
    }

    const ftasks = tasks.filter(
      (checklist) => checklist.assignedId !== selected.assignedId
    );
    return [selected, ...ftasks];
  }, [tasks, selected, bottomTabContext]);

  const handleTaskListItemSelect = useCallback(
    (assignedId: number) => {
      // don't navigate if already in curr context
      if (bottomTabContext === 'Task') {
        return;
      }

      if (!platformIOS.isPad && bottomTabContext === 'ChecklistView') {
        return;
      }

      const payload = {
        assignedChecklistId: assignedId,
      };
      dispatch(setTaskSelected(payload));

      dispatch(
        setTaskFilters({
          type: TaskFilterTypes.CHECKLIST,
          filter: '',
        })
      );

      if (platformIOS.isPad) {
        navigation.navigate('Tasks View');
      } else {
        navigation.push('ChecklistView');
      }
    },
    [bottomTabContext, dispatch, navigation]
  );

  useFocusEffect(
    useCallback(() => {
      if (!platformIOS.isPad) {
        dispatch(setContext({ context: 'Task List' }));
      }
    }, [dispatch])
  );

  const showFloatingSelectedTask =
    platformIOS.isPad && selected && bottomTabContext === 'Tasks';

  const renderItem = useCallback(
    (renderItemProps: { item: TaskListType; index: number }) => {
      return (
        <View
          style={
            renderItemProps.index === 0 && showFloatingSelectedTask
              ? styles.taskSelected
              : styles.task
          }
          key={getListItemKey(renderItemProps.item)}
        >
          <TaskListItem
            item={renderItemProps.item}
            handleTaskListItemSelect={handleTaskListItemSelect}
            bottomTabContext={bottomTabContext}
            isSelected={renderItemProps.item.assignedId === selected?.assignedId}
          />
        </View>
      );
    },
    [handleTaskListItemSelect, bottomTabContext, selected, showFloatingSelectedTask]
  );

  return (
    <View style={styles.list}>
      {hasSearch ? (
        <PSectionList
          sectionList={sectionList}
          handleSelect={handleTaskListItemSelect}
          selectedAssignedId={selected?.assignedId}
          bottomTabContext={bottomTabContext}
        />
      ) : (
        <View style={styles.listSelectedContainer}>
          {showFloatingSelectedTask && orderedTasks.length && orderedTasks[0] ? (
            <View style={styles.toptask}>
              {renderItem({ item: orderedTasks[0], index: orderedTasks.length + 1 })}
            </View>
          ) : null}

          <FlatList
            data={orderedTasks}
            numColumns={1}
            scrollEnabled={true}
            keyExtractor={getListItemKey}
            renderItem={renderItem}
            initialNumToRender={5}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    height: '100%',
    backgroundColor: 'white',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: 'grey',
    paddingBottom: platformIOS.isPad ? '18%' : isIphoneSe ? '70%' : '80%',
    marginHorizontal: '1%',
  },
  task: {
    width: '100%',
    borderWidth: 0,
    marginVertical: '1%',
    opacity: 1,
  },
  taskSelected: {
    width: '100%',
    borderWidth: 0,
    marginVertical: '1%',
    opacity: 0,
  },
  toptask: {
    width: '100%',
    borderWidth: 0,
    marginVertical: '1%',
    position: 'absolute',
    top: 0,
    zIndex: 1,
  },
  listSelectedContainer: {
    justifyContent: 'center',
  },
});
