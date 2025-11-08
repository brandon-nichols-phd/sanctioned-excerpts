import React from 'react';
import { StyleSheet, Text, View, Switch } from 'react-native';
import { platformIOS } from '../../../../utils/utils';
import { windowWidth } from '../../../../utils/Dimensions';
import { TemperatureUnits } from '../../../../store/types/store-types';
import { ToggleButton } from 'react-native-paper';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { useUserPreferences } from '../../../hooks/use-user-preferences';
import { translate } from '../../../data/translations';

export const UserPreferences = () => {
  const {
    displayTemperatureUnit,
    showBothTemperatures,
    setShowBothTemperatures,
    setTemperatureUnits,
  } = useUserPreferences();

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{translate('settingsUserPreferencesTitle')}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.formField}>
          <Text style={styles.label}>
            {translate('settingsUserPreferencesDisplayTemp')}
          </Text>
          <ToggleButton.Row
            onValueChange={(unit) => {
              setTemperatureUnits(unit as TemperatureUnits);
            }}
            value={displayTemperatureUnit}
            style={styles.toggleRowContainer}
          >
            <ToggleButton
              icon={'temperature-fahrenheit'}
              value="F"
              style={
                displayTemperatureUnit === 'F'
                  ? styles.toggleBtnSelected
                  : styles.toggleBtnDefault
              }
              iconColor={
                displayTemperatureUnit === 'F'
                  ? styles.toggleBtnSelected.color
                  : styles.toggleBtnDefault.color
              }
            />

            <ToggleButton
              icon={'temperature-celsius'}
              value="C"
              style={
                displayTemperatureUnit === 'C'
                  ? styles.toggleBgSelected
                  : styles.toggleBgDefault
              }
              iconColor={
                displayTemperatureUnit === 'C'
                  ? styles.toggleBtnSelected.color
                  : styles.toggleBtnDefault.color
              }
            />
          </ToggleButton.Row>
        </View>

        <View style={styles.spacer} />

        <Text style={styles.sectionHeader}>
          {translate('settingsUserPreferencesOtherSettings')}
        </Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>
            {translate('settingsUserPreferencesShowBothTemps')}
          </Text>
          <Switch
            trackColor={{ false: '#767577', true: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE }}
            thumbColor={showBothTemperatures ? 'white' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={(value) => setShowBothTemperatures(value)}
            value={showBothTemperatures}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formField: {
    marginVertical: '2%',
    flexDirection: 'row',
  },
  toggleRowContainer: { justifyContent: 'center', width: windowWidth * 0.1 },
  toggleButtonView: { width: '100%' },
  toggleButtonLarge: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 16 : 12,
    margin: '2%',
    fontWeight: '600',
  },
  label: {
    fontWeight: 'bold',
    fontSize: platformIOS.isPad ? 18 : 16,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  container: {
    margin: '2%',
  },
  title: {
    fontSize: platformIOS.isPad ? 26 : 20,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: '3%',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  toggleBgSelected: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  toggleBgDefault: {
    backgroundColor: 'white',
  },
  toggleBtnSelected: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 16 : 12,
    margin: '2%',
    fontWeight: '600',
    color: 'white',
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  toggleBtnDefault: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 16 : 12,
    margin: '2%',
    fontWeight: '600',
    color: 'black',
    backgroundColor: 'white',
  },
  comingSoon: {
    fontWeight: 'bold',
    fontSize: platformIOS.isPad ? 20 : 16,
    justifyContent: 'center',
    alignSelf: 'center',
    color: PATHSPOT_COLORS.PATHSPOT_LAVENDER,
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
