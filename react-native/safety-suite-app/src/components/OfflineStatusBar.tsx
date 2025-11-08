import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, SafeAreaView } from 'react-native';
import { useSelector } from 'react-redux';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { State } from '../../store/types/store-types';
import { translate } from '../data/translations';
import { PATHSPOT_COLORS } from '../constants/constants';

const OfflineStatusBar = () => {
  const isOnline = useSelector((state: State) => state.context.online);

  const slideAnim = useRef(new Animated.Value(isOnline ? -50 : 0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOnline ? -150 : 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <Animated.View
      style={[
        styles.safeArea,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: isOnline
            ? PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE
            : PATHSPOT_COLORS.PATHSPOT_RED,
        },
      ]}
    >
      <SafeAreaView />
      <View style={styles.innerContainer}>
        <MaterialIcons name="cloud-off" size={20} color="white" />
        <Text style={styles.text}>
          {translate('deviceOffline')}. {translate('featureNotAvailable')}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
    zIndex: 1000,
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OfflineStatusBar;
