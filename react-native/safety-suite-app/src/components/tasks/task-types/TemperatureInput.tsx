import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { globalStyles } from '../../../../utils/styles';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';
import { platformIOS, showToast } from '../../../../utils/utils';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { Task } from '../../../data/task';
import { useDisplayTemperature } from '../../../hooks/use-display-temperature';
import { useInkbirdBLE } from '../../../hooks/use-inkbird-ble';
import { ToastTypes } from '../../../types/app';
import { translate } from '../../../data/translations';
import { createTaggedLogger } from '../../../../utils/dev-logging';

// Standardized logging
const logger = createTaggedLogger('BLE:InkbirdUI:');

// Move outside component to prevent recreation on every render
const translateReadingStates = (state: TemperatureReadingStates): string => {
  switch (state) {
    case TemperatureReadingStates.READ:
      return translate('taskTempReadState');
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

type TemperatureInputExtraProps = {
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
  CONNECTING = 'Connecting...',
  SAVE = 'Save',
  ERROR = 'Error',
}

export const TemperatureInput: FC<TemperatureInputExtraProps> = ({
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
    const temp = valid ? task.taskResponse : '';

    if (temp) {
      logger.log(
        `Loading saved temperature for task ${taskId}: taskResponse="${task.taskResponse}", temperature="${task.temperature}", using="${temp}"`
      );
    }

    return {
      isValidTemperature: valid,
      temperature: temp,
    };
  }, [task.taskResponse, task.skipped, taskId, task.temperature]);

  const [readingState, setReadingState] = useState(TemperatureReadingStates.READ);
  const [hasUserSavedReading, setHasUserSavedReading] = useState(false);

  const {
    temperature: bleTemperature,
    deviceStatus: scanningStatus,
    requestTemperatureReading,
    cancelTemperatureReading,
    onUserActivity,
  } = useInkbirdBLE();

  // Memoize BLE reading check
  const isReadingFromBLE = useMemo(
    () => readingState === TemperatureReadingStates.SAVE,
    [readingState]
  );

  // Memoize useDisplayTemperature inputs to prevent unnecessary hook calls
  const displayTempInputs = useMemo(() => {
    const tempValue = (isReadingFromBLE ? bleTemperature : temperature) ?? '';
    return {
      temperature: tempValue,
      // Both BLE temperatures and saved temperatures are always in Celsius
      valueIsCelsius: true,
    };
  }, [isReadingFromBLE, bleTemperature, temperature, taskId]);

  const {
    showBothTemperatures,
    displayTemperature,
    displayTemperatureUnit,
    altDisplayTemperature,
    altDisplayTemperatureUnit,
    getTemperatureToSave,
  } = useDisplayTemperature(displayTempInputs);

  // If another task becomes active, revert this task to "READ" state
  // regardless of what state it was in (Reading, Connecting, Save, etc.)
  useEffect(() => {
    if (
      lastTempReader !== taskId &&
      (readingState === TemperatureReadingStates.SAVE ||
        readingState === TemperatureReadingStates.READING ||
        readingState === TemperatureReadingStates.SEARCHING ||
        readingState === TemperatureReadingStates.CONNECTING)
    ) {
      logger.log(
        `Another task (${lastTempReader}) is now reading, reverting task ${taskId} from ${readingState} to read state`
      );
      setReadingState(TemperatureReadingStates.READ);
    }
  }, [lastTempReader, taskId, readingState, task.taskResponse]);

  useEffect(() => {
    if (lastTempReader !== taskId) {
      // Scanning is happening for another task
      return;
    }

    // Always sync UI with hook status when this is the active task
    logger.log(`Device status changed to: ${scanningStatus} for task ${taskId}`);

    switch (scanningStatus) {
      // UI will continue to say searching until the device is connected or the attempt to find/connect times out
      case 'NotStarted':
        // Hook is not actively scanning - show read state
        // Don't change state if already in ERROR (preserve error state from disconnection)
        if (readingState === TemperatureReadingStates.ERROR) {
          logger.log(
            `Task ${taskId} staying in error state (preserving disconnection error)`
          );
          return;
        }

        // Check if task was actively reading when disconnection occurred
        if (
          readingState === TemperatureReadingStates.SAVE ||
          readingState === TemperatureReadingStates.READING ||
          readingState === TemperatureReadingStates.CONNECTING ||
          readingState === TemperatureReadingStates.SEARCHING
        ) {
          // Task was in an active reading state when disconnection occurred - always show error
          logger.log(
            `Setting task ${taskId} to error state (active reading was interrupted by disconnection)`
          );
          setReadingState(TemperatureReadingStates.ERROR);
        } else if (isValidTemperature && readingState !== TemperatureReadingStates.READ) {
          // Task has saved temp but not in read state - ensure read state
          logger.log(
            `Task ${taskId} has saved temperature - ensuring read state on disconnection`
          );
          setReadingState(TemperatureReadingStates.READ);
        } else if (
          readingState !== TemperatureReadingStates.SAVE &&
          readingState !== TemperatureReadingStates.ERROR
        ) {
          logger.log(`Setting task ${taskId} to read state (device not started)`);
          setReadingState(TemperatureReadingStates.READ);
        }
        break;
      case 'Scanning':
        logger.log(
          `Setting task ${taskId} to searching state (device ${scanningStatus})`
        );
        // Reset saved flag when starting a new scan - this allows re-reading the same task
        setHasUserSavedReading(false);
        setReadingState(TemperatureReadingStates.SEARCHING);
        break;
      case 'Connecting':
        logger.log(
          `Setting task ${taskId} to connecting state (device ${scanningStatus})`
        );
        setReadingState(TemperatureReadingStates.CONNECTING);
        break;
      case 'Reading':
        logger.log(`Setting task ${taskId} to reading state (device reading)`);
        setReadingState(TemperatureReadingStates.READING);
        break;
      case 'Done':
        // Only set to SAVE state if user hasn't already saved this reading
        if (!hasUserSavedReading) {
          logger.log(`Setting task ${taskId} to save state (reading complete)`);
          setReadingState(TemperatureReadingStates.SAVE);
        } else {
          logger.log(
            `Temperature reading complete but user already saved - staying in read state`
          );
        }
        break;
      case 'Error':
        // Show error state - hook handles retry logic
        logger.log(`Setting task ${taskId} to error state (device error)`);
        setReadingState(TemperatureReadingStates.ERROR);
        break;
    }
  }, [scanningStatus, lastTempReader, taskId, readingState]);

  // beginScan and related useEffect removed - hook now handles all scanning

  const requestTemperature = useCallback(() => {
    logger.log(`Button pressed for task ${taskId}, current state: ${readingState}`);
    // Callback that executes once the button is pressed; updates reading state accordingly
    switch (readingState) {
      case TemperatureReadingStates.READ: {
        logger.log(`Starting temperature reading for task ${taskId}`);
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
        logger.log(`Cancelling search for task ${taskId}`);
        // If we are already trying to find a bluetooth device and the button is pressed again, actually cancel the BLE operation
        cancelTemperatureReading().catch((error) => {
          logger.error(`Failed to cancel temperature reading:`, error);
        });
        setReadingState(TemperatureReadingStates.READ);

        // IMPORTANT: Cancel action counts as user activity
        if (onUserActivity) {
          onUserActivity('cancel_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.CONNECTING: {
        logger.log(`Cancelling connection for task ${taskId}`);
        // If we are already trying to connect and the button is pressed again, actually cancel the BLE operation
        cancelTemperatureReading().catch((error) => {
          logger.error(`Failed to cancel temperature reading:`, error);
        });
        setReadingState(TemperatureReadingStates.READ);

        // IMPORTANT: Cancel action counts as user activity
        if (onUserActivity) {
          onUserActivity('cancel_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.READING: {
        logger.log(`Cancelling reading for task ${taskId}`);
        // If we are already trying to read and the button is pressed again, actually cancel the BLE operation
        cancelTemperatureReading().catch((error) => {
          logger.error(`Failed to cancel temperature reading:`, error);
        });
        setReadingState(TemperatureReadingStates.READ);

        // IMPORTANT: Cancel action counts as user activity
        if (onUserActivity) {
          onUserActivity('cancel_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.SAVE: {
        logger.log(
          `Save button pressed for task ${taskId}: bleTemperature="${bleTemperature}"`
        );
        if (bleTemperature) {
          const tempToSave = getTemperatureToSave(bleTemperature);
          logger.log(`Calling saveResponse for task ${taskId} with: "${tempToSave}"`);
          saveResponse(tempToSave);
        }
        // Mark that user has saved this reading
        setHasUserSavedReading(true);
        setReadingState(TemperatureReadingStates.READ);

        // IMPORTANT: Save action starts grace period and clears main timer
        if (onUserActivity) {
          onUserActivity('save_button_pressed');
        }
        return;
      }
      case TemperatureReadingStates.ERROR: {
        logger.log(`Resetting error state and retrying for task ${taskId}`);
        // Something previously went wrong, reset to READ and notify user
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
        </View>
      ) : null}
    </View>
  );
};

export default TemperatureInput;

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
});
