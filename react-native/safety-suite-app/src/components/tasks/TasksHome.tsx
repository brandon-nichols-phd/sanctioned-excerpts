import React, { FC, useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, Surface } from 'react-native-paper';

import { setContext } from '../../../store/slices/contextSlice';
import { TaskList as TaskListComponent } from '../../components/tasks/TaskList';
import { TaskContext, TaskList, TaskSectionData } from '../../data/task';
import { State, TaskFilterTypes, StatusFilters } from '../../../store/types/store-types';
import { setTaskFilters } from '../../../store/slices/taskSlice';
import { platformIOS } from '../../../utils/utils';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { globalStyles } from '../../../utils/styles';
import TaskNextStep from '../../components/tasks/overview/TaskNextStep';
import {
  checklistComplete,
  checklistFlagged,
  checklistOpen,
  isChecklistLate,
  isTaskLocked,
  taskIsAvailable,
} from '../../../utils/task-utils';
import FilterBar from '../../components/tasks/FilterBar';
import Loading from '../../../utils/components/Loading';
import TaskFilters from '../../components/headers/tasks-headers/TaskFilters';
import TaskSort from '../../components/headers/tasks-headers/TaskSort';
import { isIphoneSe } from '../../../utils/Platform';
import { useTasks } from '../../hooks/use-tasks';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { translate } from '../../data/translations';
import OfflineWatermark from '../OfflineWatermark';

type IconGruopProps = {
  title: string;
  filter: StatusFilters;
  icon: string;
  count: number | string;
  size: number;
  fontSize: number;
  iconSelected: StatusFilters;
  handleIconSelected: (icon: StatusFilters) => void;
  color?: string;
};

