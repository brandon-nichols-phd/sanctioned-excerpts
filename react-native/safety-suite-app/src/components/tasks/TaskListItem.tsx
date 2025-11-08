import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Chip, IconButton } from 'react-native-paper';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import moment from 'moment';
import { MenuView } from '@react-native-menu/menu';

import {
  compareDates,
  getTimeFromDate,
  isValidValue,
  platformIOS,
  showToast,
} from '../../../utils/utils';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { Task, TaskBadgeStates, TaskList } from '../../data/task';
import { setTaskSelected } from '../../../store/slices/taskSlice';
import { globalStyles } from '../../../utils/styles';
import {
  getTaskBadges,
  badgeColor,
  getStartTime,
  getEndTime,
  checklistProgress,
  totalProgressTasks,
  checklistMissed,
  checklistOverdue,
  getChecklistDateRange,
  totalProgressTaskListComplete,
  getMaxModified,
  isChecklistLate,
} from '../../../utils/task-utils';
import { isIphoneSe } from '../../../utils/Platform';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { ToastTypes } from '../../types/app';
import { State } from '../../../store/types/store-types';
import { useTaskDeactivate } from '../../hooks/use-task-deactivate';
import { translate } from '../../data/translations';

type TaskListItempProps = {
  item: TaskList;
  isSelected: boolean;
  handleTaskListItemSelect?: (assignedId: number) => void;
  bottomTabContext: string;
};

export const TaskListItem: FC<TaskListItempProps> = React.memo(
  ({ item, isSelected, handleTaskListItemSelect, bottomTabContext }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const currentUser = useSelector((state: State) => state.user.currUser);

    const { deactivateTask } = useTaskDeactivate();

    const isModifiedBySelf = item.lastModifiedBy === currentUser?.id;

    const totalSubtasks = useMemo(() => {
      return totalProgressTasks(item);
    }, [item]);

    const totalSubtasksCompleted = useMemo(() => {
      return totalProgressTaskListComplete(item);
    }, [item]);

    const progress = useMemo(() => {
      return checklistProgress(item);
    }, [item]);

    const name = useMemo(() => {
      return item.name || item.description || '';
    }, [item]);

    const [completedTaskList, setCompletedTaskList] = useState<boolean | null>(null);

    useEffect(() => {
      if (completedTaskList === null) {
        setCompletedTaskList(progress === 1);
      } else if (!completedTaskList && progress === 1) {
        showToast({
          type: ToastTypes.SUCCESS,
          txt1: translate('taskCompletedToastTxt1'),
          txt2: translate('taskCompletedToastTxt1', { name: item.name }),
        });
        setCompletedTaskList(true);
      }
    }, [item, progress, completedTaskList]);

    const handleNavigation = useCallback(() => {
      if (platformIOS.isPad && bottomTabContext === 'Tasks') {
        return;
      }

      if (platformIOS.isPad) {
        navigation.navigate('Tasks View');
      } else {
        navigation.push('ChecklistView');
      }
    }, [bottomTabContext, navigation]);

    const handleSelect = useCallback(() => {
      if (handleTaskListItemSelect !== undefined) {
        handleTaskListItemSelect(item.assignedId);
        return;
      }

      // don't navigate if already in curr context
      if (bottomTabContext === 'Task') {
        return;
      }

      if (!platformIOS.isPad && bottomTabContext === 'ChecklistView') {
        return;
      }

      dispatch(
        setTaskSelected({
          assignedChecklistId: item.assignedId,
        })
      );

      handleNavigation();
    }, [bottomTabContext, dispatch, handleNavigation, handleTaskListItemSelect, item]);

    return (
      <MenuView
        shouldOpenOnLongPress
        title={name}
        onPressAction={async () => {
          try {
            await deactivateTask(item.assignedId);
            navigation.goBack();
          } catch {
            // nada
          }
        }}
        actions={[
          {
            id: 'deactivate',
            title: translate('taskMenuDeactivate'),
            attributes: {
              destructive: true,
              disabled: !isModifiedBySelf,
            },
            image: 'trash',
          },
        ]}
      >
        <Pressable style={styles.container} onPress={handleSelect}>
          <Card style={isSelected ? styles.cardSelected : styles.card}>
            <Card.Title
              title={
                <LeftGroup
                  name={name}
                  status={`${totalSubtasksCompleted}/${totalSubtasks}`}
                />
              }
              titleStyle={styles.title}
              subtitle={<BadgeGroup task={item} progress={progress} />}
            />
            <Card.Content>
              <View style={styles.rowSpaceBetween}>
                <View style={styles.columnSpaceBetween}>
                  {/* task available interval */}
                  <View style={styles.rowRight}>
                    <AvailableInterval
                      task={item}
                      start={item.config.startTime}
                      end={item.config.endTime}
                      lock={item.config.lockedTime}
                    />
                  </View>

                  <View style={styles.rowLeft}>
                    <View
                      style={
                        platformIOS.isPad
                          ? styles.statusContaineriPad
                          : styles.statusContainer
                      }
                    >
                      <StatusUpdates
                        task={item}
                        completed={progress === 1}
                        progress={progress}
                      />
                    </View>

                    <View style={styles.infoContainer}>
                      {/* TODO: spacing here sucks asssssss */}
                      <View>
                        <AttachmentInfo subtasks={item.tasks} />
                      </View>
                      <View
                        style={platformIOS.isPad ? styles.infoLeftiPad : styles.infoLeft}
                      >
                        <NoteInfo subtasks={item.tasks} />
                      </View>
                      <View
                        style={platformIOS.isPad ? styles.infoLeftiPad : styles.infoLeft}
                      >
                        <SubTaskInfo subtasks={item.tasks} />
                      </View>
                    </View>
                  </View>
                </View>

                {/* progress animation */}
                <View
                  style={
                    platformIOS.isPad
                      ? styles.rightGroupContaineriPad
                      : styles.rightGroupContainer
                  }
                >
                  <RightGroup progress={progress * 100} />
                </View>
              </View>
            </Card.Content>
          </Card>
        </Pressable>
      </MenuView>
    );
  }
);

