import React, { FC, useCallback, useState, useEffect } from 'react';
import { StyleSheet, Keyboard } from 'react-native';
import { TextInput } from 'react-native-paper';

import { PATHSPOT_COLORS } from '../../../constants/constants';
import { platformIOS, showToast } from '../../../../utils/utils';
import { ToastTypes } from '../../../types/app';
import { Task } from '../../../data/task';
import { windowWidth } from '../../../../utils/Dimensions';
import { translate } from '../../../data/translations';

const TaskInput: FC<{
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
}> = ({ task, readOnly, saveResponse }) => {
  const [value, setValue] = useState<string>(task.taskResponse);

  useEffect(() => {
    if (task.taskResponse) {
      setValue(task.taskResponse);
    }
  }, [task.taskResponse]);

  const save = useCallback(
    (valueToSave: Task['taskResponse']) => {
      saveResponse(valueToSave);
      showToast({
        type: ToastTypes.SUCCESS,
        txt1: translate('taskSaveSuccessToast', { name: task.name || task.description }),
      });
    },
    [saveResponse, task.description, task.name]
  );

  return (
    <TextInput
      onChangeText={setValue}
      value={value}
      placeholderTextColor={'grey'}
      label={translate('taskInputLabel')}
      textColor="black"
      underlineColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
      activeUnderlineColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
      style={platformIOS.isPad ? styles.ipad : styles.iphone}
      onBlur={() => {
        save(value);
        Keyboard.dismiss();
      }}
      disabled={readOnly}
    />
  );
};

export default TaskInput;

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
});
