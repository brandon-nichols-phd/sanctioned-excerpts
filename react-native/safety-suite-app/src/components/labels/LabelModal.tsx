import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';
import RNDateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { PrinterAddPayload, addLabelToPrinter } from '../../../store/slices/printerSlice';
import {
  ExpirationTypes,
  Label,
  OptionalFieldLabelsEnum,
  OptionalPhaseAttribute,
  OptionalPhaseAttributes,
  Phase,
  PrintLabel,
  getExpirationDate,
  getExpirationFormat,
  getExpirationAdditionalFormat,
  getPrintLabel,
} from '../../data/label';
import DialPad from '../../../utils/components/DialPad';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { ShowToastProps, platformIOS } from '../../../utils/utils';
import { globalStyles } from '../../../utils/styles';
import { ToastTypes } from '../../types/app';
import { ModalToastConfig } from '../../../utils/components/config/Toast';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { usePrinters } from '../../hooks/use-printers';
import { usePrint } from '../../hooks/use-print';
import { useLabels } from '../../hooks/use-labels';
import { translate } from '../../data/translations';


const LabelModal = (props: {
  label: Label;
  context: string;
  closeModal: () => void;
  showModal: boolean;
  showToast: (payload: ShowToastProps) => void;
  dontSubtract: boolean;
}) => {
  const [, { clearSearch }] = useLabels();
  /*
        - expiration date cant be changed
        - default count is 1
        - buttons : quick print && add to print
    */
  const { label, context, closeModal, showModal, showToast } = props;

  // label info
  const [labelNumber, setLabelNumber] = useState<string>('');
  const [desc, setDescription] = useState(label.description || '');

  // set custome date init
  const defaultCustomDate: Date = new Date();
  defaultCustomDate.setHours(23, 59, 59, 999);
  const [customDate, setCustomDate] = useState<Date>(defaultCustomDate);
  const modalRef = useRef<any>();

  // exp unless custom is set
  const contextPhase: Phase | null =
    label.phases.find((p: Phase) => p.name === context) ?? null;

  const phase: Phase | null = contextPhase ?? label.phases[0] ?? null;
  const [currPhase, setCurrPhase] = useState<Phase | null>(phase);

  const defaultExpiration = phase
    ? phase.expiration
      ? phase.expiration
      : phase.expirationAdditional
      ? phase.expirationAdditional
      : phase.expirationCustom
      ? 'Custom'
      : ''
    : '';
  const [expType, setExpirationType] = useState<ExpirationTypes | string>(
    defaultExpiration
  );
  const defaultExpirationAdditional = phase
    ? phase.expirationAdditional
      ? phase.expirationAdditional
      : phase.expiration
      ? phase.expiration
      : phase.expirationCustom
      ? 'Custom'
      : ''
    : '';
  const [expAddType, setExpirationAddType] = useState<ExpirationTypes | string>(
    defaultExpirationAdditional
  );

  const defStatus: string = phase ? phase.name : context;
  const [stat, setStatus] = useState(defStatus);
  const { printers, printerConfig, isSearching } = usePrinters();
  const { printLabel } = usePrint({ printers, printerConfig, isSearching });
  const dispatch = useDispatch();

  const [customInputs, setCustomInputs] = useState<OptionalPhaseAttributes>({});
  const updateCustomField = (field: string, value: string) => {
    setCustomInputs((prev) => ({ ...prev, [field]: value }));
  };
  // useEffect to initialize the custom fields if there are values already present. If the word custom appears,
  // initialize with an empty string, otherwise use the value from the phase info
  useEffect(() => {
    if (currPhase) {
      Object.entries(currPhase.optionalFields ?? {}).forEach(([field, value]) => {
        if (value) {
          updateCustomField(field, value);
        }
      });
    }
  }, [currPhase]);

  const handlePhaseChange = (selectedPhase: string) => {
    setStatus(selectedPhase);

    const newPhase: Phase | undefined = label.phases.find(
      (p: Phase) => p.name === selectedPhase
    );

    if (newPhase) {
      // checks in order for expiration, expiration addition, then custom
      const expiration = newPhase.expiration
        ? newPhase.expiration
        : newPhase.expirationAdditional
        ? newPhase.expirationAdditional
        : newPhase.expirationCustom
        ? 'Custom'
        : '';
      // checks in order for expiration aditional, expiration, then custom
      const expirationAdditional = newPhase.expirationAdditional
        ? newPhase.expirationAdditional
        : newPhase.expiration
        ? newPhase.expiration
        : newPhase.expirationCustom
        ? 'Custom'
        : '';
      // some phases dont have corresponding expirations
      if (expiration) {
        setExpirationType(expiration);
      }
      if (expirationAdditional) {
        setExpirationAddType(expirationAdditional);
      }
      setCurrPhase(newPhase);
    }
  };

  const addToPrint = () => {
    if (!stat || !expType) {
      Alert.alert(
        translate('selectStatusAndExpiration')
      );
      return;
    }

    const toastPayload: ShowToastProps = {
      type: ToastTypes.SUCCESS,
      txt1: translate('addedToQueue'),
      txt2: translate('openQueueHint'),
    };

    showToast(toastPayload);
    closeModal();

    // add labels to print queue
    const count: number = parseInt(labelNumber, 10) || 1;
    const expDate: number = getExpirationDate(
      expType,
      expType,
      props.dontSubtract,
      customDate
    );
    const expAddDate: number = getExpirationDate(
      expAddType,
      expAddType,
      props.dontSubtract,
      customDate
    );


    if (currPhase) {
      const expirationFormat = getExpirationFormat(currPhase, expType);
      const expirationAdditionalFormat = getExpirationAdditionalFormat(currPhase, expAddType);
      const labelToPrint = getPrintLabel(
        label,
        count,
        desc,
        stat,
        expType,
        {
          ...currPhase,
          optionalFields: {
            nutrition:
              currPhase.optionalFields?.nutrition === 'Custom'
                ? customInputs.nutrition?.trim()
                : currPhase.optionalFields?.nutrition,
            notes:
              currPhase.optionalFields?.notes === 'Custom'
                ? customInputs.notes?.trim()
                : currPhase.optionalFields?.notes,
            prepTime:
              currPhase.optionalFields?.prepTime === 'Custom'
                ? customInputs.prepTime?.trim()
                : currPhase.optionalFields?.prepTime,
            shift:
              currPhase.optionalFields?.shift === 'Custom'
                ? customInputs.shift?.trim()
                : currPhase.optionalFields?.shift,
            lotNumber:
              currPhase.optionalFields?.lotNumber === 'Custom'
                ? customInputs.lotNumber?.trim()
                : currPhase.optionalFields?.lotNumber,
            instructions:
              currPhase.optionalFields?.instructions === 'Custom'
                ? customInputs.instructions?.trim()
                : currPhase.optionalFields?.instructions,
            referenceId:
              currPhase.optionalFields?.referenceId === 'Custom'
                ? customInputs.referenceId?.trim()
                : currPhase.optionalFields?.referenceId,
            status:
              currPhase.optionalFields?.status === 'Custom'
                ? customInputs.status?.trim()
                : currPhase.optionalFields?.status,
            signature:
              currPhase.optionalFields?.signature === 'Custom'
                ? customInputs.signature?.trim()
                : currPhase.optionalFields?.signature,
          },
        },
        expDate,
        currPhase.expiration,
        expirationFormat,
        expAddDate,
        currPhase.expirationAdditional,
        expirationAdditionalFormat,
        currPhase.useAllExpirations 
      );
      const payload: PrinterAddPayload = { label: labelToPrint };
      dispatch(addLabelToPrinter(payload));
    } else {
      const noPhaseToast: ShowToastProps = {
        type: ToastTypes.INFO,
        txt1: translate('selectPhaseTryAgain'),
      };

      showToast(noPhaseToast);
    }
  };

  const print = useCallback(async () => {
    if (!stat || !expType) {
      Alert.alert(translate('selectStatusAndType'));
      return;
    }

    const count: number = parseInt(labelNumber, 10) || 1;
    const expDate: number = getExpirationDate(
      expType,
      expType,
      props.dontSubtract,
      customDate
    );
    const expAddDate: number = getExpirationDate(
      expAddType,
      expAddType,
      props.dontSubtract,
      customDate
    );

    if (currPhase) {
      const expirationFormat = getExpirationFormat(currPhase, expType);
      const expirationAdditionalFormat = getExpirationAdditionalFormat(currPhase, expAddType);

      // todo : get all occurences of this for exp format where possible
      const labelToPrint = getPrintLabel(
        label,
        count,
        desc,
        stat,
        expType,
        {
          ...currPhase,
          optionalFields: {
            nutrition:
              currPhase.optionalFields?.nutrition === 'Custom'
                ? customInputs.nutrition?.trim()
                : currPhase.optionalFields?.nutrition,
            notes:
              currPhase.optionalFields?.notes === 'Custom'
                ? customInputs.notes?.trim()
                : currPhase.optionalFields?.notes,
            prepTime:
              currPhase.optionalFields?.prepTime === 'Custom'
                ? customInputs.prepTime?.trim()
                : currPhase.optionalFields?.prepTime,
            shift:
              currPhase.optionalFields?.shift === 'Custom'
                ? customInputs.shift?.trim()
                : currPhase.optionalFields?.shift,
            lotNumber:
              currPhase.optionalFields?.lotNumber === 'Custom'
                ? customInputs.lotNumber?.trim()
                : currPhase.optionalFields?.lotNumber,
            instructions:
              currPhase.optionalFields?.instructions === 'Custom'
                ? customInputs.instructions?.trim()
                : currPhase.optionalFields?.instructions,
            referenceId:
              currPhase.optionalFields?.referenceId === 'Custom'
                ? customInputs.referenceId?.trim()
                : currPhase.optionalFields?.referenceId,
            status:
              currPhase.optionalFields?.status === 'Custom'
                ? customInputs.status?.trim()
                : currPhase.optionalFields?.status,
            signature:
              currPhase.optionalFields?.signature === 'Custom'
                ? customInputs.signature?.trim()
                : currPhase.optionalFields?.signature,
          },
        },
        expDate,
        currPhase.expiration,
        expirationFormat,
        expAddDate,
        currPhase.expirationAdditional,
        expirationAdditionalFormat,
        currPhase.useAllExpirations
      );
      try {
        await printLabel(labelToPrint);
        clearSearch();
      } catch {
        //
      }
      closeModal();
    } else {
      const noPhaseToast: ShowToastProps = {
        type: ToastTypes.INFO,
        txt1: translate('selectPhaseTryAgain'),
      };

      showToast(noPhaseToast);
    }
  }, [
    stat,
    expType,
    labelNumber,
    props.dontSubtract,
    customDate,
    currPhase,
    label,
    desc,
    customInputs.nutrition,
    customInputs.notes,
    customInputs.prepTime,
    customInputs.shift,
    customInputs.lotNumber,
    customInputs.instructions,
    customInputs.referenceId,
    customInputs.status,
    customInputs.signature,
    showToast,
    closeModal,
    printLabel,
    clearSearch,
  ]);

  const handleDialPad = (num: string) => {
    if (!num) {
      // if empty str == backspace
      const newNum: string = labelNumber.slice(0, -1);
      setLabelNumber(newNum);
    } else {
      const newNum = `${labelNumber}${num}`;
      setLabelNumber(newNum);
    }
  };

  const handleSetCount = (num: string) => {
    // only used if still using TextInput and mobile keyboard
    const cleanNumber = num.replace(/[^0-9]/g, '');

    if (cleanNumber === '0') {
      Alert.alert(translate('cannotBeLessThanOne'));
      setLabelNumber('1');
      return;
    }
    setLabelNumber(labelNumber + cleanNumber);
  };

  return (
    <View style={styles.centeredView}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => {
          closeModal();
        }}
        ref={modalRef}
      >
        <View style={styles.centeredView}>
          <View
            style={
              label.category === String(ExpirationTypes.CUSTOM)
                ? defStyles.containerCustom
                : defStyles.container
            }
          >
            <View
              style={[globalStyles.row, defStyles.flexStart, { alignItems: 'center' }]}
            >
              <View style={[globalStyles.column, { flex: 3 }]}>
                <Text style={defStyles.headerText}>
                  {label.category === String(ExpirationTypes.CUSTOM) && label.description
                    ? label.description
                    : label.name}
                </Text>
                <Text style={defStyles.headeryCategoryText}>{label.category}</Text>
              </View>
              {label.category === String(ExpirationTypes.CUSTOM) && (
                <View style={styles.centeredInputWrapper}>
                  <TextInput
                    style={styles.description}
                    onChangeText={(val) => {
                      setDescription(val);
                    }}
                    value={desc}
                    placeholder={translate('enterNameOrDescription')}
                    placeholderTextColor={'grey'}
                  />
                </View>
              )}
              <View style={defStyles.flexCloseBtn}>
                <Button
                  style={styles.closeBtn}
                  onPress={() => {
                    closeModal();
                  }}
                  labelStyle={defStyles.closeBtnLabel}
                  mode="contained-tonal"
                  compact={true}
                  buttonColor="white"
                  textColor="black"
                >
                  {'x'}
                </Button>
              </View>
            </View>

            {currPhase?.optionalFields &&
              Object.values(currPhase.optionalFields).some(
                (val) => val != null && val !== ''
              ) && (
                <View style={styles.customFieldRow}>
                  {Object.keys(currPhase.optionalFields).map((customField) => {
                    const customValue =
                      currPhase.optionalFields?.[customField as OptionalPhaseAttribute];
                    const customLabel = 
                      OptionalFieldLabelsEnum[customField as OptionalPhaseAttribute];

                    return (
                      <View style={styles.customFieldContainer} key={customField}>
                        <Text style={styles.customLabel}>{customLabel}:</Text>
                        {customValue === 'Custom' ? (
                          <TextInput
                            value={
                              customInputs[customField] === 'Custom' ||
                              customInputs[customField] == null
                                ? ''
                                : customInputs[customField]
                            }
                            onChangeText={(text) => updateCustomField(customField, text)}
                            placeholder={translate('enterAdditionalDetails')}
                            style={styles.customEditableInput}
                            placeholderTextColor="gray"
                          />
                        ) : (
                          <TextInput
                            value={customValue}
                            editable={false}
                            style={styles.disabledInput}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            <View style={styles.flexContainer}>
              <View style={styles.leftFlex}>
                <LabelStatusButtonGroup
                  stat={stat}
                  handleChange={handlePhaseChange}
                  phases={label.phases}
                />
              </View>
              <View style={styles.centerFlex}>
                <View style={styles.centerContainer}>
                  <View style={styles.textContainer}>
                    <TextInput
                      editable={false}
                      style={styles.underlineInput}
                      onChangeText={(n) => {
                        handleSetCount(n);
                      }}
                      keyboardType={'decimal-pad'}
                      value={labelNumber}
                      placeholder="1"
                      placeholderTextColor={PATHSPOT_COLORS.PATHSPOT_GREY}
                    />
                  </View>

                  {/* ---- dialpad --- */}
                  <View style={styles.dialpad}>
                    <DialPad onClick={handleDialPad} context={'labels'} />
                  </View>
                </View>
              </View>

              <View style={styles.flexRight}>
                <ExpirationsButtonGroup
                  expiration={expType}
                  setExpiration={setExpirationType}
                  setCustomDate={setCustomDate}
                  customDate={customDate}
                  phase={currPhase}
                />
              </View>
            </View>

            <View style={styles.stickyButtonGroup}>
              <Button
                style={styles.button}
                onPress={print}
                accessibilityLabel={translate('quickPrintHelp')}
                mode="contained"
                textColor="white"
                compact={true}
                labelStyle={defStyles.printLabel}
                buttonColor={PATHSPOT_COLORS.PATHSPOT_TEAL}
              >
                {translate('quickPrint')}
              </Button>

              <Button
                style={styles.button}
                labelStyle={defStyles.printLabel}
                onPress={addToPrint}
                mode="elevated"
                compact={true}
                buttonColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
                textColor="white"
                accessibilityLabel={translate('addToPrintHelp')}
              >
                {translate('addToPrint')}
              </Button>
            </View>
            <Toast config={ModalToastConfig} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LabelModal;

const ExpirationButton = (ExpButtonProps: {
  label: string;
  setExpiration: Dispatch<SetStateAction<ExpirationTypes | string>>;
  expiration: string | ExpirationTypes;
}) => {
  const { expiration, setExpiration, label } = ExpButtonProps;
  const isSelectd: boolean = expiration === label;

  return (
    <Button
      style={styles.sideBtns}
      onPress={() => {
        setExpiration(label);
      }}
      mode={isSelectd ? 'contained' : 'outlined'}
      compact={true}
      buttonColor={isSelectd ? 'purple' : 'white'}
      labelStyle={styles.labelStyle}
    >
      {label}
    </Button>
  );
};

const ExpirationsButtonGroup = (ExpirationProps: {
  expiration: ExpirationTypes | string;
  setExpiration: Dispatch<SetStateAction<ExpirationTypes | string>>;
  setCustomDate: Dispatch<SetStateAction<Date>>;
  customDate: Date;
  phase: Phase | null;
}) => {
  const { expiration, setExpiration, phase, customDate, setCustomDate } = ExpirationProps;

  /** phases based off options from current phase name selected */
  const phaseButtons: string[] = useMemo(() => {
    if (!phase) {
      return [];
    }

    const options: string[] = [];
    if (typeof phase.expiration === 'string') {
      options.push(phase.expiration);
    }

    if (phase.expirationAdditional && !options.includes(phase.expirationAdditional) && !phase.useAllExpirations) {
      options.push(phase.expirationAdditional);
    }

    if (phase.expirationCustom) {
      options.push('Custom');
    }

    return options;
  }, [phase]);

  return (
    <View style={styles.btnContainer}>
      <View
        style={
          expiration === String(ExpirationTypes.CUSTOM)
            ? expStyles.customContainer
            : expStyles.container
        }
      >
        <Text style={expStyles.expirationText}>{translate('expiration')}</Text>
      </View>
      {phaseButtons.length
        ? phaseButtons.map((exp: string) => (
            <ExpirationButton
              label={exp}
              setExpiration={setExpiration}
              expiration={expiration}
              key={exp}
            />
          ))
        : null}

      {expiration === String(ExpirationTypes.CUSTOM) && (
        <View style={styles.expButtons}>
          {/* datetime stored in utc (+5 hrs) */}
          <RNDateTimePicker
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              if (date) {
                setCustomDate(date);
              } else if (event.nativeEvent.timestamp) {
                setCustomDate(new Date(event.nativeEvent.timestamp));
              }
            }}
            value={customDate}
            accentColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
            textColor={'black'}
            mode={'datetime'}
          />
        </View>
      )}
    </View>
  );
};

const LabelStatusButtonGroup = (phaseProps: {
  stat: string;
  handleChange: (phase: string) => void;
  phases: Phase[];
}) => {
  return (
    <View style={styles.btnContainer}>
      <View style={phaseStyles.phaseContainer}>
        <Text style={phaseStyles.phaseLabel}>{translate('phases')}</Text>
      </View>

      {phaseProps.phases.length ? (
        <View style={phaseStyles.phaseBtnContainer}>
          {phaseProps.phases.map((phase: Phase) => {
            return (
              <Button
                key={phase.name}
                style={styles.sideBtns}
                onPress={() => {
                  phaseProps.handleChange(phase.name);
                }}
                mode={phaseProps.stat === phase.name ? 'contained' : 'outlined'}
                compact={true}
                buttonColor={phaseProps.stat === phase.name ? 'purple' : 'white'}
                labelStyle={phaseStyles.phaseBtnLabel}
              >
                {phase.name}
              </Button>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  underlineInput: {
    borderColor: PATHSPOT_COLORS.PATHSPOT_GREY,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignContent: 'center',
    padding: '3%',

    marginBottom: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 2,
  },
  stickyButtonGroup: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  ModalView: {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 5,
    width: windowWidth * 0.8,
    height: windowHeight * 0.8,
    padding: 25,
    zIndex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonGroup: {
    display: 'flex',
    flexDirection: 'row',
  },
  button: {
    margin: 5,
    padding: 5,
    textAlign: 'center',
    width: windowWidth * 0.25,
    borderRadius: 15,
  },
  flexContainer: {
    flexDirection: 'row',
    width: windowWidth * 0.7,
    height: windowHeight * 0.5,
    marginTop: 5,
  },
  leftFlex: {
    flex: 1,
    marginTop: 0,
  },
  centerFlex: {
    flex: 2,
    padding: 45,
    margin: 25,
    justifyContent: 'center',
    marginTop: -10,
  },
  btnContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12, 
    marginTop: 16,
  },
  sideBtns: {
    margin: 3,
    padding: 2,
    textAlign: 'center',
    width: windowWidth * 0.155,
  },
  expButtons: {
    margin: 3,
    padding: 2,
    textAlign: 'center',
    left: -windowWidth * 0.02,
  },
  closeBtn: {
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flexDirection: 'column',
    width: windowWidth * 0.3,
    height: windowHeight * 0.55,
    padding: 8,
  },
  textContainer: {
    alignSelf: 'center',
    marginTop: 25,
    paddingVertical: 10,
    width: windowWidth * 0.175,
    flexDirection: 'row',
  },
  customLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#888888',
    fontStyle: 'italic',
    borderRadius: 8,
    fontSize: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 50,
    borderColor: '#888888',
    marginBottom: 5,
  },
  dialpad: {
    justifyContent: 'center',
    alignSelf: 'center',
    zIndex: 2
  },
  centeredInputWrapper: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  description: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_BLUE,
    borderRadius: 10,
    fontSize: 16,
    padding: 16,
    marginVertical: 10,
    minWidth: 360,
    maxWidth: 620,
  },
  customFieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 5,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  customFieldContainer: {
    flex: 1,
    marginHorizontal: 5,
    width: '30%',
  },
  customEditableInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    fontSize: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 50,
    borderColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    marginBottom: 5,
  },
  labelStyle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const defStyles = StyleSheet.create({
  container: {
    ...styles.ModalView,
    height: styles.ModalView.height,
    paddingBottom: 100,
  },
  containerCustom: {
    ...styles.ModalView,
    height: windowHeight * 0.87,
    paddingBottom: 100,
  },
  flexStart: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  flexCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  closeBtnLabel: {
    fontSize: 28,
    textAlign: 'center',
  },
  headerText: {
    fontSize: 40,
    fontWeight: '600',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    textAlign: 'left',
  },
  headeryCategoryText: {
    fontSize: 30,
    fontWeight: '500',
    color: 'grey',
    textAlign: 'left',
    left: '1%',
    alignSelf: 'flex-start',
  },
  printLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

const expStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: '7%',
  },
  customContainer: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: '3%',
    left: -windowWidth * 0.025,
  },
  expirationText: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 24 : 20,
    fontWeight: 'bold',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
});

const phaseStyles = StyleSheet.create({
  phaseContainer: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: '7%',
  },
  phaseLabel: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 24 : 20,
    fontWeight: 'bold',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  phaseBtnContainer: { justifyContent: 'center', alignSelf: 'center' },
  phaseBtnLabel: { fontSize: 18, fontWeight: 'bold' },
});