type AvailableIntervalProps = {
  start: number;
  end: number;
  lock: number;
  task: TaskList;
};

const AvailableInterval: FC<AvailableIntervalProps> = ({ start, end, lock, task }) => {
  const intervalRange = useMemo(() => {
    const stime = getStartTime(start);
    const etime = getEndTime(end || lock);

    let interval = '';
    if (stime && etime) {
      interval = `${stime} - ${etime}`;
    } else {
      interval = etime;
    }

    return interval;
  }, [end, lock, start]);

  const locked = useMemo(() => {
    return !compareDates(moment(task.config.startTime).toDate(), new Date());
  }, [task.config.startTime]);

  const dateRange = useMemo(() => {
    return getChecklistDateRange(task);
  }, [task]);

  return (
    <View
      style={[
        globalStyles.row,
        {
          justifyContent: 'flex-start',
          alignItems: 'center',
        },
      ]}
    >
      <IconButton icon={locked ? 'lock' : 'clock'} iconColor="black" size={22} />
      <Text style={{ fontSize: 14, fontWeight: '600' }}>
        {dateRange ? dateRange + ', ' + intervalRange : intervalRange}
      </Text>
    </View>
  );
};

type LeftGroup = {
  name: string;
  status: string;
};

const LeftGroup: FC<LeftGroup> = ({ name, status }) => {
  return (
    <View style={[globalStyles.row, { flexWrap: 'wrap' }]}>
      <Text style={styles.title}>{`${name} - ${status}`}</Text>
    </View>
  );
};

type RightGroupProps = {
  progress: number;
};

const RightGroup: FC<RightGroupProps> = ({ progress }) => {
  return (
    <View>
      <AnimatedCircularProgress
        size={80}
        width={12}
        fill={progress}
        tintColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
        backgroundColor={'grey'}
      >
        {() => (
          <Text style={{ textAlign: 'center', fontSize: 17, fontWeight: '600' }}>
            {progress.toFixed(0) + '%'}
          </Text>
        )}
      </AnimatedCircularProgress>
    </View>
  );
};

