import React, { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';

import { setContext } from '../../store/slices/contextSlice';
import { PATHSPOT_COLORS } from '../constants/constants';
import Profile from '../components/settings/setting-screens/Profile';
import PrinterInfo from '../components/settings/setting-screens/PrinterInfo';
import UserManagement from '../components/settings/setting-screens/user-management/UserManagement';
import Devices from '../components/settings/setting-screens/Devices';
import { platformIOS } from '../../utils/utils';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VerticalLine } from '../../utils/components/Lines';
import EditUser from '../components/settings/setting-screens/user-management/EditUser';
import EditUserPin from '../components/settings/setting-screens/user-management/EditUserPin';
import AddUser from '../components/settings/setting-screens/user-management/new-user-screens/AddUser';
import { State } from '../../store/types/store-types';
import AppInfo from '../components/settings/setting-screens/AppInfo';
import { windowHeight, windowWidth } from '../../utils/Dimensions';
import { DeviceManagement } from '../components/settings/setting-screens/device-managment/DeviceManagement';
import { UserPreferences } from '../components/settings/setting-screens/UserPreferences';
import { DigitalPrepSettings } from '../components/settings/setting-screens/digital-prep';
import { translate } from '../data/translations';
import OfflineWatermark from '../components/OfflineWatermark';

type SettingItemProps = {
  route: keyof SettingsNavList;
  title: string;
  icon: string;
  open: keyof SettingsNavList | null;
  setOpen: Dispatch<SetStateAction<keyof SettingsNavList | null>>;
  navigation: NavigationProp<SettingsNavList>;
};
export const SettingItem = (props: SettingItemProps) => {
  const { route, title, icon, open, setOpen, navigation } = props;

  return (
    <View style={styles.settingItem}>
      <Pressable
        onPress={() => {
          setOpen(route);

          // For the iPhone we want to directly navigate to the component instead of rendering it in the current view.
          if (!platformIOS.isPad) {
            // @ts-expect-error The types don't seem to match nicely due to the library but this is correct
            navigation.navigate(route);
          }
        }}
      >
        <List.Item
          title={title}
          left={(props) => <List.Icon {...props} icon={icon} />}
          titleStyle={{
            fontWeight: 'bold',
            color:
              platformIOS.isPad && open === route
                ? PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE
                : 'black',
          }}
        />
      </Pressable>
    </View>
  );
};

export const Settings = () => {
  const [open, setOpen] = useState<keyof SettingsNavList | null>(
    platformIOS.isPad ? 'General' : null
  );

  const userState = useSelector((state: State) => state.user);
  const contextState = useSelector((state: State) => state.context);

  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp<SettingsNavList>>();

  const currentPermissions = useMemo(() => {
    const currLocationId = contextState.locationId;

    const currLocation = userState.currUser?.locations.find(
      (loc) => loc.locationId === currLocationId
    );
    return currLocation?.permissions ?? null;
  }, [userState.currUser, contextState.locationId]);

  const hasManageDevicePermissions = useMemo(() => {
    if (currentPermissions) {
      const manageDevices =
        currentPermissions.permissions.manageDevices ||
        currentPermissions.additionalPermissions?.manageDevices;
      return manageDevices || false;
    } else {
      return false;
    }
  }, [currentPermissions]);

  const hasManageUsersPermissions = useMemo(() => {
    if (currentPermissions) {
      return (
        currentPermissions.permissions.editUsers ||
        currentPermissions.permissions.createUsers ||
        currentPermissions.permissions.deleteUsers ||
        currentPermissions.additionalPermissions?.editUsers ||
        currentPermissions.additionalPermissions?.createUsers ||
        currentPermissions.additionalPermissions?.deleteUsers ||
        false
      );
    } else {
      return false;
    }
  }, [currentPermissions]);

  useFocusEffect(
    useCallback(() => {
      const payload = { context: 'Settings' };
      dispatch(setContext(payload));
    }, [dispatch])
  );

  return (
    <>
      {platformIOS.isPad && <OfflineWatermark />}
      <View style={styles.container}>
        <View style={styles.navContainer}>
          <SettingItem
            title={translate('settingsGeneralTitle')}
            route={'General'}
            icon={'information'}
            open={open}
            setOpen={setOpen}
            navigation={navigation}
          />

          <SettingItem
            title={translate('settingsProfileTitle')}
            route={'Profile'}
            icon={'account-circle'}
            open={open}
            setOpen={setOpen}
            navigation={navigation}
          />

          {/* COMMENTING OUT FOR NOW WHILE WE WORK ON THE FOUR PHASES OF PAT-1075 */}
          {/* {hasManageDevicePermissions ? (
            <SettingItem
              title={translate('settingsDevicesTitle')}
              route={'Devices'}
              icon={'tablet-cellphone'}
              open={open}
              setOpen={setOpen}
              navigation={navigation}
            />
          ) : null} */}

          {hasManageUsersPermissions ? (
            <SettingItem
              title={translate('settingsUsersTitle')}
              route={'Users'}
              icon={'account-plus'}
              open={open}
              setOpen={setOpen}
              navigation={navigation}
            />
          ) : null}

          {currentPermissions?.appAccess.digitalprep ? (
            <SettingItem
              title={translate('settingsDigiPrepTitle')}
              route={'DigitalPrep'}
              icon={'table-clock'}
              open={open}
              setOpen={setOpen}
              navigation={navigation}
            />
          ) : null}

          {currentPermissions?.appAccess.labels ? (
            <SettingItem
              title={translate('settingsPrinterTitle')}
              route={'Printer'}
              icon={'printer'}
              open={open}
              setOpen={setOpen}
              navigation={navigation}
            />
          ) : null}

          <SettingItem
            title={translate('settingsUserPreferencesTitle')}
            route={'User Preferences'}
            icon={'cog'}
            open={open}
            setOpen={setOpen}
            navigation={navigation}
          />
        </View>

        {platformIOS.isPad ? <VerticalLine height={'100%'} marginTop={0} /> : null}

        {platformIOS.isPad && (
          <View style={styles.settingPageContainer}>
            <View style={styles.forms}>
              {open === 'Profile' && <Profile />}
              {open === 'Printer' && <PrinterInfo />}
              {open === 'Devices' && <Devices />}
              {open === 'Users' && <UserManagement />}
              {open === 'General' && <AppInfo />}
              {open === 'User Preferences' && <UserPreferences />}
              {open === 'DigitalPrep' && <DigitalPrepSettings />}
            </View>
          </View>
        )}
      </View>
    </>
  );
};

