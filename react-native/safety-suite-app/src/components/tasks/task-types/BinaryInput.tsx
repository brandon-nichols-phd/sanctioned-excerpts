import React, { FC, useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ToggleButton } from 'react-native-paper';

import { Task } from '../../../data/task';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { translate } from '../../../data/translations';

export const BinaryInput: FC<{
  task: Task;
  skipped: boolean;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
  handleSkipResponse: (skipped: boolean) => void;
}> = ({ task, skipped, readOnly, saveResponse, handleSkipResponse }) => {
  const [localTaskResponse, setLocalTaskResponse] = useState<string>(task.taskResponse);

  useEffect(() => {
    setLocalTaskResponse(skipped ? 'N/A' : task.taskResponse);
  }, [task.taskResponse, skipped]);

  return (
    <ToggleButton.Row
      onValueChange={(val: string | null) => {
        if (val == null) {
          return;
        }

        if (!readOnly) {
          setLocalTaskResponse(val);
          requestAnimationFrame(() => {
            /**
             * handling n/a responses as we would a skipped response from NotRequired.tsx
             * need to check if this has been previously been skipped
             * and if it has, update the skipped value that is part of Task.tsx state
             *
             * saveResponse will always mark the skipped value as false
             * and is used for every other task response with the exception of Binary responses here
             *  */
            if (val === 'N/A') {
              handleSkipResponse(true);
            } else {
              if (skipped) {
                handleSkipResponse(false);
              }
              saveResponse(val);
            }
          });
        }
      }}
      value={localTaskResponse}
      style={styles.container}
    >
      <ToggleButton
        icon={() => (
          <View>
            <Text
              style={
                readOnly
                  ? styles.readonly
                  : localTaskResponse === 'yes'
                  ? styles.firstOption
                  : styles.secondOption
              }
            >
              {translate('yesText')}
            </Text>
          </View>
        )}
        value="yes"
        style={
          localTaskResponse === 'yes'
            ? styles.firstOptionBackground
            : styles.secondOptionBackground
        }
        disabled={readOnly}
      />
      <ToggleButton
        icon={() => (
          <View>
            <Text
              style={
                readOnly
                  ? styles.readonly
                  : localTaskResponse === 'no'
                  ? styles.firstOption
                  : styles.secondOption
              }
            >
              {translate('noText')}
            </Text>
          </View>
        )}
        value="no"
        style={
          localTaskResponse === 'no'
            ? styles.firstOptionBackground
            : styles.secondOptionBackground
        }
        disabled={readOnly}
      />

      {task.naEnabled ? (
        <ToggleButton
          icon={() => (
            <View>
              <Text
                style={
                  readOnly
                    ? styles.readonly
                    : localTaskResponse === 'N/A'
                    ? styles.firstOption
                    : styles.secondOption
                }
              >
                {translate('taskNA')}
              </Text>
            </View>
          )}
          value="N/A"
          style={
            localTaskResponse === 'N/A'
              ? styles.firstOptionBackground
              : styles.secondOptionBackground
          }
          disabled={readOnly}
        />
      ) : null}
    </ToggleButton.Row>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  readonly: {
    textAlign: 'center',
    color: 'grey',
  },
  firstOption: {
    textAlign: 'center',
    color: 'white',
  },
  firstOptionBackground: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  secondOption: {
    textAlign: 'center',
    color: 'black',
  },
  secondOptionBackground: {
    backgroundColor: 'white',
  },
});
