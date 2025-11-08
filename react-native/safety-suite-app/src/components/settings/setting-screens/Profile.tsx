import React from 'react';
import { useSelector } from 'react-redux';
import { StyleSheet, TextInput, View, Text } from 'react-native';

import { State } from '../../../../store/types/store-types';
import { platformIOS } from '../../../../utils/utils';
import { translate } from '../../../data/translations';

/**
 *
 * TODO - these should be changed to editable fields for easy user managment
 */
const Profile = () => {
  const userState = useSelector((state: State) => state.user);

  return (
    <View style={styles.container}>
      <View style={styles.formField}>
        <Text style={styles.label}>{translate('settingsProfileNameLabel')}</Text>
        <TextInput
          onChangeText={() => {}}
          value={userState.currUser?.name}
          placeholder={translate('settingsProfileNamePlaceholder')}
          style={styles.input}
          editable={false}
        />
      </View>
      <View style={styles.formField}>
        <Text style={styles.label}>{translate('settingsProfileEmailLabel')}</Text>
        <TextInput
          onChangeText={() => {}}
          value={userState.currUser?.email}
          placeholder={translate('settingsProfileEmailPlaceholder')}
          style={[styles.input, styles.emailInput]}
          editable={false}
        />
      </View>
      <View style={styles.formField}>
        <Text style={[styles.label, styles.roleLabel]}>
          {translate('settingsProfileRoleLabel')}
        </Text>
        <TextInput
          onChangeText={() => {}}
          value={userState.currUser?.jobName || ''}
          placeholder={translate('settingsProfileRolePlaceholder')}
          style={styles.input}
          editable={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: '3%',
  },
  formField: {
    marginVertical: '2%',
    flexDirection: 'row',
  },
  label: {
    fontWeight: 'bold',
    marginRight: 48,
    fontSize: platformIOS.isPad ? 20 : 16,
  },
  roleLabel: {
    marginRight: 62,
  },
  input: {
    width: 220,
    fontSize: platformIOS.isPad ? 20 : 16,
  },
  emailInput: {
    width: 265,
  },
  btn: {
    margin: 22,
    padding: 2,
    textAlign: 'center',
    width: 90,
    height: 45,
    marginLeft: 150,
  },
});

export default Profile;
