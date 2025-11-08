import React, { FC, useState } from 'react';
import { Pressable, StyleSheet, View, Text, Keyboard } from 'react-native';
import { Button, IconButton, TextInput } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { LabelConfigUpdate } from '../../data/label';
import { State } from '../../../store/types/store-types';
import { defaultParams } from '../../../api/utils';
import { CANCEL_COLOR, SAVE_COLOR, globalStyles } from '../../../utils/styles';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { ToastTypes } from '../../types/app';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { platformIOS, showToast } from '../../../utils/utils';
import { savePrintQueue } from '../../../api/labels';
import { translate } from '../../data/translations';

type CreatePrintQueueExtraProps = {
  onBack: () => void;
  onClose: () => void;
};

const CreatePrintQueue: FC<CreatePrintQueueExtraProps> = (props) => {
  const { onBack, onClose } = props;
  const [queueName, setQueueName] = useState('');

  const contextState = useSelector((state: State) => state.context);
  const currUser = useSelector((state: State) => state.user.currUser);
  const printerState = useSelector((state: State) => state.printer);

  return (
    <>
      <View
        style={[
          globalStyles.row,
          { justifyContent: 'flex-start', alignSelf: 'flex-start', flex: 0.6 },
        ]}
      >
        <View
          style={[
            globalStyles.row,
            {
              justifyContent: 'flex-start',
              alignSelf: 'flex-start',
              flex: 10,
              marginTop: '5%',
              marginBottom: '2%',
              left: -15,
              top: -50,
            },
          ]}
        >
          <View style={{ justifyContent: 'flex-start', alignSelf: 'flex-start' }}>
            <IconButton
              icon={'printer'}
              iconColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
              size={45}
            />
          </View>

          <View style={globalStyles.column}>
            <Text
              style={{
                fontSize: 35,
                fontWeight: '600',
                color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
                textAlign: 'left',
              }}
            >
              {translate('title')}
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '400',
                color: 'grey',
                textAlign: 'left',
                left: '.25%',
              }}
            >
              {translate('subtitle')}
            </Text>
          </View>
        </View>
        <View style={{ flex: 0.5 }}>
          <Button
            style={styles.closeBtn}
            onPress={onClose}
            labelStyle={{ fontSize: 28, textAlign: 'center' }}
            mode="contained-tonal"
            compact={true}
            buttonColor="white"
            textColor="black"
          >
            {'x'}
          </Button>
        </View>
      </View>

      <View style={{ flex: 3 }}>
        <TextInput
          onChangeText={(val) => setQueueName(val)}
          value={queueName}
          placeholderTextColor={'grey'}
          placeholder={translate('namePlaceholder')}
          textColor="black"
          underlineColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
          activeUnderlineColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
          style={platformIOS.isPad ? styles.ipadTextInput : styles.iphoneTextInput}
          onBlur={() => {
            Keyboard.dismiss();
          }}
        />
      </View>

      <View style={[globalStyles.row, { justifyContent: 'center', top: '1%' }]}>
        <Pressable onPress={onBack}>
          <View style={styles.buttonGroup}>
            <Button
              style={styles.button}
              accessibilityLabel={translate('clear')}
              mode="contained"
              compact={true}
              buttonColor={CANCEL_COLOR}
              labelStyle={{ fontWeight: '600', fontSize: 20 }}
            >
              {translate('back')}
            </Button>
          </View>
        </Pressable>
        <Pressable
          onPress={async () => {
            const requestParams = defaultParams(contextState, currUser);

            if (!requestParams) {
              showToast({ type: ToastTypes.ERROR, txt1: translate('createFailed') });
              onBack();
              return;
            }

            const newQueue = {
              name: queueName,
              contentsDoc: printerState.cart.map((label) => {
                const labelConfig: LabelConfigUpdate = {
                  itemId: label.itemId,
                  description: label.description,
                  ...(label.code && { code: label.code }),
                  categoryId: label.categoryId,
                  phaseId: label.phaseId,
                  context: label.context,
                  expiration: label.expiration,
                  expirationType: label.expirationType,
                  customDate: label.expirationDate,
                  count: label.count,
                  templateId: label.templateId,
                  ...(label.printerInfo && { printerInfo: label.printerInfo }),
                  expirationFormat: label.expirationFormat,
                  ingredients: label.ingredients,
                };
                return labelConfig;
              }),

              ...requestParams,
            };
            const response = await savePrintQueue(newQueue);
            if (response?.status === 200) {
              showToast({ type: ToastTypes.SUCCESS, txt1: translate('created') });
            } else {
              showToast({
                type: ToastTypes.ERROR,
                txt1: translate('errorTitle'),
                txt2: translate('errorHint'),
              });
            }
            onBack();
          }}
        >
          <View style={styles.buttonGroup}>
            <Button
              style={styles.button}
              accessibilityLabel={translate('save')}
              mode="contained"
              compact={true}
              buttonColor={SAVE_COLOR}
              labelStyle={{ fontWeight: '600', fontSize: 20 }}
            >
              {translate('save')}
            </Button>
          </View>
        </Pressable>
      </View>
    </>
  );
};

export default CreatePrintQueue;

const styles = StyleSheet.create({
  buttonGroup: {
    alignContent: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: '2%',
  },
  button: {
    margin: 3,
    textAlign: 'center',
    padding: 1,
    alignContent: 'center',
    justifyContent: 'center',
    width: windowWidth * 0.3,
    height: windowHeight * 0.075,
    borderRadius: 15,
    fontSize: 24,
    fontWeight: '600',
  },
  closeBtn: {
    textAlign: 'center',
    width: windowWidth * 0.05,
    backgroundColor: 'trasnparent',
  },
  ipadTextInput: {
    width: windowWidth * 0.35,
    borderBottomWidth: 1,
    borderBottomColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    textAlign: 'left',
    fontSize: 22,
    marginTop: '15%',
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_BLUE,
  },
  iphoneTextInput: {
    width: windowWidth * 0.6,
    borderBottomWidth: 1,
    borderBottomColor: 'grey',
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_BLUE,
    textAlign: 'left',
    marginBottom: '2%',
    fontSize: 16,
  },
});
