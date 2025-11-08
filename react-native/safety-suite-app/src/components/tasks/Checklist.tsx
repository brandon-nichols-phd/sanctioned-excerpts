import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { Card } from 'react-native-paper';

import { State } from '../../../store/types/store-types';
import { platformIOS } from '../../../utils/utils';
import TaskComponent from './Task';
import { S3Attachment, Task } from '../../data/task';
import { checklistLocked } from '../../../utils/task-utils';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { useKeyboard } from '../../hooks/use-keyboard';
import { windowHeight } from '../../../utils/Dimensions';
import {
  ChecklistQuickFilters,
  checklistQuickFilters,
  useChecklist,
} from '../../hooks/use-checklist';
import { Pill, FilterPill } from '../../../utils/components/Pill';
import { translate } from '../../data/translations';

type RenderItemProps = { item: Task; index: number };

type ChecklistProps = {
  checklist: Task[] | null;
  level: number;

  lastTempReader?: string;
  setLastTempReader?: (val: string) => void;

  // these are only needed when level == 0
  // level !== 0 only when it is nested subtasks
  tasklistName?: string;
  tasklistDescription?: string;
  saveTask: (task: Task) => Task;
  uploadAttachment: (attachment: S3Attachment) => void;
};

export const translateFilter = (filter: ChecklistQuickFilters): string => {
  switch (filter) {
    case 'Flagged':
      return translate('taskPillFilterFlagged');
    case 'Incomplete':
      return translate('taskPillFilterIncomplete');
    case 'Comments':
      return translate('taskPillFilterComments');
    case 'Pictures':
      return translate('taskPillFilterPictures');
    case '':
      return '';
  }
};

export const CheckList = (props: ChecklistProps) => {
  const [readOnly, setReadOnly] = useState<boolean>(false);
  const [lastTempReader, setLastTempReader] = useState('');
  const selected = useSelector((state: State) => state.tasks.selected);

  const { keyboardVisible, keyboardHeight } = useKeyboard();
  const { filter, showFilters, handleShowFilters, handleQuickFilterSelect } =
    useChecklist();

  const paddingForKeyboard: number = platformIOS.isPad
    ? windowHeight - keyboardHeight
    : windowHeight * 0.75 - keyboardHeight;

  const dynamicStyles = StyleSheet.create({
    taskKeyboardVisisble: {
      ...styles.task,
      marginBottom: paddingForKeyboard,
    },
    taskMarginBottomNoKeyboard: {
      ...styles.task,
      marginBottom: '10%',
    },
    taskMarginBottomLevelPlus: {
      ...styles.task,
      marginBottom: '1%',
    },
  });

  useEffect(() => {
    if (!props.checklist || !selected) {
      return;
    }

    setReadOnly(checklistLocked(selected));
  }, [props.checklist, selected]);

  const renderItem = useCallback(
    (renderItemProps: RenderItemProps) => (
      <>
        {props.level === 0 &&
          renderItemProps.index === 0 &&
          props.tasklistDescription && (
            <View
              style={[
                dynamicStyles.taskMarginBottomLevelPlus,
                checklistStyles.cardContainer,
              ]}
            >
              <Card style={checklistStyles.card}>
                <Card.Title
                  title={
                    <View>
                      <Text style={checklistStyles.cardTitleText}>
                        {props.tasklistDescription}
                      </Text>
                    </View>
                  }
                />
              </Card>
            </View>
          )}
        <View
          style={
            props.checklist &&
            renderItemProps.index === props.checklist.length - 1 &&
            props.level === 0
              ? keyboardVisible
                ? dynamicStyles.taskKeyboardVisisble
                : dynamicStyles.taskMarginBottomNoKeyboard
              : dynamicStyles.taskMarginBottomLevelPlus
          }
        >
          <TaskComponent
            item={renderItemProps.item}
            level={props.level}
            readOnly={readOnly}
            lastTempReader={props.lastTempReader ?? lastTempReader}
            setLastTempReader={props.setLastTempReader ?? setLastTempReader}
            saveTask={props.saveTask}
            uploadAttachment={props.uploadAttachment}
          />
        </View>
      </>
    ),
    [
      props.checklist,
      props.level,
      props.tasklistDescription,
      keyboardVisible,
      dynamicStyles.taskKeyboardVisisble,
      dynamicStyles.taskMarginBottomNoKeyboard,
      dynamicStyles.taskMarginBottomLevelPlus,
      readOnly,
      lastTempReader,
      props.lastTempReader,
      props.setLastTempReader,
      props.saveTask,
      props.uploadAttachment,
    ]
  );

  return (
    <View
      style={
        props.level > 0
          ? checklistStyles.listContainerLevelPlus
          : platformIOS.isPad
          ? checklistStyles.listContainerLevelZeroiPad
          : checklistStyles.listContainerLevelZeroiPhone
      }
    >
      {props.level === 0 && platformIOS.isPad ? (
        <>
          <View style={checklistStyles.ipadView}>
            <View style={checklistStyles.pillContainer}>
              <Pill label={translate('taskPillFilter')} onPress={handleShowFilters} />
              {filter ? <View style={checklistStyles.badge} /> : null}
            </View>

            <Text style={checklistStyles.ipadTxt} numberOfLines={4}>
              {props.tasklistName || ''}
            </Text>
          </View>

          {/* show filter pill options */}
          {showFilters ? (
            <View style={checklistStyles.filterPillsContainer}>
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
        </>
      ) : null}

      <FlatList
        data={props.checklist}
        style={
          props.level === 0
            ? checklistStyles.flatlistContiner
            : checklistStyles.nestedFlatlistContiner
        }
        numColumns={1}
        scrollEnabled={true}
        renderItem={renderItem}
        initialNumToRender={5}
        keyExtractor={(item) => item.uniqueId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  task: {
    width: '100%',
    borderWidth: 0,
    marginVertical: '1%',
  },
});

const checklistStyles = StyleSheet.create({
  flatlistContiner: {
    marginVertical: platformIOS.isPad ? '1%' : 0,
    marginBottom: platformIOS.isPad ? 0 : windowHeight * 0.03,
  },
  nestedFlatlistContiner: {
    marginVertical: platformIOS.isPad ? '1%' : 0,
    marginBottom: platformIOS.isPad ? 0 : windowHeight * 0.009,
  },
  ipadView: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: '2%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
  },
  ipadTxt: {
    textAlign: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 22,
    flex: 8,
    flexWrap: 'wrap',
  },
  filterPillsContainer: {
    margin: '.5%',
    marginTop: '1%',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  badge: {
    position: 'absolute',
    borderRadius: 20,
    height: 22,
    width: 22,
    top: -9,
    left: 75,
    alignSelf: 'center',
    fontSize: 12,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_RED,
  },
  listContainerLevelPlus: {
    ...styles.task,
    marginVertical: 0,
    paddingBottom: '1%',
  },
  listContainerLevelZeroiPad: {
    ...styles.task,
    paddingBottom: '35%',
    marginVertical: 0,
  },
  listContainerLevelZeroiPhone: {
    ...styles.task,
    paddingBottom: '15%',
    marginVertical: 0,
  },
  pillContainer: {
    flex: 1.1,
    marginHorizontal: '1%',
    maxHeight: windowHeight * 0.03,
  },
  cardContainer: {
    paddingHorizontal: platformIOS.isPad ? 0 : '2%',
    width: platformIOS.isPad ? '88%' : '100%',
  },
  card: {
    backgroundColor: 'white',
  },
  cardTitleText: {
    marginTop: '3%',
    marginBottom: '3%',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'left',
  },
});
