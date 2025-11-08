import React, { useCallback } from 'react';
import { View, StyleSheet, Text, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { useDigitalPrepItems } from '../../../hooks/use-digital-prep-items';
import { State } from '../../../../store/types/store-types';
import {
  setEnableHandWashing,
  setDisabledSections,
} from '../../../../store/slices/digitalPrepSlice';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { translate } from '../../../data/translations';

const MIN_SECTIONS = 2;

export const DigitalPrepSettings = () => {
  const digitalPrepConfig = useSelector((state: State) => state.digitalPrep.config);
  const dispatch = useDispatch();
  const [{ allSections }] = useDigitalPrepItems();

  const sectionCount = allSections.length;
  const disabledSectionsCount = digitalPrepConfig.disabledSections.length;

  const toggleSection = useCallback(
    (sectionId: number, isEnabled: boolean) => {
      const updatedDisabledSections = isEnabled
        ? digitalPrepConfig.disabledSections.filter((id) => id !== sectionId)
        : [...digitalPrepConfig.disabledSections, sectionId];

      dispatch(setDisabledSections({ disabledSections: updatedDisabledSections }));
    },
    [digitalPrepConfig.disabledSections, dispatch]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>{translate('settingsDigiPrepSections')}</Text>
      {allSections.map((section) => {
        const isLastSection =
          allSections.findIndex((s) => s.id === section.id) === sectionCount - 1;
        const isSectionEnabled = !digitalPrepConfig.disabledSections.includes(section.id);

        // The last section will always be the prep table which should never be disabled
        // We also must keep at least two sections active
        const shouldDisableSwitch =
          isLastSection ||
          (isSectionEnabled && sectionCount - disabledSectionsCount <= MIN_SECTIONS);
        return (
          <View key={section.id} style={styles.settingItem}>
            <Text style={styles.settingText}>{section.name}</Text>
            <Switch
              disabled={shouldDisableSwitch}
              trackColor={{ false: '#767577', true: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE }}
              thumbColor={isSectionEnabled ? 'white' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={(value) => toggleSection(section.id, value)}
              value={!digitalPrepConfig.disabledSections.includes(section.id)}
            />
          </View>
        );
      })}

      <View style={styles.spacer} />

      <Text style={styles.sectionHeader}>
        {translate('settingsDigiPrepOtherSettings')}
      </Text>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>{translate('settingsDigiPrepHandwashing')}</Text>
        <Switch
          trackColor={{ false: '#767577', true: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE }}
          thumbColor={digitalPrepConfig.handWashingTimerEnabled ? 'white' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={() => {
            dispatch(
              setEnableHandWashing({
                enabled: !digitalPrepConfig.handWashingTimerEnabled,
              })
            );
          }}
          value={digitalPrepConfig.handWashingTimerEnabled}
          disabled={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'black',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingText: {
    fontSize: 16,
    color: 'black',
    flex: 1,
    marginRight: 10,
  },
  spacer: {
    height: 30,
  },
});
