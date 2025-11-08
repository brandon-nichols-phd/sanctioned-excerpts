import React, { FC, useCallback, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { InteractionManager } from 'react-native';

import { PATHSPOT_COLORS } from '../../../constants/constants';
import { platformIOS, showToast } from '../../../../utils/utils';
import { ToastTypes } from '../../../types/app';
import { globalStyles } from '../../../../utils/styles';
import { Task } from '../../../data/task';
import { windowWidth } from '../../../../utils/Dimensions';
import { useDisplayTemperature } from '../../../hooks/use-display-temperature';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';
import NumberEntryModal from '../modals/NumberEntryModal';
import { translate } from '../../../data/translations';
import { useUserPreferences } from '../../../hooks/use-user-preferences';

const TemperatureManualInput: FC<{
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
}> = ({ task, readOnly, saveResponse }) => {
  const { displayTemperatureUnit } = useUserPreferences();
  
  const initTemperature = isNumberTaskResponseValid(task.taskResponse)
    ? task.taskResponse
    : '';

  const {
    showBothTemperatures,
    displayTemperature,
    displayTemperatureUnit: displayUnit,
    altDisplayTemperature,
    altDisplayTemperatureUnit,
    getTemperatureToSave,
  } = useDisplayTemperature({
    temperature: initTemperature,
    // Saved temperatures are always in Celsius
    valueIsCelsius: true,
  });

  // For new user input, we need a different getTemperatureToSave function
  const getUserInputTemperatureToSave = useCallback((userInput: string) => {
    if (!userInput) return '';
    
    // If user prefers Celsius, no conversion needed
    if (displayTemperatureUnit === 'C') {
      return userInput;
    } else {
      // User prefers Fahrenheit, so convert F to C for storage
      const fahrenheitValue = parseFloat(userInput);
      const celsiusValue = (fahrenheitValue - 32) * (5/9);
      return celsiusValue.toString();
    }
  }, [displayTemperatureUnit]);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [temperature, setTemperature] = useState(displayTemperature);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const save = useCallback(
    (t: Task, res: Task['taskResponse']) => {
      saveResponse(res);
      showToast({
        type: ToastTypes.SUCCESS,
        txt1: translate('taskManualSaveSuccessToast', { name: t.name }),
      });
    },

    [saveResponse]
  );

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setShowModal(true)}
        style={styles.displayTempContainer}
        disabled={readOnly}
      >
        <Text
          style={[
            styles.text,
            displayTemperature ? styles.hasNumberColor : styles.defaultNumberColor,
            readOnly ? styles.disabledBorderColor : styles.enabledBorderColor,
          ]}
        >
          {displayTemperature || '0.00'}
        </Text>
        <Text style={styles.displayTempLabel}>{`°${displayUnit}`}</Text>
        {showBothTemperatures ? (
          <Text
            style={styles.altDisplayTempLabel}
          >{` (${altDisplayTemperature}°${altDisplayTemperatureUnit})`}</Text>
        ) : null}
      </Pressable>

      {showModal ? (
        <NumberEntryModal
          name={task.name}
          description={task.description || ''}
          value={temperature}
          onChange={(val) => setTemperature(val)}
          showModal={showModal}
          onSave={(val) => {
            closeModal();
            // Waiting until modal is closed to submit response
            // This is needed because if the answer triggers a corrective action that will open a modal
            // And the animations cause a race condition where the second modal wont open
            setTimeout(() => {
              const temp = parseFloat(val);
              const cleanTemperature = isNaN(temp) ? '' : String(temp);

              if (cleanTemperature) {
                const tempToSave = getUserInputTemperatureToSave(cleanTemperature);
                console.log(`[MANUAL_TEMP] User entered: "${cleanTemperature}", converted to save: "${tempToSave}", user prefers: ${displayTemperatureUnit}`);
                // Keep the original user input as the display temperature
                setTemperature(cleanTemperature);
                save(task, tempToSave);
              } else {
                setTemperature(displayTemperature);
              }
            }, 400);
          }}
          onCancel={() => {
            setTemperature(displayTemperature);
            closeModal();
          }}
          onHide={() => {
            setTemperature(displayTemperature);
            closeModal();
          }}
        />
      ) : null}
    </View>
  );
};

export default TemperatureManualInput;

const styles = StyleSheet.create({
  ipad: {
    width: windowWidth * 0.25,
    borderBottomWidth: 1,
    borderBottomColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    textAlign: 'left',
    fontSize: 18,
    marginTop: '1%',
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_BLUE,
  },
  iphone: {
    width: windowWidth * 0.4,
    borderBottomWidth: 1,
    borderBottomColor: 'grey',
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_BLUE,
    textAlign: 'left',
    marginBottom: '2%',
    fontSize: 16,
  },
  container: {
    ...globalStyles.row,
    justifyContent: 'flex-end',
  },
  displayTempContainer: {
    alignSelf: 'center',
    margin: '1%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayTempLabel: {
    fontSize: platformIOS.isPad ? 22 : 18,
    fontWeight: '600',
  },
  altDisplayTempLabel: {
    fontSize: platformIOS.isPad ? 18 : 14,
    fontWeight: '300',
    fontStyle: 'italic',
    marginLeft: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    textAlign: 'center',
    marginRight: 5,
  },
  hasNumberColor: { color: 'black' },
  defaultNumberColor: { color: 'grey' },
  disabledBorderColor: { borderColor: 'grey' },
  enabledBorderColor: { borderColor: 'black' },
});
