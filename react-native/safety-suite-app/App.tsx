import React, { FC, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { SWRConfig } from 'swr';

import { State } from './store/types/store-types';
import { mapUsersApiToUser, platformIOS } from './utils/utils';
import { fetchUsers } from './api/users';
import { setUsersList } from './store/slices/userSlice';
import { ApiJobs, Location, User } from './src/types/app';
import { setLocations, setOnline, setRoles } from './store/slices/contextSlice';
import { RegisterDevice } from './src/components/auth/RegisterDevice';
import { getJobs, mapApiJobs } from './api/jobs';
import { IpadToastConfig, iphoneListToastConfig } from './utils/components/config/Toast';
import HeaderLogo from './src/components/headers/global-headers/HeaderLogo';
import HeaderLeft from './src/components/headers/HeaderLeft';
import LocationHeader from './src/components/headers/global-headers/LocationHeader';
import BottomTabBar, { TabParamList } from './src/views/BottomTabBar';
import { PATHSPOT_COLORS } from './src/constants/constants';
import Login from './src/components/auth/Login';
import { PrintersProvider } from './src/hooks/use-printers';
import { ApiResponse } from './api/constants';
import { setTemperatureMigrated } from './store/slices/FeatureFlagSlice';
import OfflineStatusBar from './src/components/OfflineStatusBar';

export type RootStackParamList = {
  Login: undefined;
  BottomTabNav: BottomTabScreenProps<TabParamList>;
  RegisterDevice: undefined;
};

// https://reactnavigation.org/docs/typescript/#specifying-default-types-for-usenavigation-link-ref-etc
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const AppNav = createNativeStackNavigator<RootStackParamList>();

// Define header components outside render to prevent recreation on every render
const AppHeaderTitle = () => <HeaderLogo />;
const AppHeaderLeft = () => <HeaderLeft />;
const AppHeaderRight = () => <LocationHeader />;

const BottomTabNav = (props: RootStackParamList['BottomTabNav']) => {
  return (
    <PrintersProvider>
      <BottomTabBar {...props} />
    </PrintersProvider>
  );
};

const App: FC = () => {
  const contextState = useSelector((state: State) => state.context);
  const userState = useSelector((state: State) => state.user);

  const isUserInactive = useSelector(
    (state: State) => state.userInteraction.isUserInactive
  );
  const navigation = useNavigation();

  const dispatch = useDispatch();

  const handleLastInteraction = useCallback(() => {
    if (isUserInactive) {
      if (!contextState.deviceId) {
        navigation.navigate('RegisterDevice');
      } else {
        navigation.navigate('Login');
      }
    }
  }, [contextState.deviceId, isUserInactive, navigation]);

  useEffect(() => {
    //event listener for user interaction && sessions
    const userActionIntervalId = setInterval(handleLastInteraction, 15000);
    return () => {
      clearInterval(userActionIntervalId);
    };
  }, [handleLastInteraction]);

  const setUsers = () => {
    if (contextState.online && contextState.customerId) {
      fetchUsers(contextState.customerId, false)
        .then((res) => {
          const { status, data } = res;

          if (status === 200) {
            const users: User[] = mapUsersApiToUser(data ?? []);

            dispatch(
              setTemperatureMigrated({
                temperaturesMigrated: true,
              })
            );

            const seenLocations = new Set<number>();
            const locations: Location[] = [];
            users.forEach((user: User) => {
              Object.entries(user.locations).forEach((key) => {
                const [, location] = key;

                if (!seenLocations.has(location.locationId)) {
                  locations.push(location);
                  seenLocations.add(location.locationId);
                }
              });
            });
            // set locations for apps to access
            const locationsPayload = { locations: locations };
            dispatch(setLocations(locationsPayload));

            // set all users for app
            const usersPayload = { users: users };
            dispatch(setUsersList(usersPayload));
          }
        })
        .catch((e) => {
          console.error('Failed to fetch users', e);
        });
    }
  };

  useEffect(() => {
    setUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only running on mount
  }, []);

  useEffect(() => {
    const networkSubscription = NetInfo.addEventListener((netInfo) => {
      const isOnline = !!(netInfo.isConnected && netInfo.isInternetReachable);
      dispatch(setOnline({ online: isOnline }));
    });

    return () => {
      networkSubscription();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!contextState.deviceId) {
      navigation.navigate('RegisterDevice');
    } else {
      navigation.navigate('Login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only running on mount
  }, []);

  const setContextRoles = useCallback(() => {
    const params = {
      locationId: contextState.locationId,
      customerId: contextState.customerId,
      deviceId: contextState.deviceId,
      userId: userState.currUser?.id,
    };

    if (!contextState.customerId || !userState.currUser?.id) {
      return;
    }

    getJobs(params)
      .then((res: ApiResponse<ApiJobs[]>) => {
        if (res.status === 200) {
          const mappedRoles = mapApiJobs(res.data || []);
          const payload = { roles: mappedRoles };
          // set jobs in context
          dispatch(setRoles(payload));
        }
      })
      .catch((e) => {
        console.error('Failed to fetch jobs', e);
      });
  }, [
    dispatch,
    contextState.customerId,
    contextState.locationId,
    contextState.deviceId,
    userState.currUser,
  ]);

  useEffect(() => {
    if (contextState.roles.length === 0) {
      setContextRoles();
    }
  }, [contextState.roles, setContextRoles]);

  return (
    <SWRConfig
      value={{
        provider: () => {
          return new Map();
        },
        isOnline: () => {
          return contextState.online;
        },
        initReconnect: (callback) => {
          const networkSubscription = NetInfo.addEventListener((netInfo) => {
            if (netInfo.isConnected && netInfo.isInternetReachable) {
              callback();
            }
          });
          return () => {
            networkSubscription();
          };
        },
        isVisible: () => {
          return true;
        },
        initFocus: (callback) => {
          let appState = AppState.currentState;

          const onAppStateChange = (nextAppState: AppStateStatus) => {
            /* If it's resuming from background or inactive mode to active one */
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
              callback();
            }
            appState = nextAppState;
          };

          // Subscribe to the app state change events
          const subscription = AppState.addEventListener('change', onAppStateChange);

          return () => {
            subscription.remove();
          };
        },
      }}
    >
      {!platformIOS.isPad && <OfflineStatusBar />}

      <AppNav.Navigator
        screenOptions={{
          headerTitle: AppHeaderTitle,
          headerLeft: AppHeaderLeft,
          headerRight: AppHeaderRight,
          headerStyle: {
            backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
          },
        }}
        initialRouteName="BottomTabNav"
      >
        <AppNav.Screen name={'BottomTabNav'} component={BottomTabNav} />

        <AppNav.Screen
          name={'Login'}
          component={Login}
          options={{
            header: () => null,
          }}
        />

        <AppNav.Screen
          name={'RegisterDevice'}
          component={RegisterDevice}
          options={{
            gestureEnabled: false,
            header: () => null,
          }}
        />
      </AppNav.Navigator>

      <Toast config={platformIOS.isPad ? IpadToastConfig : iphoneListToastConfig} />
    </SWRConfig>
  );
};

export default App;
