import React, { FC } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from 'react-native-paper';

import DialPad from '../../../../utils/components/DialPad';
import { platformIOS } from '../../../../utils/utils';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { SAVE_COLOR } from '../../../../utils/styles';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { isIphoneSe } from '../../../../utils/Platform';
import { translate } from '../../../data/translations';

type Props = {
  name: string;
  description: string;
  showModal: boolean;
  value: string;
  onChange: (val: string) => void;
  onSave: (val: string) => void;
  onCancel: () => void;
  onHide: () => void;
};

const cleanValue = (value: string, num: string) => {
  if (!num) {
    return value.slice(0, -1);
  } else if (num === '-' && value.length > 0) {
    return value;
  }
  return `${value}${num}`;
};

const NumberEntryModal: FC<Props> = (props) => {
  const { name, description, value, showModal, onChange, onSave, onCancel, onHide } =
    props;

  const onTextChange = (num: string) => {
    // only used if still using TextInput and mobile keyboard
    const cleanNumber = num.replace(/[^0-9.-]/g, '');

    if (cleanNumber === '0') {
      Alert.alert('Cannot have a count less than 1');
      onChange('1');
    } else {
      onChange(value + cleanNumber);
    }
  };

  const onValueChange = (newValue: string) => {
    onChange(cleanValue(value, newValue));
  };

  return (
    <View style={styles.centeredView}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={onHide}
      >
        <View style={styles.centeredView}>
          <View style={styles.ModalView}>
            <View style={styles.headerView}>
              <Text style={styles.title} numberOfLines={3}>
                {name}
              </Text>
              {description ? (
                <Text style={styles.subHeader}>{description || ''}</Text>
              ) : null}
            </View>

            <View style={styles.centerFlex}>
              <View style={styles.centerContainer}>
                <View style={styles.textContainer}>
                  <TextInput
                    style={styles.underlineInput}
                    onChangeText={onTextChange}
                    keyboardType={'decimal-pad'}
                    value={value}
                    placeholder="1"
                    placeholderTextColor={PATHSPOT_COLORS.PATHSPOT_GREY}
                    editable={false}
                  />
                </View>

                {/* ---- dialpad --- */}
                <View style={styles.dialpad}>
                  <DialPad onClick={onValueChange} />
                </View>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <Button
                style={styles.button}
                onPress={onCancel}
                mode="contained"
                compact={true}
                buttonColor="red"
                labelStyle={styles.labelColor}
              >
                {translate('cancelButtonText')}
              </Button>
              <Button
                style={styles.button}
                onPress={() => onSave(value)}
                mode="elevated"
                compact={true}
                buttonColor={SAVE_COLOR}
                textColor="white"
              >
                {translate('saveButtonText')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default NumberEntryModal;

const styles = StyleSheet.create({
  labelColor: {
    color: 'white',
  },
  underlineInput: {
    borderColor: PATHSPOT_COLORS.PATHSPOT_GREY,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    margin: '2%',
    textAlign: 'center',
    fontWeight: '600',
    flex: 2,
    fontSize: 24,
    padding: '1%',
  },
  numText: {
    padding: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    flex: 1,
    height: 110,
    width: 75,
  },
  ModalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 5,
    width: platformIOS.isPad ? windowWidth * 0.8 : windowWidth * 0.875,
    height: platformIOS.isPad
      ? windowHeight * 0.825
      : isIphoneSe
      ? windowHeight * 0.73
      : windowHeight * 0.615,
    padding: 25,
    zIndex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: platformIOS.isPad ? 35 : isIphoneSe ? 40 : 5,
  },
  title: {
    fontSize: platformIOS.isPad ? 34 : 22,
    fontWeight: 'bold',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  subHeader: {
    fontWeight: '700',
    fontSize: 18,
    marginVertical: platformIOS.isPad ? '3%' : '5%',
    color: PATHSPOT_COLORS.PATHSPOT_GREY,
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'row',
  },
  button: {
    margin: '1%',
    textAlign: 'center',
    width: windowWidth * 0.25,
  },
  flexContainer: {
    flexDirection: 'row',
    width: windowWidth * 0.7,
    height: windowHeight * 0.5,
    marginTop: 5,
  },
  leftFlex: {
    flex: 1,
    marginTop: -55,
  },
  centerFlex: {
    flex: 2,
    padding: 45,
    margin: 25,
    justifyContent: 'center',
    marginTop: -10,
  },
  flexright: {
    flex: 3,
    justifyContent: 'center',
  },
  centerContainer: {
    flexDirection: 'column',
    width: windowWidth * 0.3,
    padding: 25,
  },
  textContainer: {
    alignSelf: 'center',
    marginTop: windowHeight * 0.075,
    bottom: '5%',
    width: platformIOS.isPad ? windowWidth * 0.3 : windowWidth * 0.65,
    flexDirection: 'row',
  },
  dialpad: {
    justifyContent: 'center',
    alignContent: 'center',
  },
  headerView: {
    flex: 0.8,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
  },
});
