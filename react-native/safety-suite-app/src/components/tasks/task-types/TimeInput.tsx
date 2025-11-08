import React, { FC, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import moment from 'moment';
import { Button } from 'react-native-paper';
import DatePicker from 'react-native-date-picker';

import { platformIOS } from '../../../../utils/utils';
import { globalStyles } from '../../../../utils/styles';
import { Task } from '../../../data/task';
import { translate } from '../../../data/translations';

const TIME_FORMAT = 'HH:mm:ss';
const DISPLAY_TIME_FORMAT = 'h:mm a';

type Props = {
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
};

const formatTime = (epoch: number) => moment(epoch).format(TIME_FORMAT);

const responseToDisplayFormat = (time: string) =>
  moment(time, TIME_FORMAT).format(DISPLAY_TIME_FORMAT);

/**
 * Note:
 * task response for this will be a string representation of a time that follows TIME_FORMAT
 */
const TimeInput: FC<Props> = ({ task, readOnly, saveResponse }) => {
  const [value, setValue] = useState<Date>(new Date());
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const isValidResponse = task.taskResponse !== '';
    const newDate = isValidResponse
      ? moment(task.taskResponse, TIME_FORMAT).toDate()
      : new Date();
    setValue(newDate);
  }, [task.taskResponse]);

  const save = useCallback(
    (newValue: string) => {
      saveResponse(newValue);
    },
    [saveResponse]
  );

  const handleSave = useCallback(
    (date: Date) => {
      setOpen(false);
      const currValue = formatTime(date.valueOf());
      save(currValue);
    },
    [save]
  );

  return (
    <View style={styles.container}>
      {/*
        will display time picker as a modal to make it obvious to user
        when the task is considered complete
      */}
      {open ? (
        <DatePicker
          modal
          open={open}
          date={value}
          onConfirm={handleSave}
          onCancel={() => {
            setOpen(false);
          }}
          confirmText={translate('saveButtonText')}
          mode="time"
          locale="en_US"
        />
      ) : null}

      {/* only show button to add time if there is no response */}
      {!task.taskResponse ? (
        <View style={styles.btnContainer}>
          <Button
            onPress={() => {
              setOpen(true);
            }}
            disabled={readOnly}
            textColor="grey"
            buttonColor={'white'}
            labelStyle={styles.btnLabel}
          >
            {translate('taskTimeAddTime')}
          </Button>
        </View>
      ) : null}

      {/* displays saved time as DISPLAY_TIME_FORMAT defined above */}
      {task.taskResponse ? (
        <Pressable
          onPress={() => {
            setOpen(true);
          }}
          style={styles.dateContainer}
        >
          <Text style={styles.dateText}>
            {responseToDisplayFormat(task.taskResponse)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default TimeInput;

const styles = StyleSheet.create({
  container: {
    ...globalStyles.row,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: 'white',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '3%',
    padding: '2%',
  },
  dateText: {
    fontSize: platformIOS.isPad ? 21 : 18,
    fontWeight: '500',
    color: 'black',
    alignSelf: 'center',
    textAlign: 'center',
    padding: '.5%',
    justifyContent: 'center',
  },
  btnContainer: {
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: '3%',
  },
  btnLabel: {
    fontWeight: 'bold',
  },
});
