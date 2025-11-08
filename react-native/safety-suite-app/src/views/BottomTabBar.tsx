import React, { useRef, useCallback, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import { BOTTOM_TAB_HEIGHT } from '../constants/constants';

import { PATHSPOT_COLORS } from '../constants/constants';
import { platformIOS } from '../../utils/utils';
import TaskNav, { TaskNavList } from './TasksHome';
import NotesNav, { NotesNavList } from './Notes';
import SettingsNav, { SettingsNavList } from './Settings';
import LabelNav from './LabelView';
import HeaderLogo from '../components/headers/global-headers/HeaderLogo';
import HeaderLeft from '../components/headers/HeaderLeft';
import LabelHeader from '../components/headers/label-headers/LabelHeader';
import { State } from '../../store/types/store-types';
import { AppAccess, Location } from '../types/app';
import Loading from '../../utils/components/Loading';
import { RootStackParamList } from '../../App';
import { DigitalPrep } from './DigitalPrep';
import { translate } from '../data/translations';
import Home from '../views/Home'

export type TabParamList = {
  Tasks: NativeStackScreenProps<TaskNavList>;
  Settings: NativeStackScreenProps<SettingsNavList>;
  Notes: NativeStackScreenProps<NotesNavList>;
  Labels: undefined;
  Home: undefined;
  DigitalPrep: undefined;
};

// main navigation - to flip between pages easily
const Tab = createBottomTabNavigator<TabParamList>();

// def app access for users with no perms
// notes is the current default page bc
// it is functioning as our FAQ page for users
const defAppAccess: AppAccess = {
  notes: true,
  tasks: null,
  labels: null,
  devices: null,
  users: null,
  reports: null,
  messages: null,
  settings: null,
  digitalprep: null,
};

const BottomTabBar = (props: RootStackParamList['BottomTabNav']) => {
  const { navigation } = props;

  const userState = useSelector((state: State) => state.user);
  const contextState = useSelector((state: State) => state.context);

  // for now, if there is no app access permissions available
  // let's assign this to be initAppAccess
  // to only show the notes pages, bc rn it is the FAQ page
  // but we should have a no access available | home page
  const [appAccess, setAppAccess] = useState<AppAccess | null>(null);

  const delayedNav = useRef(
    debounce((screen: keyof TabParamList) => {
      navigation.navigate(screen as never);
    }, 500)
  );

  const getInitialScreen = useCallback(
    (localAppAccess: AppAccess) => {
      let initScreen: keyof TabParamList = 'Notes'; // default screen for now
      const prevScreen = contextState.prevContext || '';

      if (prevScreen === 'Labels' && localAppAccess.labels) {
        initScreen = 'Labels';
      } else if (prevScreen === 'DigitalPrep' && localAppAccess.digitalprep) {
        initScreen = 'DigitalPrep';
      } else if (prevScreen === 'Notes' && localAppAccess.notes) {
        initScreen = 'Notes';
      } else if (prevScreen.includes('Task') && localAppAccess.tasks) {
        initScreen = 'Tasks';
      } else if (prevScreen === 'Settings' && localAppAccess.settings) {
        initScreen = 'Settings';
      }

      delayedNav.current(initScreen);
    },
    [contextState.prevContext]
  );

  const handleAppAccess = useCallback(
    (initNav?: boolean) => {
      const currUserLocations: Location[] = userState.currUser?.locations || [];
      const currLocationId: number | null = contextState.locationId;
      const currLocation: Location | undefined = currUserLocations.find(
        (location: Location) => location.locationId === currLocationId
      );

      if (currLocation?.permissions.appAccess) {
        const availableApps: AppAccess | undefined = currLocation.permissions.appAccess;
        setAppAccess(availableApps);
        if (initNav == null || initNav) {
          getInitialScreen(availableApps);
        }
      } else {
        setAppAccess(defAppAccess);
      }
    },
    [contextState.locationId, getInitialScreen, userState.currUser]
  );

  useEffect(() => {
    handleAppAccess(false);
  }, [handleAppAccess, userState.currUser?.id, contextState.locationId]);

  // load screen while app access is initialized
  useFocusEffect(
    useCallback(() => {
      handleAppAccess(false);
    }, [handleAppAccess])
  );

  return (
    <>
      {!appAccess ? (
        <View style={StyleSheet.absoluteFill}>
          <Loading {...({ fetching: true } as any)} />
        </View>
      ) : (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarActiveBackgroundColor: PATHSPOT_COLORS.PATHSPOT_TEAL,
            tabBarInactiveBackgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
            tabBarLabelStyle: {
              fontSize: platformIOS.isPad ? 14 : 12,
              fontWeight: 'bold',
              color: 'white',
              justifyContent: 'center',
              textAlign: 'center',
              marginBottom: platformIOS.isPad ? 1 : 0,
              paddingBottom: platformIOS.isPad ? 3 : 0,
              marginStart: 0,
            },
            tabBarInactiveTintColor: 'grey',
            tabBarActiveTintColor: 'white',
            tabBarItemStyle: {
              flexDirection: 'column',
              textAlign: 'center',
              height: 65,
              paddingBottom: 9,
              padding: 5,
              justifyContent: 'center',
            },
            tabBarIconStyle: {
              flex: 1,
              justifyContent: 'center',
            },
            tabBarStyle: {
              backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
              height: BOTTOM_TAB_HEIGHT
            },
            tabBarIcon: ({ color, size }) => {
              switch (route.name) {
                case 'Labels':
                  return <Ionicons name="print-outline" size={size} color={color} />;
                case 'DigitalPrep':
                  return (
                    <MaterialCommunityIcons
                      name="table-clock"
                      size={size}
                      color={color}
                    />
                  );
                case 'Settings':
                  return <Ionicons name="settings" size={size} color={color} />;
                case 'Home':
                  return <Ionicons name="home" size={size} color={color} />;
                case 'Tasks':
                  return <Ionicons name="ios-checkbox" size={size} color={color} />;
                case 'Notes':
                  return <Ionicons name="pencil" size={size} color={color} />;
              }
            },
            headerBackVisible: false,
          })}
        >
          {appAccess.reports ? (
            <Tab.Screen
              key="Home"
              name="Home"
              options={{
                headerStyle: {
                  backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
                },
                headerTitle: () => (
                  <View>
                    <HeaderLogo />
                  </View>
                ),
                headerLeft: () => (
                  <View style={styles.headerLeft}>
                    <HeaderLeft />
                  </View>
                ),
                headerRight: () => <LabelHeader />,
                tabBarInactiveBackgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
                title: translate('bottomNavHome'),
                headerShown: false,
              }}
              component={Home}
            />
          ) : null}
          {appAccess.labels ? (
            <Tab.Screen
              key="Labels"
              name="Labels"
              options={{
                headerStyle: {
                  backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
                },
                headerTitle: () => (
                  <View>
                    <HeaderLogo />
                  </View>
                ),
                headerLeft: () => (
                  <View style={styles.headerLeft}>
                    <HeaderLeft />
                  </View>
                ),
                headerRight: () => <LabelHeader />,
                tabBarInactiveBackgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
                title: translate('bottomNavLabels'),
                headerShown: false,
              }}
              component={LabelNav}
            />
          ) : null}

          {appAccess.digitalprep ? (
            <Tab.Screen
              key="DigitalPrep"
              name="DigitalPrep"
              component={DigitalPrep}
              options={{
                headerShown: false,
                title: translate('bottomNavDigiPrep'),
              }}
            />
          ) : null}

          {appAccess.notes ? (
            <Tab.Screen
              name="Notes"
              options={{
                headerShown: false,
                title: translate('bottomNavNotes')
              }}
              children={() => <NotesNav />}
            />
          ) : null}

          {appAccess.tasks ? (
            <Tab.Screen
              name="Tasks"
              options={{
                headerShown: false,
                title: translate('bottomNavTasks'),
              }}
              children={() => <TaskNav />}
            />
          ) : null}

          <Tab.Screen
            name="Settings"
            children={() => <SettingsNav />}
            options={{
              title: translate('bottomNavSettings'),
              headerShown: false,
            }}
          />
        </Tab.Navigator>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  headerLeft: { left: platformIOS.isPad ? 0 : 35 },
});

export default BottomTabBar;
