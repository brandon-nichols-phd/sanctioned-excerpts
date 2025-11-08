import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { globalStyles } from '../../../../utils/styles';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';
import { platformIOS, showToast } from '../../../../utils/utils';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { Task } from '../../../data/task';
import { useDisplayTemperature } from '../../../hooks/use-display-temperature';
import { ToastTypes } from '../../../types/app';
import { translate } from '../../../data/translations';
import { useDishTempBlue } from '../../../hooks/use-dish-temp-blue';

// Standardized logging
const LOG_TAG = 'BLE:DishTempUI: ';
const addLogTag = (message: string) => `${LOG_TAG} ${message}`;

// Move outside component to prevent recreation on every render
const translateReadingStates = (state: TemperatureReadingStates): string => {
  switch (state) {
    case TemperatureReadingStates.READ:
      return translate('taskTempDishReadState');
    case TemperatureReadingStates.CONNECTING:
      return translate('taskTempConnectingState');
    case TemperatureReadingStates.SAVE:
      return translate('taskTempSaveState');
    case TemperatureReadingStates.ERROR:
      return translate('taskTempErrorState');
    case TemperatureReadingStates.READING:
      return translate('taskTempReadingState');
    case TemperatureReadingStates.SEARCHING:
      return translate('taskTempSearchingState');
  }
};

type DishTemperatureInputExtraProps = {
  taskId: string;
  task: Task;
  readOnly: boolean;
  lastTempReader: string;
  setLastTempReader: (id: string) => void;
  saveResponse: (res: Task['taskResponse']) => void;
};

enum TemperatureReadingStates {
  READ = 'Read',
  READING = 'Reading...',
  SEARCHING = 'Searching...',
  SAVE = 'Save',
  ERROR = 'Error',
  CONNECTING = 'Connecting...',
}

