import React, { FC, useState, useEffect, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import moment from 'moment';
import DatePicker from 'react-native-date-picker';

import { platformIOS } from '../../../../utils/utils';
import { globalStyles } from '../../../../utils/styles';
import { Task } from '../../../data/task';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';
import { translate } from '../../../data/translations';

const FORMAT_DATE = 'MM/DD/YYYY';
const formatDate = (responseDate: string) =>
  moment(parseInt(responseDate, 10)).format(FORMAT_DATE);

/**
 * Note:
 * task response for this will be a string representation of a date epoch in miliseconds
 */
const DateRecord: FC<{
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
}> = ({ task, readOnly, saveResponse }) => {
  const [value, setValue] = useState<Date>(new Date());
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const newReponse = isNumberTaskResponseValid(task.taskResponse)
      ? parseInt(task.taskResponse, 10)
      : new Date();
    const newDate = newReponse ? moment(newReponse).toDate() : new Date();
    setValue(newDate);
  }, [task.taskResponse]);

  const handleSave = useCallback(
    (date: number) => {
      saveResponse(String(moment(date).valueOf()));
    },
    [saveResponse]
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
          onConfirm={(date) => {
            setOpen(false);
            handleSave(date.valueOf());
          }}
          onCancel={() => {
            setOpen(false);
          }}
          confirmText={translate('saveButtonText')}
          mode="date"
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
            {translate('taskDateButton')}
          </Button>
        </View>
      ) : null}

      {/* displays saved time as FORMAT_DATE defined above */}
      {task.taskResponse ? (
        <Pressable
          onPress={() => {
            setOpen(true);
          }}
          style={styles.dateContainer}
        >
          <Text style={styles.dateText}>{formatDate(task.taskResponse)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default DateRecord;

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
