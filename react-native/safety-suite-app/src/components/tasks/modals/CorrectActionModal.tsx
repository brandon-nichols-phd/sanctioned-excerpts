import React, { useState } from 'react';
import { Modal, StyleSheet, View, Text } from 'react-native';
import { Button, RadioButton } from 'react-native-paper';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { platformIOS } from '../../../../utils/utils';
import { Task, isTaskTemperatureType } from '../../../data/task';
import { SAVE_COLOR } from '../../../../utils/styles';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { useDisplayTemperature } from '../../../hooks/use-display-temperature';
import { translate } from '../../../data/translations';

export const CorrectActionModal = (props: {
  task: Task;
  visible: boolean;
  onClose: () => void;
  onComplete: (value: string) => void;
}) => {
  const { task, visible, onClose, onComplete } = props;

  const {
    showBothTemperatures,
    altDisplayTemperatureUnit,
    altDisplayTemperature,
    displayTemperatureUnit,
    displayTemperature,
  } = useDisplayTemperature({
    temperature: task.taskResponse,
    valueIsCelsius: true,
  });

  const {
    altDisplayTemperature: altDisplayTemperatureValue,
    displayTemperature: displayTemperatureValue,
  } = useDisplayTemperature({
    temperature: task.correctness?.value ? String(task.correctness.value) : '',
    valueIsCelsius: true,
  });

  const correctiveActionOptions = task.correctiveAction?.document?.[0]?.options ?? [];
  const [option, setOption] = useState<string>(correctiveActionOptions[0] ?? '');

  const displayResponse = isTaskTemperatureType(task)
    ? `${displayTemperature}°${displayTemperatureUnit}`
    : task.taskResponse;

  const altDisplayResponse =
    showBothTemperatures && isTaskTemperatureType(task)
      ? `${altDisplayTemperature}°${altDisplayTemperatureUnit}`
      : '';

  const displayValue = isTaskTemperatureType(task)
    ? `${displayTemperatureValue}°${displayTemperatureUnit}`
    : task.correctness?.value;

  const altDisplayValue =
    showBothTemperatures && isTaskTemperatureType(task)
      ? `${altDisplayTemperatureValue}°${altDisplayTemperatureUnit}`
      : '';

  return (
    <View style={styles.centeredView}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.centeredView}>
          <View style={styles.ModalView}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {translate('taskCorrectiveModalTitle')}
              </Text>
            </View>

            <View style={styles.description}>
              <Text style={styles.headers}>
                {task.description || translate('taskCorrectiveDescriptionFallback')}
              </Text>
            </View>
            <View style={styles.responseContainer}>
              <Text style={styles.responseLabel}>
                {translate('taskCorrectiveValue', { value: displayResponse })}
              </Text>
              <Text style={styles.altResponseLabel}>{`(${altDisplayResponse})`}</Text>
            </View>
            <View style={styles.descriptionValue}>
              {task.correctness ? (
                <>
                  <Text style={styles.correctness}>
                    {translate('taskCorrectiveExpectedValue', {
                      operation: task.correctness.operation,
                      value: displayValue,
                    })}
                  </Text>
                  <Text style={styles.altCorrectness}>{`(${altDisplayValue})`}</Text>
                </>
              ) : null}
            </View>

            <View style={styles.actionContainer}>
              <Text style={styles.headers}>{translate('taskCorrectiveSelect')}</Text>
            </View>

            <View style={styles.optionsContainer}>
              <RadioButton.Group onValueChange={setOption} value={option}>
                {correctiveActionOptions.map((caOption) => (
                  <View key={caOption} style={styles.radioBtnContainer}>
                    <RadioButton.Android
                      value={caOption}
                      color={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
                    />
                    <Text style={styles.radioOptionLabel} numberOfLines={3}>
                      {caOption}
                    </Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            <View style={styles.completeBtnContainer}>
              <Button
                textColor={'white'}
                buttonColor={SAVE_COLOR}
                mode={'contained'}
                onPress={() => {
                  onComplete(option);
                }}
              >
                {translate('taskCorrectiveComplete')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CorrectActionModal;

const styles = StyleSheet.create({
  ModalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: platformIOS.isPad ? windowWidth * 0.45 : windowWidth * 0.9,
    height: platformIOS.isPad ? windowHeight * 0.825 : windowHeight * 0.75,
    marginTop: platformIOS.isPad ? '2%' : 0,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
  },
  header: {
    flex: platformIOS.isPad ? 0.4 : 0.35,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    width: '100%',
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 22 : 18,
    fontWeight: '700',
  },
  headers: {
    fontSize: platformIOS.isPad ? 20 : 15,
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'center',
    color: 'black',
  },
  description: {
    flex: platformIOS.isPad ? 0.25 : 0.5,
    marginTop: '5%',
    justifyContent: 'center',
  },
  descriptionValue: {
    flex: platformIOS.isPad ? 0.25 : 0.5,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  correctness: {
    marginTop: '1%',
    fontSize: platformIOS.isPad ? 18 : 14,
    fontWeight: '600',
    alignSelf: 'center',
    color: PATHSPOT_COLORS.PATHSPOT_RED,
  },
  altCorrectness: {
    marginTop: '1%',
    fontSize: platformIOS.isPad ? 16 : 12,
    fontWeight: '300',
    alignSelf: 'center',
    fontStyle: 'italic',
    marginLeft: 5,
  },
  responseContainer: {
    flex: 0.25,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  responseLabel: {
    fontSize: platformIOS.isPad ? 20 : 16,
    fontWeight: 'bold',
    color: PATHSPOT_COLORS.PATHSPOT_RED,
    alignSelf: 'flex-start',
    textAlign: 'center',
  },
  altResponseLabel: {
    fontSize: platformIOS.isPad ? 16 : 12,
    alignSelf: 'flex-start',
    fontStyle: 'italic',
    textAlign: 'center',
    marginLeft: 5,
  },
  actionContainer: {
    flex: platformIOS.isPad ? 0.4 : 0.35,
    width: platformIOS.isPad ? '80%' : '100%',
    justifyContent: 'center',
  },
  optionsContainer: {
    flex: platformIOS.isPad ? 1.75 : 2.25,
    marginBottom: platformIOS.isPad ? '2%' : '1%',
  },
  radioBtnContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    left: platformIOS.isPad ? windowWidth * 0.025 : '2%',
    marginBottom: platformIOS.isPad ? '2%' : '2.75%',
  },
  radioOptionLabel: {
    textAlign: 'left',
    alignSelf: 'center',
    fontWeight: '500',
    fontSize: platformIOS.isPad ? 16.2 : 14,
    width: '80%',
  },
  completeBtnContainer: {
    flex: platformIOS.isPad ? 0.7 : 0.75,
    justifyContent: 'center',
  },
});