export const DishTemperatureInput: FC<DishTemperatureInputExtraProps> = ({
  task,
  taskId,
  lastTempReader,
  readOnly,
  setLastTempReader,
  saveResponse,
}) => {
  // Memoize computed values to prevent recalculation on every render
  const { isValidTemperature, temperature } = useMemo(() => {
    const valid = isNumberTaskResponseValid(task.taskResponse) && !task.skipped;
    return {
      isValidTemperature: valid,
      temperature: valid ? task.taskResponse : '',
    };
  }, [task.taskResponse, task.skipped]);

  const [readingState, setReadingState] = useState(TemperatureReadingStates.READ);
  const [hasUserSavedReading, setHasUserSavedReading] = useState(false);

  const {
    temperature: bleTemperature,
    deviceStatus,
    requestTemperatureReading,
    cancelTemperatureReading,
    onUserActivity,
  } = useDishTempBlue();

  // Memoize BLE reading check
  const isReadingFromBLE = useMemo(
    () => readingState === TemperatureReadingStates.SAVE,
    [readingState]
  );

  // Memoize useDisplayTemperature inputs to prevent unnecessary hook calls
  const displayTempInputs = useMemo(
    () => ({
      temperature:
        isReadingFromBLE && bleTemperature?.temperature
          ? bleTemperature.temperature
          : temperature,
      // Both BLE temperatures and saved temperatures are always in Celsius
      valueIsCelsius: true,
    }),
    [isReadingFromBLE, bleTemperature?.temperature, temperature]
  );

  const {
    showBothTemperatures,
    displayTemperature,
    displayTemperatureUnit,
    altDisplayTemperature,
    altDisplayTemperatureUnit,
    getTemperatureToSave,
  } = useDisplayTemperature(displayTempInputs);
  /**
   * Removed auto-initialization on mount to match Inkbird pattern
   * Device will only initialize when user explicitly presses the button
   * This prevents unwanted scanning when just viewing the task list
   */

  /**
   * Cleanup effect - runs only on unmount
   * Note: endConnection is handled by the BLE lifecycle hook, so no manual cleanup needed
   */
  // If the user requests another task to read the temperature before saving the previously read temperature for this
  // task, then revert it to the "READ" state and whatever temperature it had saved before.
  useEffect(() => {
    if (lastTempReader !== taskId && readingState === TemperatureReadingStates.SAVE) {
      console.log(
        addLogTag(
          `Another task (${lastTempReader}) is now reading, reverting task ${taskId} to READ state`
        )
      );
      setReadingState(TemperatureReadingStates.READ);
    }
  }, [lastTempReader, taskId, readingState, task.taskResponse]);

  useEffect(() => {
    if (lastTempReader !== taskId) {
      // Scanning is happening for another task
      return;
    }

    // Always sync UI with hook status when this is the active task (same pattern as Inkbird)

    console.log(
      addLogTag(`Device status changed to: ${deviceStatus} for task ${taskId}`)
    );

    switch (deviceStatus) {
      // UI will continue to say searching until the device is connected or the attempt to find/connect times out
      case 'NotStarted':
        // Hook is not actively scanning - show read state
        console.log(addLogTag(`Setting task ${taskId} to read state (device unknown)`));
        setReadingState(TemperatureReadingStates.READ);
        break;
      case 'Scanning':
        console.log(
          addLogTag(`Setting task ${taskId} to searching state (device ${deviceStatus})`)
        );
        // Reset saved flag when starting a new scan - this allows re-reading the same task
        setHasUserSavedReading(false);
        setReadingState(TemperatureReadingStates.SEARCHING);
        break;
      case 'Connecting':
        console.log(
          addLogTag(`Setting task ${taskId} to connecting state (device ${deviceStatus})`)
        );
        setReadingState(TemperatureReadingStates.CONNECTING);
        break;
      case 'Reading':
        console.log(
          addLogTag(`Setting task ${taskId} to reading state (device ${deviceStatus})`)
        );
        setReadingState(TemperatureReadingStates.READING);
        break;
      case 'Done':
        // Only set to SAVE state if user hasn't already saved this reading
        if (!hasUserSavedReading) {
          console.log(
            addLogTag(`Setting task ${taskId} to save state (reading complete)`)
          );
          setReadingState(TemperatureReadingStates.SAVE);
        } else {
          console.log(
            addLogTag(
              `Temperature reading complete but user already saved - ensuring read state (hasUserSavedReading: ${hasUserSavedReading})`
            )
          );
          setReadingState(TemperatureReadingStates.READ);
        }
        break;
      case 'Error':
        // Show error state - hook handles retry logic
        console.log(addLogTag(`Setting task ${taskId} to error state (device error)`));
        setReadingState(TemperatureReadingStates.ERROR);
        break;
    }
  }, [deviceStatus, lastTempReader, taskId, readingState]);

  // beginScan and related useEffect removed - hook now handles all scanning

  const requestTemperature = useCallback(() => {
    console.log(
      addLogTag(`Button pressed for task ${taskId}, current state: ${readingState}`)
    );
    // Callback that executes once the button is pressed; updates reading state accordingly
    switch (readingState) {
      case TemperatureReadingStates.READ: {
        console.log(addLogTag(`Starting temperature reading for task ${taskId}`));
        // Reset the saved flag when starting a new reading
        setHasUserSavedReading(false);
        // Signal intent to hook - it will handle everything (scanning, toasts, retries)
        setLastTempReader(taskId);
        requestTemperatureReading(taskId);

        // IMPORTANT: This counts as user activity - pass to hook
        if (onUserActivity) {
          onUserActivity('read_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.SEARCHING: {
        console.log(addLogTag(`Cancelling search for task ${taskId}`));
        // If we are already trying to find a bluetooth device and the button is pressed again, actually cancel the BLE operation
        cancelTemperatureReading();
        setReadingState(TemperatureReadingStates.READ);

        // IMPORTANT: Cancel action counts as user activity
        if (onUserActivity) {
          onUserActivity('cancel_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.READING: {
        console.log(addLogTag(`Cancelling reading for task ${taskId}`));
        // If we are already trying to read and the button is pressed again, actually cancel the BLE operation
        cancelTemperatureReading();
        setReadingState(TemperatureReadingStates.READ);

        // IMPORTANT: Cancel action counts as user activity
        if (onUserActivity) {
          onUserActivity('cancel_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.SAVE: {
        // If save is pressed, save the value and reset the button to READ
        if (bleTemperature) {
          saveResponse(getTemperatureToSave(bleTemperature.temperature));
        }
        // Mark that user has saved this reading
        setHasUserSavedReading(true);
        setReadingState(TemperatureReadingStates.READ);
        console.log(addLogTag(`Temperature saved for task ${taskId}, button should now be in read state`));
        console.log(addLogTag(`Current device status: ${deviceStatus}, hasUserSavedReading: ${true}`));
        
        // IMPORTANT: Save action starts grace period and clears main timer
        if (onUserActivity) {
          onUserActivity('save_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.ERROR: {
        console.log(addLogTag(`Resetting error state and retrying for task ${taskId}`));
        // Something previously went wrong, reset to read and start new attempt via hook
        // User pressed button after error - start new attempt via hook
        setLastTempReader(taskId);
        requestTemperatureReading(taskId);
        
        // IMPORTANT: Retry counts as user activity
        if (onUserActivity) {
          onUserActivity('retry_button_pressed');
        }
        return;
      }
    }
  }, [
    bleTemperature,
    getTemperatureToSave,
    readingState,
    saveResponse,
    setLastTempReader,
    taskId,
    requestTemperatureReading,
    cancelTemperatureReading,
    onUserActivity,
  ]);

  return (
    <View style={[globalStyles.row, styles.container]}>
      <Button
        icon="thermometer"
        style={
          readingState === TemperatureReadingStates.SAVE
            ? styles.activeTempBtn
            : styles.inActiveTempBtn
        }
        textColor={'black'}
        buttonColor={
          readingState === TemperatureReadingStates.READ
            ? PATHSPOT_COLORS.PATHSPOT_TEAL
            : PATHSPOT_COLORS.PATHSPOT_BRIGHT_GREEN
        }
        compact={true}
        mode={'contained'}
        onPress={requestTemperature}
        disabled={readOnly}
      >
        {translateReadingStates(readingState)}
      </Button>

      {displayTemperature ? (
        <View style={styles.textcontainer}>
          <Text style={styles.text}>
            {`${displayTemperature} °${displayTemperatureUnit}`}
          </Text>
          {showBothTemperatures ? (
            <Text style={styles.altText}>
              {`(${altDisplayTemperature} °${altDisplayTemperatureUnit})`}
            </Text>
          ) : null}
          
          {/* Show additional protocol data when reading from BLE */}
          {isReadingFromBLE && bleTemperature && (
            <View style={styles.additionalInfo}>
              {bleTemperature.batteryStatus && (
                <Text style={[
                  styles.batteryText,
                  bleTemperature.batteryStatus === 'low' ? styles.batteryLow : styles.batteryNormal
                ]}>
                  Battery: {bleTemperature.batteryStatus === 'low' ? 'Low Voltage' : 'Good'}
                </Text>
              )}
              {bleTemperature.macAddress && (
                <Text style={styles.deviceInfoText}>
                  Device: {bleTemperature.macAddress}
                </Text>
              )}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
  },
  text: {
    justifyContent: 'center',
    textAlign: 'center',
    alignSelf: 'center',
    fontSize: 18,
    fontWeight: '500',
  },
  altText: {
    justifyContent: 'center',
    textAlign: 'center',
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  textcontainer: {
    justifyContent: 'center',
    alignSelf: 'center',
    textAlign: 'center',
    alignItems: 'center',
    alignContent: 'center',
    marginHorizontal: platformIOS.isPad ? '5%' : '2%',
    marginBottom: '2%',
    minWidth: '5%',
  },
  activeTempBtn: {
    borderRadius: 10,
    borderTopEndRadius: 1,
    borderBottomEndRadius: 1,
  },
  inActiveTempBtn: {
    borderRadius: 10,
    borderWidth: 1,
  },
  additionalInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  maxTempText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
  batteryNormal: {
    color: '#4CAF50', // Green for normal battery
  },
  batteryLow: {
    color: '#F44336', // Red for low battery
  },
  deviceInfoText: {
    fontSize: 10,
    fontWeight: '300',
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'monospace', // Monospace font for MAC address
  },
});
