import React, { FC, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

import { State } from '../../../../store/types/store-types';
import { ListObject, Location, User } from '../../../types/app';
import { Task } from '../../../data/task';
import { PSelect } from '../../../../utils/components/selects';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { translate } from '../../../data/translations';

type Props = {
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
};

const UserSelect: FC<Props> = ({ task, readOnly, saveResponse }) => {
  const [selected, setSelected] = useState<string>(task.taskResponse);

  // TODO: pass these down as props
  const users = useSelector((state: State) => state.user.users);
  const locationId = useSelector((state: State) => state.context.locationId);

  useEffect(() => {
    if (task.taskResponse) {
      setSelected(task.taskResponse);
    }
  }, [task.taskResponse]);

  const userOptions = useMemo(() => {
    return users
      .filter((user: User) => {
        const locationIds: number[] = user.locations.map(
          (loc: Location) => loc.locationId
        );
        return locationIds.includes(locationId ?? -1);
      })
      .map((user: User) => ({
        label: user.name,
        value: user.name,
      }))
      .filter((user: ListObject) => user.label && user.value);
  }, [users, locationId]);

  useEffect(() => {
    if (selected) {
      saveResponse(selected);
    }
  }, [selected, saveResponse]);

  return (
    <PSelect
      isMulti={false}
      placeholder={translate('selectText')}
      labelName="label"
      valueField={'value'}
      selected={selected}
      setSelected={(newSelection: string) => {
        if (newSelection) {
          setSelected(newSelection);
        }
      }}
      options={userOptions}
      styles={selectStyles}
      maxHeight={windowHeight * 0.8}
      disabled={readOnly}
    />
  );
};

export default UserSelect;

const selectStyles = StyleSheet.create({
  container: {
    width: windowWidth * 0.2,
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
    backgroundColor: 'grey',
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