type StatusUpdatesProps = {
  task: TaskList;
  completed: boolean;
  progress: number;
};

const StatusUpdates: FC<StatusUpdatesProps> = ({ task, completed, progress }) => {
  // not open yet
  const taskAvailable = compareDates(moment(task.config.startTime).toDate(), new Date());

  const lastModified = useMemo((): number => {
    return getMaxModified(task.tasks) || 0;
  }, [task]);

  // late is only based on last modified time and not completed time
  // do we have a completd time?
  const late = isChecklistLate(task, lastModified);
  const overdue = late && checklistOverdue(task);
  const taskMissed = checklistMissed(task);

  if (completed && progress === 1 && !overdue) {
    return (
      <Text style={{ color: 'green' }}>
        {translate('taskStatusCompletedAt', { date: getTimeFromDate(lastModified) })}
      </Text>
    );
  } else if (completed && progress === 1 && overdue) {
    return (
      <Text style={{ color: PATHSPOT_COLORS.PATHPOT_ORANGE_BROWN }}>
        {translate('taskStatusCompletedAt', { date: getTimeFromDate(lastModified) })}
      </Text>
    );
  } else if (taskMissed) {
    return (
      <Text style={{ color: PATHSPOT_COLORS.PATHSPOT_LAVENDER, fontWeight: '600' }}>
        {translate('taskStatusLockedSince', { date: getEndTime(task.config.lockedTime) })}
      </Text>
    );
  } else if (!taskAvailable) {
    return (
      <Text style={{ color: 'black', fontWeight: '600' }}>
        {translate('taskStatusLockedUntil', {
          date: getStartTime(task.config.startTime),
        })}
      </Text>
    );
  } else if (overdue) {
    return (
      <Text style={{ color: PATHSPOT_COLORS.PATHPOT_ORANGE_BROWN, fontWeight: '600' }}>
        {translate('taskStatusLateSince', { date: getEndTime(task.config.endTime) })}
      </Text>
    );
  } else {
    return (
      <Text style={{ color: PATHSPOT_COLORS.PATHPOT_ORANGE_BROWN, fontWeight: '600' }}>
        {translate('taskStatusDueAt', {
          date: getEndTime(task.config.endTime || task.config.lockedTime),
        })}
      </Text>
    );
  }
};

const AttachmentInfo: FC<{ subtasks: Task[] }> = ({ subtasks }) => {
  const attachemnts = useMemo(() => {
    let atts = 0;
    subtasks.forEach((sub) => {
      const attachments = sub.attachments;
      atts += attachments.length ? attachments.length : 0;
    });
    return atts;
  }, [subtasks]);

  return attachemnts > 0 ? (
    <View style={[globalStyles.row, { marginHorizontal: '2%' }]}>
      <Text>{attachemnts}</Text>
      <IconButton icon="paperclip" size={20} style={{ top: -15, left: -15 }} />
    </View>
  ) : null;
};

const NoteInfo: FC<{ subtasks: Task[] }> = ({ subtasks }) => {
  const notes = useMemo(() => {
    let ncount = 0;
    subtasks.forEach((sub) => {
      ncount += sub.notes && isValidValue(sub.notes) ? 1 : 0;
    });
    return ncount;
  }, [subtasks]);

  return notes > 0 ? (
    <View style={[globalStyles.row, { marginLeft: platformIOS.isPad ? '15%' : '2%' }]}>
      <Text>{notes}</Text>
      <IconButton icon="note-outline" size={20} style={{ top: -15, left: -10 }} />
    </View>
  ) : null;
};

const getSubtaskCount = (task: Task, level: number) => {
  let cnt: number = level > 0 ? 1 : 0;
  if (task.subtasks.length) {
    task.subtasks.forEach((sub) => {
      cnt += getSubtaskCount(sub, level + 1);
    });
  }
  return cnt;
};

