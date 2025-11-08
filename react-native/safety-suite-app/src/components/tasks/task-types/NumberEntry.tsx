import React, { FC, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { platformIOS } from '../../../../utils/utils';
import { globalStyles } from '../../../../utils/styles';
import NumberEntryModal from '../modals/NumberEntryModal';
import { Task } from '../../../data/task';
import { windowWidth } from '../../../../utils/Dimensions';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';

const NumberEntry: FC<{
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
}> = ({ task, readOnly, saveResponse }) => {
  const [value, setValue] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const isValid = isNumberTaskResponseValid(task.taskResponse);
    if (isValid) {
      setValue(task.taskResponse);
    }
  }, [task.taskResponse]);

  const save = (res: string) => {
    // avoid delay on saving
    // will fire after all the frames have flushed
    requestAnimationFrame(() => {
      saveResponse(res);
    });
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const onSave = (val: string) => {
    closeModal();
    const hasNumber = isNumberTaskResponseValid(val);
    if (val && hasNumber) {
      save(val);
    } else {
      // reset to previous value if value is invalid
      const prev = task.taskResponse;
      const prevIsValid = isNumberTaskResponseValid(prev);
      if (prevIsValid) {
        setValue(prev);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          setShowModal(!showModal);
        }}
        disabled={readOnly}
      >
        <Text
          style={[
            styles.text,
            value ? styles.hasNumberColor : styles.defaultNumberColor,
            readOnly ? styles.disabledBorderColor : styles.enabledBorderColor,
          ]}
        >
          {value || '0.00'}
        </Text>
      </Pressable>

      {showModal ? (
        <NumberEntryModal
          name={task.name}
          description={task.description || ''}
          value={value}
          onChange={setValue}
          showModal={showModal}
          onSave={onSave}
          onCancel={() => {
            closeModal();
          }}
          onHide={() => {
            closeModal();
          }}
        />
      ) : null}
    </View>
  );
};

export default NumberEntry;

const styles = StyleSheet.create({
  container: {
    ...globalStyles.row,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    borderRadius: 15,
    borderWidth: 1,
    padding: '1.25%',
    width: platformIOS.isPad ? windowWidth * 0.075 : windowWidth * 0.2,
    textAlign: 'center',
  },
  hasNumberColor: { color: 'black' },
  defaultNumberColor: { color: 'grey' },
  disabledBorderColor: { borderColor: 'grey' },
  enabledBorderColor: { borderColor: 'black' },
});
