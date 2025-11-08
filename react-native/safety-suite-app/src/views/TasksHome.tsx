import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { setContext } from '../../store/slices/contextSlice';
import Tasks from '../components/tasks/Tasks';
import { platformIOS } from '../../utils/utils';
import { PATHSPOT_COLORS } from '../constants/constants';
import ChecklistView from '../components/tasks/iphone-views/ChecklistView';
import TaskHeaderLeft from '../components/headers/tasks-headers/TasksHeaderLeft';
import AssignTask from '../components/tasks/AssignTask';
import TaskHeaderRight from '../components/headers/tasks-headers/TaskHeaderRight';
import IphoneTaskView from '../components/tasks/iphone-views/IphoneTaskView';
import { TasksProvider } from '../hooks/use-tasks';
import { TasksHome } from '../components/tasks/TasksHome';
import { ChecklistProvider } from '../hooks/use-checklist';
import ChecklistViewHeader from '../components/headers/tasks-headers/ChecklistViewHeader';
import { InkbirdBLEProvider } from '../hooks/use-inkbird-ble';
import { DishTempBLEProvider } from '../hooks/use-dish-temp-blue';

export type TaskNavList = {
  'Tasks Home': undefined;
  ChecklistView: undefined;
  IphoneTaskView: undefined;
  'Tasks View': undefined;
  'Assign Task': undefined;
};

const TaskNavStack = createNativeStackNavigator<TaskNavList>();

const TaskNav = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const payload = { context: 'Tasks Home' };
    dispatch(setContext(payload));
  }, [dispatch]);

  const taskHomeScreenOptions = useMemo(
    () => ({
      title: '',
      headerRight: () => <TaskHeaderRight />,
      headerLeft: () => (platformIOS.isPad ? <TaskHeaderLeft /> : null),
    }),
    []
  );

  return (
    <InkbirdBLEProvider>
      <DishTempBLEProvider>
        <TasksProvider>
          <ChecklistProvider>
            <TaskNavStack.Navigator
              screenOptions={() => ({
                headerStyle: {
                  backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
                  alignContent: 'center',
                  alignSelf: 'center',
                },
              })}
              initialRouteName="Tasks Home"
            >
              <TaskNavStack.Screen
                name={'Tasks Home'}
                component={TasksHome}
                options={taskHomeScreenOptions}
              />

              <TaskNavStack.Screen
                navigationKey="ChecklistView"
                name="ChecklistView"
                component={ChecklistView}
                options={{
                  title: '',
                  headerTitleStyle: { color: 'white' },
                  headerStyle: { backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE },
                  headerRight: () => <ChecklistViewHeader />,
                }}
              />

              <TaskNavStack.Screen
                navigationKey="IphoneTaskView"
                name="IphoneTaskView"
                component={IphoneTaskView}
                options={{
                  title: '',
                  headerTitleStyle: { color: 'white' },
                  headerStyle: { backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE },
                  headerRight: () => <TaskHeaderRight />,
                  headerLeft: () => <TaskHeaderLeft />,
                }}
              />

              {/* ipad task view */}
              <TaskNavStack.Screen
                navigationKey="Tasks View"
                name="Tasks View"
                component={Tasks}
                options={{
                  title: '',
                  headerTitleStyle: {
                    color: 'white',
                    fontSize: platformIOS.isPad ? 20 : 18,
                  },
                  headerRight: () => <TaskHeaderRight />,
                  headerLeft: () => <TaskHeaderLeft />,
                }}
              />

              <TaskNavStack.Screen
                navigationKey="AssignTask"
                name="Assign Task"
                component={AssignTask}
                options={{
                  title: '',
                }}
              />
            </TaskNavStack.Navigator>
          </ChecklistProvider>
        </TasksProvider>
      </DishTempBLEProvider>
    </InkbirdBLEProvider>
  );
};

export default TaskNav;
