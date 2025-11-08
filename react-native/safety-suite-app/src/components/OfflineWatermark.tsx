import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { State } from '../../store/types/store-types';
import { translate } from '../data/translations';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  dismissOfflineWatermark,
  restoreOfflineWatermark,
  forceReconnectMode,
  setOnline,
} from '../../store/slices/contextSlice';
import { PATHSPOT_COLORS } from '../constants/constants';

type OfflineWatermarkProps = {
  restoreRate?: number;
  forceReconnectTime?: number;
};

const OfflineWatermark: React.FC<OfflineWatermarkProps> = ({
  restoreRate = 24, // 24 hours
  forceReconnectTime = 168, // 168 hours (7 days)
}) => {
  const isOnline = useSelector((state: State) => state.context.online);
  const isDismissed = useSelector((state: State) => state.context.offlineDismissed);
  const forceReconnect = useSelector((state: State) => state.context.forceReconnect);
  const offlineStartTime = useSelector((state: State) => state.context.offlineStartTime);
  const dispatch = useDispatch();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isDismissed ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [isDismissed]);

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isDismissed ? 40 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [isDismissed]);

  useEffect(() => {
    if (!isOnline && offlineStartTime) {
      const interval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - offlineStartTime) / 1000);
        setElapsedTime(elapsedSeconds);

        const restoreRateSec = restoreRate * 60 * 60;
        const forceReconnectSec = forceReconnectTime * 60 * 60;

        if (elapsedSeconds >= forceReconnectSec) {
          dispatch(forceReconnectMode());
          clearInterval(interval);
        } else if (elapsedSeconds % restoreRateSec === 0) {
          dispatch(restoreOfflineWatermark());
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [isOnline, offlineStartTime, dispatch, restoreRate, forceReconnectTime]);

  const handleDismiss = () => {
    if (!forceReconnect) {
      dispatch(dismissOfflineWatermark());
    }
  };

  useEffect(() => {
    if (isOnline && forceReconnect) {
      dispatch(setOnline({ online: true }));
    }
  }, [isOnline, forceReconnect, dispatch]);

  if (isOnline) return null;

  const formattedTime =
    elapsedTime < 3600
      ? `${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60)
          .toString()
          .padStart(2, '0')}`
      : `${Math.floor(elapsedTime / 3600)}:${Math.floor((elapsedTime % 3600) / 60)
          .toString()
          .padStart(2, '0')}`;

  return isDismissed ? (
    <Animated.View style={[styles.headerOffline, { height: heightAnim }]}>
      <TouchableOpacity
        onPress={() => dispatch(restoreOfflineWatermark())}
        style={styles.headerContainer}
      >
        <MaterialIcons name="cloud-off" size={18} color="white" />
        <Text style={styles.headerText}>
          {translate('deviceOffline')} ({formattedTime})
        </Text>
      </TouchableOpacity>
    </Animated.View>
  ) : (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.overlay, { opacity: fadeAnim }]}
    >
      <View style={styles.watermarkContainer} pointerEvents="box-none">
        <MaterialIcons name="cloud-off" size={45} color={PATHSPOT_COLORS.PATHSPOT_RED} />
        <Text style={styles.text}>
          {forceReconnect
            ? translate('reconnectToContinue')
            : `${translate('deviceOffline')} 
            ${translate('featureNotAvailable')} (${formattedTime})`}
        </Text>

        <TouchableOpacity
          style={[styles.dismissButton, forceReconnect && styles.disabledButton]}
          onPress={handleDismiss}
          activeOpacity={forceReconnect ? 1 : 0.7}
          disabled={forceReconnect}
        >
          <Text style={styles.dismissText}>
            {forceReconnect ? translate('reconnectRequired') : translate('dismiss')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 120,
    alignItems: 'center',
    zIndex: 1000,
  },
  watermarkContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    width: '90%',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    gap: 10,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    color: PATHSPOT_COLORS.PATHSPOT_RED,
    textAlign: 'center',
    marginBottom: 4,
  },
  dismissButton: {
    marginTop: 10,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_RED,
    paddingVertical: 10,
    paddingHorizontal: 35,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_RED,
  },
  dismissText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerOffline: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_RED,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 10,
    width: '100%',
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_RED,
    shadowColor: PATHSPOT_COLORS.PATHSPOT_RED,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 5,
  },
});

export default OfflineWatermark;