const IconGroup: FC<IconGruopProps> = ({
  title,
  filter,
  icon,
  count,
  size,
  color,
  fontSize,
  iconSelected,
  handleIconSelected,
}) => {
  return (
    <Pressable
      style={[
        globalStyles.column,
        {
          marginHorizontal: platformIOS.isPad ? '2%' : '1.5%',
          alignItems: 'center',
          left: 5,
        },
      ]}
      onPress={() => {
        handleIconSelected(filter);
      }}
    >
      <IconButton
        icon={icon}
        iconColor={iconSelected === filter ? color : 'white'}
        size={size ? size : 20}
      />
      {platformIOS.isPad ? (
        <Text
          style={{
            color: iconSelected === filter ? color : 'white',
            fontSize: fontSize ? fontSize : 15,
            fontWeight: '600',
          }}
        >
          {count + ' ' + title}
        </Text>
      ) : (
        <View style={[globalStyles.column, { justifyContent: 'center' }]}>
          <Text
            style={{
              color: iconSelected === filter ? color : 'white',
              fontSize: fontSize ? fontSize : 15,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {count}
          </Text>
          <Text
            style={{
              color: iconSelected === filter ? color : 'white',
              fontSize: fontSize ? fontSize : 15,
              fontWeight: '600',
            }}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

type OverviewSectionProps = {
  taskList: TaskList[];
  setIconCount: (count: number) => void;
  loading: boolean;
  iconSelected: StatusFilters;
  handleIconSelected: (icon: StatusFilters) => void;
};

const OverviewSection = ({
  taskList,
  setIconCount,
  iconSelected,
  handleIconSelected,
}: OverviewSectionProps) => {
  const [completed, setCompleted] = useState<number>(0);
  const [late, setLate] = useState<number>(0);
  const [flagged, setFlagged] = useState<number>(0);
  const [open, setOpen] = useState<number>(0);
  const [locked, setLocked] = useState<number>(0);

  const init = useCallback(() => {
    let completed = 0;
    let overdue = 0;
    let flagged = 0;
    let remaining = 0;
    let locked = 0;

    //  dont add any twice
    taskList.forEach((task) => {
      const passedLockedTime = task.config.lockedTime
        ? isTaskLocked(task.config.lockedTime)
        : false;

      const notAvailableYet = task.config.startTime
        ? !taskIsAvailable(task.config.startTime)
        : false;

      const isLocked = passedLockedTime || notAvailableYet;

      if (isLocked) {
        locked += 1;
      }

      const isLate = isChecklistLate(task);

      if (isLate && !passedLockedTime) {
        overdue += 1;
      }

      if (checklistFlagged(task)) {
        flagged += 1;
      }

      const checklistCompleted = checklistComplete(task);
      if (checklistCompleted) {
        completed += 1;
      }

      const isOpen = checklistOpen(task);
      if (isOpen && !isLocked && !checklistCompleted) {
        remaining += 1;
      }
    });

    setCompleted(completed);
    setLate(overdue);
    setFlagged(flagged);
    setOpen(remaining);
    setLocked(locked);

    let iconcount = 0;
    iconcount += completed > 0 ? 1 : 0;
    iconcount += overdue > 0 ? 1 : 0;
    iconcount += flagged > 0 ? 1 : 0;
    iconcount += remaining > 0 ? 1 : 0;
    iconcount += locked > 0 ? 1 : 0;

    setIconCount(iconcount);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- too many rerenders with loading included
  }, [taskList]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <View
      style={[
        globalStyles.row,
        {
          width: platformIOS.isPad ? '95%' : '70%',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          marginHorizontal: '.5%',
          paddingHorizontal: '2%',
        },
      ]}
    >
      <IconGroup
        title={translate('taskFilterIconCompleted')}
        filter={'Completed'}
        icon={'check-outline'}
        count={completed}
        size={platformIOS.isPad ? 35 : 20}
        fontSize={platformIOS.isPad ? 17 : 15}
        color={PATHSPOT_COLORS.PATHSPOT_BRIGHT_GREEN}
        iconSelected={iconSelected}
        handleIconSelected={handleIconSelected}
      />

      <IconGroup
        title={translate('taskFilterIconOpen')}
        filter={'Open'}
        icon={'lock-open-variant'}
        count={open}
        size={platformIOS.isPad ? 35 : 20}
        fontSize={platformIOS.isPad ? 17 : 15}
        color={'#6fa8c8'}
        iconSelected={iconSelected}
        handleIconSelected={handleIconSelected}
      />

      <IconGroup
        title={translate('taskFilterIconLate')}
        filter={'Late'}
        icon={'alert'}
        count={late}
        size={platformIOS.isPad ? 35 : 20}
        fontSize={platformIOS.isPad ? 17 : 15}
        color={PATHSPOT_COLORS.PATHSPOT_RED}
        iconSelected={iconSelected}
        handleIconSelected={handleIconSelected}
      />

      <IconGroup
        title={translate('taskFilterIconFlagged')}
        filter={'Flagged'}
        icon={'flag'}
        count={flagged}
        size={platformIOS.isPad ? 35 : 20}
        fontSize={platformIOS.isPad ? 17 : 15}
        color={PATHSPOT_COLORS.PATHPOT_ORANGE}
        iconSelected={iconSelected}
        handleIconSelected={handleIconSelected}
      />

      <IconGroup
        title={translate('taskFilterIconLocked')}
        filter={'Locked'}
        icon={'lock'}
        count={locked}
        size={platformIOS.isPad ? 35 : 20}
        fontSize={platformIOS.isPad ? 17 : 15}
        color={PATHSPOT_COLORS.PATHSPOT_GREY}
        iconSelected={iconSelected}
        handleIconSelected={handleIconSelected}
      />
    </View>
  );
};

type IphoneViewProps = {
  overViewTitle: string;
  nextTask: TaskList | null;
  iconCount: any;
  taskList: TaskList[];
  overviewTasks: TaskList[];
  viewScheduledTasks: any;
  setIconCount: (count: number) => void;
  handleNavigation: (context: string) => void;
  loading: boolean;
  showFilter: boolean;
  showSortOptions: boolean;
  iconSelected: StatusFilters;
  handleIconSelected: (icon: StatusFilters) => void;
};

const IphoneView = ({
  overViewTitle,
  nextTask,
  overviewTasks,
  viewScheduledTasks,
  setIconCount,
  handleNavigation,
  loading,
  showFilter,
  showSortOptions,
  iconSelected,
  handleIconSelected,
}: IphoneViewProps) => {
  return (
    <View
      style={{
        justifyContent: 'center',
        backgroundColor: '#6fa8c8',
        height: '100%',
      }}
    >
      {loading ? (
        <Modal transparent={true} animationType="none" visible={loading}>
          <Loading color={'white'} />
        </Modal>
      ) : null}
      <View
        style={{
          flex: platformIOS.isPad ? 2.75 : isIphoneSe ? 1.5 : 1,
          backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
          borderBottomEndRadius: 12,
          borderBottomLeftRadius: 12,
          paddingBottom: '7%',
        }}
      >
        <View style={{ marginVertical: platformIOS.isPad ? windowHeight * 0.1 : '5%' }}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 20,
              fontWeight: '600',
              color: PATHSPOT_COLORS.PATHSPOT_BRIGHT_GREEN,
            }}
          >
            {overViewTitle}
          </Text>
        </View>

        <View
          style={[
            globalStyles.row,
            { marginHorizontal: '3%', justifyContent: 'space-between' },
          ]}
        >
          <Text
            style={{
              textAlign: 'left',
              color: 'white',
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            {nextTask ? translate('taskNextTask') : translate('taskTask')}
          </Text>

          <Pressable
            onPress={() => handleNavigation(TaskContext.TASK_LIST)}
            style={{ marginRight: '1%' }}
          >
            <Text
              style={{
                color: 'white',
                fontWeight: '600',
                fontSize: platformIOS.isPad ? 20 : 18,
              }}
            >
              {translate('taskSeeAll')}
            </Text>
          </Pressable>
        </View>

        {/* next task if available */}
        <View style={{ margin: '2%' }}>
          {nextTask ? <TaskNextStep task={nextTask} /> : null}
        </View>

        {/* small overview - completed, flagged, and next ?? */}
        <View style={{ width: '100%', marginHorizontal: '5%' }}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginHorizontal: '2%',
              marginTop: platformIOS.isPad ? 0 : '2%',
            }}
          >
            <Text
              style={{
                color: 'white',
                fontWeight: '600',
                fontSize: platformIOS.isPad ? 20 : 16,
              }}
            >
              {translate('taskTaskStatusFilters')}
            </Text>
          </View>

          {/* icon overivew wit available task */}
          <View
            style={{
              alignSelf: 'center',
            }}
          >
            <OverviewSection
              taskList={overviewTasks}
              setIconCount={setIconCount}
              loading={loading}
              iconSelected={iconSelected}
              handleIconSelected={handleIconSelected}
            />
          </View>
        </View>
      </View>

      {/* recurring tasks + task list */}

      <View
        style={[
          globalStyles.row,
          {
            flex: platformIOS.isPad ? 1.35 : 0.7,
            justifyContent: viewScheduledTasks && 'center',
            marginHorizontal: '5%',
            marginTop: platformIOS.isPad ? '0%' : '10%',
            alignSelf: 'center',
          },
        ]}
      >
        {viewScheduledTasks ? (
          <Pressable
            style={[
              globalStyles.column,
              { width: 170, height: 170, marginHorizontal: '2%' },
            ]}
            onPress={() => handleNavigation(TaskContext.RECURRING_LIST)}
          >
            <Surface
              style={{
                borderRadius: 15,
                width: '100%',
                height: '90%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <IconButton icon="clock" size={45} />
              <Text>{translate('taskScheduledTasks')}</Text>
            </Surface>
          </Pressable>
        ) : null}
      </View>

      {/* filtering and sorting modals */}
      {showFilter && !showSortOptions ? (
        <View>
          <TaskFilters showFilter={showFilter} />
        </View>
      ) : null}

      {showSortOptions && !showFilter ? (
        <View>
          <TaskSort show={showSortOptions} />
        </View>
      ) : null}
    </View>
  );
};

type IpadViewProps = {
  overViewTitle: string;
  nextTask: TaskList | null;
  iconCount: number;
  hasSearch: boolean;
  sectionList: TaskSectionData[];
  taskList: TaskList[];
  overviewTasks: TaskList[];
  selectedTask: TaskList | null;
  viewScheduledTasks: boolean;
  loading: boolean;
  showFilter: boolean;
  showSortOptions: boolean;
  iconSelected: StatusFilters;
  bottomTabContext: string;
  setIconCount: (count: number) => void;
  handleNavigation: (context: string) => void;
  handleIconSelected: (icon: StatusFilters) => void;
};

const IpadView = ({
  selectedTask,
  overViewTitle,
  nextTask,
  taskList,
  overviewTasks,
  iconCount,
  setIconCount,
  viewScheduledTasks,
  handleNavigation,
  loading,
  showFilter,
  showSortOptions,
  iconSelected,
  handleIconSelected,
  bottomTabContext,
  hasSearch,
  sectionList,
}: IpadViewProps) => {
  return (
    <View style={ipadViewStyles.container}>
      <View style={ipadViewStyles.subContainer}>
        {loading ? (
          <Modal transparent={true} animationType="none" visible={loading}>
            <Loading color={'white'} />
          </Modal>
        ) : null}
        <View style={[globalStyles.column, { width: '60%' }]}>
          <View
            style={{
              backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
              paddingBottom: '5%',
              paddingHorizontal: '2%',
              borderBottomEndRadius: 20,
              borderBottomLeftRadius: 20,
            }}
          >
            <View style={{ marginVertical: '2%' }}>
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: '600',
                  color: PATHSPOT_COLORS.PATHSPOT_BRIGHT_GREEN,
                }}
              >
                {overViewTitle}
              </Text>
            </View>

            <View
              style={[
                globalStyles.row,
                {
                  marginHorizontal: '3%',
                  justifyContent: 'space-between',
                  alignContent: 'center',
                },
              ]}
            >
              <Text
                style={{
                  textAlign: 'left',
                  color: 'white',
                  fontSize: 20,
                  fontWeight: '600',
                }}
              >
                {nextTask ? translate('taskNextTask') : translate('taskNoNextTask')}
              </Text>

              <Pressable onPress={() => handleNavigation(TaskContext.TASK_LIST)}>
                <Text
                  style={{
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: 20,
                  }}
                >
                  {translate('taskSeeAll')}
                </Text>
              </Pressable>
            </View>

            {/* next task if available */}
            <View style={{ margin: '2%' }}>
              {nextTask ? <TaskNextStep task={nextTask} /> : null}
            </View>

            <View style={{ width: '90%', marginHorizontal: '2%' }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginHorizontal: '2%',
                  marginTop: platformIOS.isPad ? 0 : '2%',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: platformIOS.isPad ? 20 : 16,
                  }}
                >
                  {translate('taskTaskStatusFilters')}
                </Text>
              </View>
            </View>

            {/* icon overivew with next available task */}
            <View
              style={{
                width: windowWidth * 0.8,
                marginLeft: iconCount > 2 ? '2%' : '3%',
                justifyContent: 'center',
                alignSelf: 'center',
              }}
            >
              <OverviewSection
                taskList={overviewTasks}
                setIconCount={setIconCount}
                loading={loading}
                iconSelected={iconSelected}
                handleIconSelected={handleIconSelected}
              />
            </View>
          </View>

          <View
            style={[
              globalStyles.row,
              {
                justifyContent: 'space-between',
                marginTop: '5%',
                alignSelf: 'center',
                backgroundColor: '#6fa8c8',
                width: '60%',
                height: '100%',
              },
            ]}
          >
            {viewScheduledTasks ? (
              <Pressable
                style={[
                  globalStyles.column,
                  { width: 170, height: 170, marginHorizontal: '2%', top: '15%' },
                ]}
                onPress={() => handleNavigation(TaskContext.RECURRING_LIST)}
              >
                <Surface
                  style={{
                    borderRadius: 15,
                    width: '100%',
                    height: '90%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <IconButton icon="clock" size={45} />
                  <Text>{translate('taskScheduledTasks')}</Text>
                </Surface>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Tasklist */}
        <View style={ipadViewStyles.taskListContainer}>
          <FilterBar />
          <TaskListComponent
            hasSearch={hasSearch}
            sectionList={sectionList}
            tasks={taskList}
            paddingBottom={'16%'}
            selected={selectedTask}
            bottomTabContext={bottomTabContext}
          />
        </View>
      </View>

      {/* bottom filtering sheet */}
      {showFilter && !showSortOptions ? (
        <View style={{ flex: 1 }}>
          <TaskFilters showFilter={showFilter} />
        </View>
      ) : null}

      {showSortOptions && !showFilter ? (
        <View style={{ flex: 1 }}>
          <TaskSort show={showSortOptions} />
        </View>
      ) : null}
    </View>
  );
};

const ipadViewStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    height: '100%',
  },
  subContainer: {
    justifyContent: 'space-between',
    backgroundColor: '#6fa8c8',
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
  },
  taskListContainer: { backgroundColor: 'white', width: '40%' },
});

export const TasksHome = () => {
  const [iconCount, setIconCount] = useState<number>(0);
  const [viewScheduledTasks, setViewScheduledTasks] = useState<boolean>(false);

  const dispatch = useDispatch();
  const navigation = useNavigation();

  const taskFilters = useSelector((state: State) => state.tasks.filters);
  const showBottomFilters = useSelector((state: State) => state.tasks.showBottomFilters);
  const showSortOptions = useSelector((state: State) => state.tasks.showSortOptions);
  const selectedTask = useSelector((state: State) => state.tasks.selected);
  const currUser = useSelector((state: State) => state.user.currUser);
  const contextState = useSelector((state: State) => state.context);
  const [isActive, setIsActive] = useState(true);

  const [
    { overviewTasks, tasks, nextTask, isLoading, hasSearch, sectionList },
    { fetchTasks },
  ] = useTasks();

  // icon filter selected
  const iconSelected = taskFilters.filter?.length ? taskFilters.filter[0] ?? '' : '';

  const handleIconSelected = useCallback(
    (icon: StatusFilters) => {
      const filter: StatusFilters =
        taskFilters.filter?.includes(icon) || iconSelected === icon ? '' : icon;

      dispatch(
        setTaskFilters({ type: TaskFilterTypes.FILTER, filter: filter ? [filter] : [] })
      );
    },
    [dispatch, iconSelected, taskFilters.filter]
  );

  useEffect(() => {
    if (currUser) {
      //  get perms for tasks config page
      const scheduledTasksPerms = false;

      setViewScheduledTasks(scheduledTasksPerms);
    }
  }, [currUser]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks().catch((e) => console.error('Fetch Tasks Error', e));
    }, [fetchTasks])
  );

  useFocusEffect(
    useCallback(() => {
      const payload = { context: 'Tasks Home' };
      dispatch(setContext(payload));
    }, [dispatch])
  );

  const handleNavigation = useCallback(
    (context: string) => {
      const navIndex: number | null = navigation.getState().index;

      // dont navigate to the new context more than once
      // curr context should always be the root index
      if (navIndex !== 0) {
        return;
      }

      if (context === 'see all' || context === TaskContext.TASK_LIST) {
        if (platformIOS.isPad) {
          navigation.push('Tasks View');
        } else {
          navigation.push('IphoneTaskView');
        }
      }
    },
    [navigation]
  );

  const overViewTitle = !overviewTasks.length
    ? translate('taskOverviewTitleEmpty')
    : translate('taskOverviewTitle');

  useEffect(() => {
    const onFocus = () => {
      setIsActive(true);
    };

    const onTransitionEnd = () => {
      navigation.removeListener('transitionEnd', onTransitionEnd);
      setIsActive(false);
    };

    const onBlur = () => {
      navigation.addListener('transitionEnd', onTransitionEnd);
    };

    const unsubscribeFocus = navigation.addListener('focus', onFocus);
    const unsubscribeBlur = navigation.addListener('blur', onBlur);

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  if (!isActive) {
    return null;
  }

  return platformIOS.isPad ? (
    <>
      <OfflineWatermark />
      <IpadView
        selectedTask={selectedTask}
        overViewTitle={overViewTitle}
        nextTask={nextTask}
        taskList={tasks}
        overviewTasks={overviewTasks}
        iconCount={iconCount}
        setIconCount={setIconCount}
        viewScheduledTasks={viewScheduledTasks}
        handleNavigation={handleNavigation}
        showFilter={showBottomFilters}
        showSortOptions={showSortOptions}
        iconSelected={iconSelected}
        handleIconSelected={handleIconSelected}
        loading={isLoading}
        bottomTabContext={contextState.bottomTabContext}
        hasSearch={hasSearch}
        sectionList={sectionList}
      />
    </>
  ) : (
    <IphoneView
      overViewTitle={overViewTitle}
      nextTask={nextTask}
      taskList={tasks}
      overviewTasks={overviewTasks}
      iconCount={iconCount}
      setIconCount={setIconCount}
      viewScheduledTasks={viewScheduledTasks}
      handleNavigation={handleNavigation}
      showFilter={showBottomFilters}
      showSortOptions={showSortOptions}
      iconSelected={iconSelected}
      handleIconSelected={handleIconSelected}
      loading={isLoading}
    />
  );
};
