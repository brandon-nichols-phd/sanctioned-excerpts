import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { globalStyles } from '../../../utils/styles';
import { useTasks } from '../../hooks/use-tasks';
import { Task, TaskConfig } from '../../data/task';
import { isTaskComplete } from '../../../utils/task-utils';
import { translate } from '../../data/translations';

type Props = {
  task: Task;
  handleSelect: (assignedId: number, config: TaskConfig) => void;
};

const SectionTaskView = (props: Props) => {
  const { task, handleSelect } = props;
  const [{ tasks }] = useTasks();

  const [parentTaskList, isTaskCompleted] = useMemo(() => {
    const ptask = tasks.find(
      (tasklist) => tasklist.assignedId === task.assingedToChecklistId
    );
    return [ptask, isTaskComplete(task)];
  }, [task, tasks]);

  return (
    <Pressable
      style={styles.container}
      onPress={() => {
        if (!parentTaskList) {
          return;
        }
        handleSelect(task.assingedToChecklistId, parentTaskList.config);
      }}
    >
      <Card style={styles.card}>
        <Card.Title
          title={
            <View style={globalStyles.row}>
              <Text style={[styles.title, {}]}>{task.name}</Text>
            </View>
          }
          titleStyle={styles.title}
          subtitle={
            <View
              style={{
                marginHorizontal: '2%',
                justifyContent: 'center',
                marginTop: '1%',
              }}
            >
              <Text
                style={[
                  styles.parentTitle,
                  { fontSize: 16, color: isTaskCompleted ? 'green' : 'red' },
                ]}
              >
                {isTaskCompleted
                  ? translate('taskSectionCompleted')
                  : translate('taskSectionIncomplete')}
              </Text>
            </View>
          }
          subtitleStyle={{ marginLeft: '2%', marginVertical: '1%' }}
        />
        <Card.Content>
          <View style={{ marginHorizontal: '2%', justifyContent: 'center' }}>
            <Text style={styles.parentTitle}>{translate('taskSectionFromTaskList')}</Text>
            <Text
              style={[styles.parentTitle, { top: '1%' }]}
            >{`${parentTaskList?.name}`}</Text>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
};

export default SectionTaskView;

const styles = StyleSheet.create({
  container: {
    margin: '.5%',
    borderColor: 'grey',
    borderBottomEndRadius: 2,
  },
  card: {
    padding: '1%',
    width: '98%',
  },
  title: {
    textAlign: 'left',
    fontSize: 18,
    fontWeight: '700',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    flexWrap: 'wrap',
  },
  parentTitle: {
    textAlign: 'left',
    fontSize: 16,
    fontWeight: '700',
    color: 'grey',
    flexWrap: 'wrap',
  },
});
