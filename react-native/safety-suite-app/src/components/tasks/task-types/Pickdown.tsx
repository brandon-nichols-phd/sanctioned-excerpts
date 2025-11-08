import React, { FC, useMemo, useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { Task } from '../../../data/task';
import { ListObject } from '../../../types/app';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { PSelect } from '../../../../utils/components/selects';
import { platformIOS } from '../../../../utils/utils';
import { translate } from '../../../data/translations';

type PickdownProps = {
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
  isMulti?: boolean;
};

const Pickdown: FC<PickdownProps> = (props) => {
  const { task, saveResponse, readOnly, isMulti = false } = props;

  const [selected, setSelected] = useState<string>(task.taskResponse);

  useEffect(() => {
    if (task.taskResponse) {
      setSelected(task.taskResponse);
    }
  }, [task.taskResponse]);

  const { listOptions } = useMemo(() => {
    const options: ListObject[] =
      task.options?.map((val: string) => ({
        label: val,
        value: val,
      })) || [];

    return { listOptions: options };
  }, [task]);

  return (
    <PSelect
      isMulti={isMulti}
      placeholder={translate('selectText')}
      labelName="label"
      valueField={'value'}
      selected={selected}
      setSelected={(newSelection: string) => {
        if (newSelection) {
          setSelected(newSelection);
          saveResponse(newSelection);
        }
      }}
      options={listOptions}
      styles={selectStyles}
      maxHeight={windowHeight * 0.8}
      disabled={readOnly}
    />
  );
};

export default Pickdown;

const selectStyles = StyleSheet.create({
  container: {
    width: platformIOS.isPad ? windowWidth * 0.2 : windowWidth * 0.5,
    height: windowHeight * 0.04,
    borderColor: 'grey',
    borderWidth: 1,
    borderRadius: 15,
    justifyContent: 'center',
    textAlign: 'center',
    padding: '3%',
    backgroundColor: 'white',
    marginTop: '1%',
  },
  boxStyles: {
    width: '100%',
    height: '10%',
    justifyContent: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4.41,
  },
  dropdownStyles: {
    width: '100%',
    height: '95%',
    backgroundColor: 'white',
  },
  dropdownItemStyles: {
    marginHorizontal: 10,
    borderBottomWidth: 0.6,
    borderBottomColor: 'grey',
    backgroundcolor: 'grey',
  },
  selectedTextStyle: {
    textAlign: 'left',
    marginHorizontal: '2%',
  },
  placeholderStyle: {
    textAlign: 'left',
    color: 'grey',
    marginHorizontal: '2%',
  },
});
