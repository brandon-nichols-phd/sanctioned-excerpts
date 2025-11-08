import React, { useEffect, useState, useCallback } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, IconButton, Surface } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

import { platformIOS } from '../../../../utils/utils';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { TaskList } from '../../../data/task';
import { globalStyles } from '../../../../utils/styles';
import {
  checklistOverdue,
  checklistProgress,
  getEndTime,
  getStartTime,
  isTaskLocked,
  taskIsAvailable,
  taskOverdueTitle,
  totalProgressTasks,
  totalProgressTaskListComplete,
} from '../../../../utils/task-utils';
import { setTaskSelected } from '../../../../store/slices/taskSlice';
import { isIphoneSe } from '../../../../utils/Platform';
import { windowHeight } from '../../../../utils/Dimensions';
import { translate } from '../../../data/translations';

const TaskNextStep = (props: { task: TaskList | null }) => {
  const { task } = props;

  const [progress, setProgress] = useState<string>('0');
  const [totalSubtasks, setTotalSubtasks] = useState<number>(task?.tasks.length || 0);
  const [totalSubtasksCompleted, setTotalSubtasksCompleted] = useState<number>(
    task?.tasks.filter((t) => t.completed).length || 0
  );

  const [dueDate, setDueDate] = useState<string>('');
  const [availableInterval, setAvailableInterval] = useState<string>('');
  const [locked, setLocked] = useState<boolean>(false);
  const [late, setLate] = useState<boolean>(false);

  const dispatch = useDispatch();
  const navigation = useNavigation();

  // gets date format for next due - today, tomorrow, or day month year
  const getDate = useCallback(async (): Promise<string> => {
    const due = task?.config.startTime ? task.config.startTime : 0; // assume first for nowww
    if (!due) {
      return '-';
    }
    return await taskOverdueTitle(task?.recurrence);
  }, [task?.config.startTime, task?.recurrence]);

  useEffect(() => {
    if (!task) {
      return;
    }

    const total = totalProgressTasks(task);
    const totalComplete = totalProgressTaskListComplete(task);
    const p = checklistProgress(task);

    setProgress((p * 100).toFixed(0));
    setTotalSubtasks(total);
    setTotalSubtasksCompleted(totalComplete);

    // get due date
    getDate()
      .then(setDueDate)
      .catch(() => {
        // Nada
      });

    const start = getStartTime(task.config.startTime);
    const end = getEndTime(task.config.endTime);
    let interval = '';
    if (start && end) {
      interval = `${start} - ${end}`;
    } else {
      interval = end;
    }

    const passedLockedTime = task.config.lockedTime
      ? isTaskLocked(task.config.lockedTime)
      : false;

    const notAvailableYet = task.config.startTime
      ? !taskIsAvailable(task.config.startTime)
      : false;

    const isLocked = passedLockedTime || notAvailableYet;
    setLocked(isLocked);

    const isLate = checklistOverdue(task);
    setLate(isLate);
    const time = isLate ? translate('taskLateSince', { end }) : interval;
    setAvailableInterval(time);
  }, [task, getDate]);

  const handleNavigation = useCallback(() => {
    if (task?.assignedId) {
      const payload = { assignedChecklistId: task.assignedId };
      dispatch(setTaskSelected(payload));

      if (platformIOS.isPad) {
        navigation.push('Tasks View');
      } else {
        navigation.push('ChecklistView');
      }
    }
  }, [dispatch, navigation, task?.assignedId]);

  return (
    <Pressable style={styles.container} onPress={handleNavigation}>
      <Card
        style={[
          styles.card,
          isIphoneSe ? { aspectRatio: 10 / 2.8 } : {},
          !platformIOS.isPad && !isIphoneSe ? { aspectRatio: 10 / 3.2 } : {},
        ]}
      >
        <View style={styles.cardView}>
          <View style={styles.viewBetween}>
            <View style={styles.viewBetweenFlex}>
              <View>
                <Text style={styles.taskNameStyle}>
                  {`${
                    task?.name && task.name.length > 27
                      ? task.name.slice(0, 27).trim() + '...'
                      : task?.name ?? ''
                  } - ${totalSubtasksCompleted}/${totalSubtasks}`}
                </Text>
              </View>

              {/* date format : day month 2023 */}
              <View style={styles.date}>
                <IconButton icon="calendar" size={20} />
                <Text style={styles.fw600}>{dueDate}</Text>
              </View>

              {/* time for next task */}
              <View style={styles.time}>
                <IconButton icon={locked ? 'lock' : 'clock'} size={20} />
                <Text style={late ? styles.timeLateLabel : styles.timeDefaultLabel}>
                  {availableInterval}
                </Text>
              </View>
            </View>

            {/* locked icon or progress */}
            <View style={styles.lockedContainer}>
              <TaskRightIcon locked={locked} progress={progress} />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
};

export default TaskNextStep;

const TaskRightIcon = (props: { locked: boolean; progress: string }) => {
  if (props.locked) {
    return (
      <Surface style={taskRightStyles.surfaceContainer}>
        <IconButton icon="lock" size={platformIOS.isPad ? 40 : 25} />
      </Surface>
    );
  } else {
    return (
      <AnimatedCircularProgress
        size={platformIOS.isPad ? 80 : 67}
        width={platformIOS.isPad ? 12 : 10}
        fill={Number.parseInt(props.progress, 10)}
        tintColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
        backgroundColor={'grey'}
        style={taskRightStyles.circle}
      >
        {() => <Text style={taskRightStyles.circleTxt}>{props.progress + '%'}</Text>}
      </AnimatedCircularProgress>
    );
  }
};

const taskRightStyles = StyleSheet.create({
  surfaceContainer: {
    backgroundColor: 'transparent',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    bottom: platformIOS.isPad ? '10%' : '2%',
  },
  circle: {
    marginVertical: platformIOS.isPad ? 0 : '10%',
    bottom: platformIOS.isPad ? '15%' : 0,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
  },
  circleTxt: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 18 : 15,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  container: {
    marginBottom: '.5%',
    marginRight: '.5%',
    borderColor: 'grey',
    borderBottomEndRadius: 2,
    width: platformIOS.isPad ? '65%' : '100%',
    alignSelf: 'flex-start',
  },
  date: {
    ...globalStyles.row,
    alignContent: 'flex-start',
    alignItems: 'center',
    top: -windowHeight * 0.0085,
    left: -10,
  },
  time: {
    ...globalStyles.row,
    alignContent: 'flex-start',
    alignItems: 'center',
    top: -windowHeight * 0.04,
    left: -10,
  },
  timeLateLabel: {
    fontWeight: '600',
    color: PATHSPOT_COLORS.PATHPOT_ORANGE_BROWN,
  },
  timeDefaultLabel: {
    fontWeight: '600',
    color: 'black',
  },
  lockedContainer: {
    flex: 1,
    marginHorizontal: '2%',
    bottom: platformIOS.isPad ? 0 : '6%',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  card: {
    width: '90%',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
    margin: '.75%',
  },
  cardView: { width: '98%', height: windowHeight * 0.1025, margin: '2%' },
  viewBetween: {
    ...globalStyles.row,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewBetweenFlex: {
    ...globalStyles.column,
    justifyContent: 'space-between',
    flex: 2.5,
  },
  taskNameStyle: {
    textAlign: 'left',
    fontWeight: '700',
    marginTop: '3%',
  },
  fw600: {
    fontWeight: '600',
  },
});
