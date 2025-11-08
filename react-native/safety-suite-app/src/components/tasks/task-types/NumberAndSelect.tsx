import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import NumberEntryModal from '../modals/NumberEntryModal';
import { ListObject } from '../../../types/app';
import { Task } from '../../../data/task';
import { PSelect } from '../../../../utils/components/selects';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { platformIOS } from '../../../../utils/utils';
import { globalStyles } from '../../../../utils/styles';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { isNumberTaskResponseValid } from '../../../../utils/task-utils';
import { translate } from '../../../data/translations';

type Props = {
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
};

type ResponseObject = { number: string; selectedOption: string };

/**
 *
 * @param number value user entered
 * @param selectedOption selected option user selected
 * @returns json string of number and selected response obj as ResponseObject type above
 */
const formatResponseToSave = (number: string, selectedOption: string) => {
  return `{"number": "${number}", "selectedOption": "${selectedOption}"}`;
};

const getResponseObject = (task: Task): ResponseObject => {
  if (!task.taskResponse || task.skipped) {
    return { number: '', selectedOption: '' };
  }

  return JSON.parse(task.taskResponse) as ResponseObject;
};

/**
 * A composite task type that allows a number and select options
 * as a single response
 *
 * The select can be any list of values
 * the number is similarly implemented as number entry task type
 */
export const NumberAndSelect = (props: Props) => {
  const respObj = getResponseObject(props.task);
  const [number, setNumber] = useState<string>(respObj.number);

  const selectOptions: ListObject[] =
    props.task.options?.map((val: string) => ({
      label: val,
      value: val,
    })) || [];

  const defOptions =
    selectOptions.length && selectOptions[0]?.value
      ? (selectOptions[0].value as string)
      : '';

  const [selectedOption, setSelectedOption] = useState<string>(
    respObj.selectedOption ? respObj.selectedOption : defOptions
  );
  const [showNumberModal, setShowNumberModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleNumberOnChange = useCallback(
    (val: string) => {
      const isNumberValid = isNumberTaskResponseValid(val);
      if (isNumberValid) {
        setShowNumberModal(false);
        setNumber(val);
        setError('');
      } else {
        setError('Invalid number entry.');
        return;
      }

      // if both, save
      if (val && selectedOption) {
        const response = formatResponseToSave(val, selectedOption);
        props.saveResponse(response);
      }
    },
    [selectedOption, props]
  );

  const handleSelectChange = useCallback(
    (value: string) => {
      if (value) {
        setSelectedOption(value);
      }

      if (!number) {
        setError('Must enter a number to complete this task.');
      } else {
        setError('');
      }

      // if both, save
      if (value && number) {
        const response = formatResponseToSave(number, value);
        props.saveResponse(response);
      }
    },
    [number, props]
  );

  return (
    <View style={styles.container}>
      {/* error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorLabel}>{error}</Text>
        </View>
      ) : null}

      <View style={globalStyles.row}>
        {/* number */}
        <Pressable
          onPress={() => {
            setShowNumberModal(!showNumberModal);
          }}
          disabled={props.readOnly}
          style={styles.numberContainer}
        >
          <Text
            style={[
              styles.text,
              number ? styles.hasNumberColor : styles.defaultNumberColor,
              props.readOnly ? styles.disabledBorderColor : styles.enabledBorderColor,
            ]}
          >
            {number || '0.00'}
          </Text>
        </Pressable>

        {/* unit select */}
        <PSelect
          isMulti={false}
          placeholder={translate('selectText')}
          labelName="label"
          valueField={'value'}
          selected={selectedOption}
          setSelected={handleSelectChange}
          options={selectOptions}
          styles={selectStyles}
          maxHeight={windowHeight * 0.8}
          disabled={props.readOnly}
        />
      </View>

      {/* number entry modal */}
      {showNumberModal ? (
        <NumberEntryModal
          name={props.task.name}
          description={props.task.description || ''}
          value={number}
          onChange={setNumber}
          showModal={showNumberModal}
          onSave={handleNumberOnChange}
          onCancel={() => {
            setShowNumberModal(false);
          }}
          onHide={() => {
            setShowNumberModal(false);
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: '500',
    borderRadius: 15,
    borderWidth: 1,
    padding: '1%',
    width: platformIOS.isPad ? windowWidth * 0.075 : windowWidth * 0.15,
    textAlign: 'center',
  },
  errorLabel: {
    color: PATHSPOT_COLORS.PATHPOT_ORANGE_BROWN,
    fontSize: 17,
    fontWeight: '700',
  },
  errorContainer: { marginVertical: '1.5%', alignSelf: 'flex-start' },
  numberContainer: { marginHorizontal: '2%' },
  hasNumberColor: { color: 'black' },
  defaultNumberColor: { color: 'grey' },
  disabledBorderColor: { borderColor: 'grey' },
  enabledBorderColor: { borderColor: 'black' },
});

const selectStyles = StyleSheet.create({
  container: {
    width: platformIOS.isPad ? windowWidth * 0.2 : windowWidth * 0.325,
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
    backgroundColor: 'red',
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
