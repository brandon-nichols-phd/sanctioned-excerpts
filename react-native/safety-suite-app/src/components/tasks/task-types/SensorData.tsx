import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Button } from 'react-native-paper';

import { Task } from '../../../data/task';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { platformIOS } from '../../../../utils/utils';
import { globalStyles } from '../../../../utils/styles';
import { useSensor } from '../../../hooks/use-sensor';
import { useDisplayTemperature } from '../../../hooks/use-display-temperature';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';
import { translate } from '../../../data/translations';

type SensorDataProps = {
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
};

type SensorState = 'Read' | 'Save';

const translateSensorState = (state: SensorState): string => {
  switch (state) {
    case 'Read':
      return translate('taskSensorReadState');
    case 'Save':
      return translate('taskSensorSaveState');
  }
};

export const SensorData = ({ task, readOnly, saveResponse }: SensorDataProps) => {
  const { sensorValue, fetch } = useSensor({
    taskId: task.id,
    assignedId: task.assingedToChecklistId,
  });
  const [state, setState] = useState<SensorState>('Read');

  const isReading = state === 'Save';

  const isValidTemperature = isNumberTaskResponseValid(task.taskResponse);

  const temperature =
    (isReading ? sensorValue?.toString() : isValidTemperature ? task.taskResponse : '') ??
    '';

  const {
    showBothTemperatures,
    altDisplayTemperature,
    altDisplayTemperatureUnit,
    displayTemperature,
    displayTemperatureUnit,
    getTemperatureToSave,
  } = useDisplayTemperature({ temperature, valueIsCelsius: isReading });

  const handleReadSensor = useCallback(() => {
    if (state === 'Read') {
      fetch();
      setState('Save');
    } else {
      if (temperature) {
        saveResponse(getTemperatureToSave(temperature));
      }
      setState('Read');
    }
  }, [state, fetch, temperature, saveResponse, getTemperatureToSave]);

  return (
    <View style={[globalStyles.row, styles.container]}>
      <Button
        icon="thermometer"
        style={styles.button}
        textColor={'black'}
        buttonColor={
          state === 'Read'
            ? PATHSPOT_COLORS.PATHSPOT_TEAL
            : PATHSPOT_COLORS.PATHSPOT_BRIGHT_GREEN
        }
        compact={true}
        mode={'contained'}
        onPress={handleReadSensor}
        disabled={readOnly}
      >
        {translate('taskSensorState', { state: translateSensorState(state) })}
      </Button>

      {temperature ? (
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

const styles = StyleSheet.create({
  container: { justifyContent: 'flex-end' },
  button: {
    padding: '2%',
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
});
