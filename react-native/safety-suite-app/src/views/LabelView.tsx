import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { flatten } from 'lodash';
import Toast from 'react-native-toast-message';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { setContext } from '../../store/slices/contextSlice';
import { setOfflineQueue } from '../../store/slices/labelSlice';
import { platformIOS, showToast } from '../../utils/utils';
import LabelList from '../components/labels/LabelList';
import LabelListIphone from '../components/labels/iphone/LabelListIphone';
import { PATHSPOT_COLORS } from '../constants/constants';
import LabelHeader from '../components/headers/label-headers/LabelHeader';
import SearchBarIphoneView from '../components/labels/iphone/SearchBar';
import { printLabels } from '../../api/labels';
import { LabelOfflineQueue, State } from '../../store/types/store-types';
import BLEConnected from '../components/headers/label-headers/BLEConnected';
import { LabelViewToastConfig } from '../../utils/components/config/Toast';
import ClearQuickFilter from '../components/headers/label-headers/ClearQuickFilters';
import { globalStyles } from '../../utils/styles';
import { windowWidth } from '../../utils/Dimensions';
import { usePrinters } from '../hooks/use-printers';
import { WifiConnected } from '../components/headers/label-headers/WifiConnected';
import Loading from '../../utils/components/Loading';
import { LabelProvider, useLabels } from '../hooks/use-labels';
import { ToastTypes } from '../types/app';
import OfflineWatermark from '../components/OfflineWatermark';
import { translate } from '../data/translations';

const TopLabelTabs = createMaterialTopTabNavigator();

const LabelView = () => {
  const labelOfflineQueue = useSelector((state: State) => state.labels.offlineQueue);
  const contextState = useSelector((state: State) => state.context);
  const dispatch = useDispatch();

  const [{ tabbedPhases, getLabelsForPhase, isLoading }, { fetch }] = useLabels();

  useFocusEffect(
    useCallback(() => {
      const contextPayload = { context: 'Labels' };
      dispatch(setContext(contextPayload));
      fetch().catch((e) => console.error('Error fetching labels', e));
    }, [dispatch, fetch])
  );

  useEffect(() => {
    if (isLoading) {
      showToast({ type: ToastTypes.INFO, txt1: translate('fetchingLabels') });
    }
  }, [isLoading]);

  /** handle offline queue for label on ipad and iphone */
  const handleOfflineLabelQueue = useCallback(
    async (labelQueue: LabelOfflineQueue[]) => {
      if (!labelQueue.length) {
        return;
      }
      const queue = await Promise.all(
        labelQueue.map(async (queueAction) => {
          const { type, params } = queueAction;

          if (!params) {
            return [];
          }

          if (!contextState.online) {
            return [queueAction];
          }

          switch (type) {
            case 'printLabels': {
              await printLabels(params);
              return [];
            }

            default:
              return [];
          }
        })
      );

      // set queue to whatever wasnt processed
      dispatch(setOfflineQueue({ queue: flatten(queue) }));
    },
    [contextState.online, dispatch]
  );

  useEffect(() => {
    if (labelOfflineQueue.length && contextState.online) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleOfflineLabelQueue(labelOfflineQueue);
    }
  }, [labelOfflineQueue, contextState.online, handleOfflineLabelQueue]);

  // We are hardcoding for now
  const dontSubtract =
    contextState.customerId !== null && [1144,1150,1625,1629,1630,1631,1619,1692].includes(contextState.customerId);

  return platformIOS.isPad ? (
    <>
      <OfflineWatermark />

      {tabbedPhases.length ? (
        <TopLabelTabs.Navigator
          screenOptions={{
            tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
            tabBarItemStyle: {
              width:
                tabbedPhases.length > 0 ? windowWidth / tabbedPhases.length : windowWidth,
            },
            tabBarStyle: { backgroundColor: 'white' },
            tabBarIndicatorStyle: {
              backgroundColor: tabbedPhases.length === 1 ? 'white' : '',
            },
          }}
        >
          {tabbedPhases.map((tab: string) => (
            <TopLabelTabs.Screen
              name={tab}
              children={() => (
                <LabelList
                  context={tab}
                  labels={getLabelsForPhase(tab)}
                  dontSubtract={dontSubtract}
                />
              )}
            />
          ))}
        </TopLabelTabs.Navigator>
      ) : (
        <View>
          <Loading />
        </View>
      )}
      <Toast />
    </>
  ) : (
    <View>
      <LabelListIphone />
    </View>
  );
};

const labelNavigator = createNativeStackNavigator();
const LabelNav = () => {
  const { isWifiEnabled } = usePrinters();

  return (
    <LabelProvider>
      <labelNavigator.Navigator
        // scrren options wont show because its wrapped in a nav already
        // takes header right from parent nav options
        screenOptions={() => ({
          headerStyle: {
            backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
          },
        })}
      >
        <labelNavigator.Screen
          navigationKey="Labels View"
          name="Labels View"
          component={LabelView}
          options={() => ({
            title: '',
            context: 'Labels',
            headerLeft: () => <SearchBarIphoneView />,
            headerRight: () => {
              return platformIOS.isPad ? (
                <View style={navStyles.iPadContainer}>
                  <LabelHeader />
                </View>
              ) : (
                <View style={navStyles.iPhoneContainer}>
                  <ClearQuickFilter />
                  {isWifiEnabled ? <WifiConnected /> : <BLEConnected />}
                </View>
              );
            },
          })}
        />
      </labelNavigator.Navigator>
    </LabelProvider>
  );
};

export default LabelNav;

const navStyles = StyleSheet.create({
  iPadContainer: {
    ...globalStyles.row,
    bottom: 10,
    left: 15,
    justifyContent: 'center',
  },
  iPhoneContainer: {
    flexDirection: 'row',
    bottom: 5,
    left: 5,
    gap: 2,
    flexShrink: 1,
    flexWrap: 'nowrap',
    maxWidth: '100%',
  },
});