export type SettingsNavList = {
  'Settings View': undefined;
  Profile: undefined;
  Printer: undefined;
  Devices: undefined;
  DeviceManagement: undefined;
  Users: undefined;
  AddUser: undefined;
  EditUser: { userId?: number };
  'Edit Pin': { editingUserId: number };
  General: undefined;
  'User Preferences': undefined;
  DigitalPrep: undefined;
};

const settingsNavigation = createNativeStackNavigator<SettingsNavList>();

const SettingsNav = () => {
  return (
    <settingsNavigation.Navigator
      screenOptions={() => ({
        headerStyle: {
          backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
          color: 'white',
        },
        headerTitleStyle: { color: 'white', fontSize: platformIOS.isPad ? 20 : 18 },
        headerTitle: () => null,
      })}
    >
      <settingsNavigation.Screen
        navigationKey="Settings View"
        name="Settings View"
        component={Settings}
        options={{
          title: '',
          headerTitle: () => null,
          headerRight: () => null,
        }}
      />

      <settingsNavigation.Screen
        navigationKey="DigitalPrep"
        name="DigitalPrep"
        component={DigitalPrepSettings}
      />

      <settingsNavigation.Screen
        navigationKey="Profile"
        name="Profile"
        component={Profile}
      />

      <settingsNavigation.Screen
        navigationKey="Printer"
        name="Printer"
        component={PrinterInfo}
      />

      <settingsNavigation.Group>
        <settingsNavigation.Screen
          navigationKey="Devices"
          name="Devices"
          component={Devices}
        />

        <settingsNavigation.Screen
          navigationKey="DeviceManagement"
          name="DeviceManagement"
          component={DeviceManagement}
          options={{
            title: '',
          }}
        />
      </settingsNavigation.Group>

      {/* user management nav group */}
      <settingsNavigation.Group>
        <settingsNavigation.Screen
          navigationKey="Users"
          name="Users"
          component={UserManagement}
          options={{
            title: '',
          }}
        />

        <settingsNavigation.Screen
          navigationKey="AddUser"
          name="AddUser"
          component={AddUser}
          options={{
            title: '',
            headerRight: () => null,
          }}
        />

        <settingsNavigation.Screen
          navigationKey="EditUser"
          name="EditUser"
          component={EditUser}
          options={{
            title: '',
          }}
        />

        <settingsNavigation.Screen
          navigationKey="Edit User Pin"
          name="Edit Pin"
          component={EditUserPin}
          options={{
            title: '',
          }}
        />

        <settingsNavigation.Screen
          navigationKey="General"
          name="General"
          component={AppInfo}
          options={{
            title: '',
          }}
        />

        <settingsNavigation.Screen
          navigationKey="User Preferences"
          name="User Preferences"
          component={UserPreferences}
          options={{
            title: '',
          }}
        />
      </settingsNavigation.Group>
    </settingsNavigation.Navigator>
  );
};
export default SettingsNav;

const containerWidth: number = windowWidth * 0.75;
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: windowWidth,
    height: windowHeight,
    backgroundColor: 'white',
  },
  navContainer: {
    flex: 0.66,
    width: containerWidth,
    height: windowHeight,
    backgroundColor: 'white',
    paddingVertical: 3,
    marginBottom: 1,
    padding: 1,
  },
  settingItem: {
    width: platformIOS.isPad ? windowWidth - containerWidth : windowWidth,
    height: platformIOS.isPad ? 68 : 55,
    backgroundColor: 'white',
    borderBottomColor: '#adaaaa',
    borderBottomWidth: 1,
    fontWeight: 'bold',
  },
  settingPageContainer: {
    flex: 2,
    width: platformIOS.isPad ? containerWidth : windowWidth,
    height: windowHeight,
    backgroundColor: 'white',
  },
  forms: {
    margin: '2%',
  },
});
