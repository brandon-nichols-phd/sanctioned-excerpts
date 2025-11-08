import React, { useEffect, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  Text,
  Linking,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { NativeModules } from 'react-native';
import { useSelector } from 'react-redux';
import { getAppEnv, platformIOS } from '../../../../utils/utils';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { translate } from '../../../data/translations';
import { State } from '../../../../store/types/store-types';

const { MDMManager } = NativeModules;

const TERMS_LINK = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_LINK = 'https://pathspot.com/privacy/';
const APP_STORE_LINK = 'https://apps.apple.com/app/pathspot/id6466641497';
const APP_STORE_VERSION_API = 'https://itunes.apple.com/lookup?id=6466641497';

const openLink = async (link: string) => {
  try {
    await Linking.openURL(link);
  } catch (error) {
    console.debug('Error opening link:', error);
  }
};

const AppInfo = () => {
  const appEnv = getAppEnv().toLowerCase();
  const appVersionRef = useRef('');
  const [appVersion, setAppVersion] = useState(appEnv === 'staging' ? '1.0' : '');
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isMDM, setIsMDM] = useState(false);
  const isOnline = useSelector((state: State) => state.context.online);

  useFocusEffect(
    React.useCallback(() => {
      if (isOnline) {
        fetchLatestVersion();
      }
    }, [isOnline])
  );

  useEffect(() => {
    const version = appEnv === 'staging' ? '1.0' : DeviceInfo.getVersion() || 'N/A';
    setAppVersion(version);
    appVersionRef.current = version;

    fetchLatestVersion();
    checkMDM();
  }, []);

  const fetchLatestVersion = async () => {
    setIsCheckingUpdate(true);

    if (appEnv === 'staging') {
      setNeedsUpdate(false);
      setIsCheckingUpdate(false);
      return;
    }

    try {
      const response = await fetch(APP_STORE_VERSION_API);
      const data = await response.json();

      if (data.resultCount > 0 && data.results[0].version) {
        const appStoreVersion = data.results[0].version.trim();
        const currentVersion = appVersionRef.current.trim();

        if (appStoreVersion !== currentVersion) {
          setNeedsUpdate(true);
        } else {
          setNeedsUpdate(false);
        }
      } else {
        console.debug('No version data found');
      }
    } catch (error) {
      console.debug('Error fetching latest version:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const checkMDM = async () => {
    if (!MDMManager || !MDMManager.isMDMManaged) {
      console.debug('MDMManager not available');
      return;
    }

    try {
      const managed = await MDMManager.isMDMManaged();
      setIsMDM(managed);
    } catch (error) {
      console.debug('Error checking MDM status:', error);
    }
  };

  return (
    <View style={styles.base}>
      <View style={styles.container}>
        <Text style={styles.section}>{translate('appInfo')}</Text>
        {appEnv !== 'prod' && (
          <View style={styles.formField}>
            <Text style={styles.label}>{translate('settingsGeneralEnviroment')}</Text>
            <Text style={styles.value}>{appEnv}</Text>
          </View>
        )}
        <View style={styles.formField}>
          <Text style={styles.label}>{translate('settingsGeneralAppVersion')}</Text>
          <Text style={styles.value}>{appVersion}</Text>
        </View>

        {!isOnline ? (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineText}>{translate('offlineMessage')}</Text>
          </View>
        ) : isCheckingUpdate ? (
          <ActivityIndicator size="small" color={PATHSPOT_COLORS.PATHSPOT_TEAL} />
        ) : needsUpdate ? (
          isMDM ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{translate('mdmUpdateMessage')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                !isOnline ? styles.buttonDisabled : styles.buttonEnabled,
              ]}
              onPress={() => openLink(APP_STORE_LINK)}
              disabled={!isOnline}
            >
              <Text style={styles.buttonText}>{translate('updateSoftware')}</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>{translate('softwareUptodate')}</Text>
          </View>
        )}

        <Pressable style={styles.touchableText} onPress={fetchLatestVersion}>
          <Text style={styles.bodyText}>{translate('checkForUpdates')}</Text>
        </Pressable>
      </View>

      <View style={styles.infoFooter}>
        <Pressable style={styles.link} onPress={() => openLink(TERMS_LINK)}>
          <Text style={styles.linkText}>{translate('termsOfUse')}</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => openLink(PRIVACY_LINK)}>
          <Text style={styles.linkText}>{translate('privacyPolicy')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default AppInfo;

const styles = StyleSheet.create({
  base: {
    margin: platformIOS.isPad ? '3%' : '5%',
    paddingTop: platformIOS.isPad ? '1%' : '3%',
  },
  container: {
    height: platformIOS.isPad ? '80%' : '80%',
    gap: platformIOS.isPad ? 3 : 10,
  },
  formField: {
    marginVertical: '2%',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: '2%',
  },
  section: {
    fontSize: platformIOS.isPad ? 26 : 20,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: '3%',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  label: {
    fontWeight: 'bold',
    marginRight: platformIOS.isPad ? '2%' : '5%',
    fontSize: platformIOS.isPad ? 18 : 16,
  },
  value: {
    fontSize: platformIOS.isPad ? 20 : 18,
    fontWeight: '600',
    marginRight: 10,
  },
  button: {
    margin: 10,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: platformIOS.isPad ? '30%' : '93%',
  },
  buttonEnabled: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_TEAL,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  touchableText: {
    margin: platformIOS.isPad ? 15 : 9,
  },
  bodyText: {
    fontSize: 14,
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    textDecorationLine: 'underline',
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  link: {
    marginVertical: '2%',
    marginLeft: '2%',
  },
  messageBox: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 8,
    margin: platformIOS.isPad ? 10 : 0,
    borderLeftWidth: 5,
    borderLeftColor: '#FFC107',
  },
  messageText: {
    fontSize: 14,
    color: '#856404',
  },
  successMessage: {
    backgroundColor: '#D4EDDA',
    padding: 15,
    borderRadius: 8,
    margin: platformIOS.isPad ? 10 : 0,
    borderLeftWidth: 5,
    borderLeftColor: '#28A745',
  },
  successText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: 'bold',
  },
  offlineBox: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 8,
    margin: platformIOS.isPad ? 10 : 0,
    borderLeftWidth: 5,
    borderLeftColor: '#cccccc',
  },
  offlineText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: 'bold',
  },
  infoFooter: {
    flexDirection: platformIOS.isPad ? 'row' : 'column',
    justifyContent: platformIOS.isPad ? 'flex-start' : 'center',
    alignItems: platformIOS.isPad ? 'flex-start' : 'center',
    marginTop: 'auto',
    width: '100%',
    gap: 25,
  },
});