const SubTaskInfo: FC<{ subtasks: Task[] }> = ({ subtasks }) => {
  const subtaskCount = useMemo(() => {
    let stCtn = 0;
    subtasks.forEach((stask) => {
      stCtn += getSubtaskCount(stask, 1);
    });
    return stCtn;
  }, [subtasks]);

  return subtaskCount > 0 ? (
    <View style={[globalStyles.row, { marginHorizontal: '2%' }]}>
      <Text style={{ marginHorizontal: '5%' }}>{subtaskCount}</Text>
      <IconButton icon="file-tree" size={20} style={{ top: -15, left: -15 }} />
    </View>
  ) : null;
};

type BadgeGroupProps = {
  task: TaskList;
  progress: number;
};

const getBadgeTranslation = (badge: TaskBadgeStates): string => {
  switch (badge) {
    case TaskBadgeStates.LOCKED:
      return translate('taskBadgeLocked');
    case TaskBadgeStates.COMPLETE:
      return translate('taskBadgeComplete');
    case TaskBadgeStates.INCOMPLETE:
      return translate('taskBadgeIncomplete');
    case TaskBadgeStates.LATE:
      return translate('taskBadgeLate');
    case TaskBadgeStates.MISSED:
      return translate('taskBadgeMissed');
    case TaskBadgeStates.FLAGGED:
      return translate('taskBadgeFlagged');
  }
};

const BadgeGroup: FC<BadgeGroupProps> = ({ task, progress }) => {
  const badges = getTaskBadges(task, progress);

  return badges.length ? (
    <View style={[globalStyles.row, { marginRight: '1%' }]}>
      {badges.map((badge) => (
        <Chip
          key={badge}
          style={{
            height: 30,
            marginLeft: 2,
            top: '1%',
            alignSelf: 'flex-start',
            backgroundColor: badgeColor(badge),
            borderRadius: 25,
          }}
          textStyle={{ color: 'white', textAlign: 'center', justifyContent: 'center' }}
        >
          {getBadgeTranslation(badge)}
        </Chip>
      ))}
    </View>
  ) : (
    <></>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: '.5%',
    borderColor: 'grey',
    borderBottomEndRadius: 2,
  },
  rgroup: {
    display: 'flex',
    flexDirection: 'row',
  },
  card: {
    padding: '1%',
    width: '98%',
    height: isIphoneSe ? windowHeight * 0.23 : windowHeight * 0.2,
    backgroundColor: 'white',
  },
  cardSelected: {
    padding: '1%',
    width: '98%',
    height: isIphoneSe ? windowHeight * 0.23 : windowHeight * 0.2,
    backgroundColor: '#ccd',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  progressBar: {
    width: platformIOS.isPad ? '108%' : windowWidth * 0.97,
    height: 15,
    justifyContent: 'center',
    marginLeft: platformIOS.isPad ? '1%' : 0,
    marginBottom: '1%',
    borderRadius: 25,
  },
  title: {
    textAlign: 'left',
    fontSize: 18,
    fontWeight: '700',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    flexWrap: 'wrap',
  },
  rowSpaceBetween: {
    ...globalStyles.row,
    justifyContent: 'space-between',
  },
  columnSpaceBetween: {
    ...globalStyles.column,
    justifyContent: 'space-between',
    flex: 0.75, // flex here helps align animated circles
  },
  rowRight: {
    ...globalStyles.row,
  },
  rowLeft: {
    ...globalStyles.row,
    left: '6%',
  },
  statusContainer: {
    marginRight: '5%',
  },
  statusContaineriPad: {
    marginRight: '12%',
  },
  infoContainer: {
    display: 'flex',
    direction: 'ltr',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    width: platformIOS.isPad ? 20 : 150,
    justifyContent: platformIOS.isPad ? 'space-between' : 'space-around',
    marginLeft: platformIOS.isPad ? 0 : '2%',
  },
  infoLeft: {
    left: 0,
  },
  infoLeftiPad: {
    left: -25,
  },
  rightGroupContainer: {
    bottom: '12%',
    flex: 0.21,
  },
  rightGroupContaineriPad: {
    bottom: '6%',
    flex: 0.2,
  },
});
