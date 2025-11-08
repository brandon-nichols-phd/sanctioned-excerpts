import React, { FC, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import PrintList from './PrintList';
import { useSelector, useDispatch } from 'react-redux';

import { PrintLabel } from '../../data/label';
import { updateCart } from '../../../store/slices/printerSlice';
import { State } from '../../../store/types/store-types';
import { CANCEL_COLOR, SAVE_COLOR, globalStyles } from '../../../utils/styles';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { ToastTypes, User } from '../../types/app';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { PSelect } from '../../../utils/components/selects';
import { platformIOS, showToast } from '../../../utils/utils';
import { usePrinters } from '../../hooks/use-printers';
import { usePrint } from '../../hooks/use-print';
import { usePrintQueues } from '../../hooks/use-print-queues';
import { useLabels } from '../../hooks/use-labels';
import { translate } from '../../data/translations';

type PrintListContainerExtraProps = {
  cartLength: number;
  onClose: () => void;
  onSave: () => void;
};

const PrintListContainer: FC<PrintListContainerExtraProps> = (props) => {
  const { cartLength, onClose, onSave } = props;

  const dispatch = useDispatch();
  const printerState = useSelector((state: State) => state.printer);
  const contextState = useSelector((state: State) => state.context);
  const currUser: User | null = useSelector((state: State) => state.user.currUser);
  const [, { clearSearch }] = useLabels();
  const { printers, printerConfig, isSearching } = usePrinters();
  const { printCart, recordPrintedLabels } = usePrint({
    printers,
    printerConfig,
    isSearching,
  });

  const locationDetailsForUser = currUser?.locations.find(
    (location) => location.locationId === contextState.locationId
  );

  const canUsePrintQueue = locationDetailsForUser?.protoFeatureFlags?.usePrintQueue;
  const canSavePrintQueue =
    locationDetailsForUser?.permissions.permissions.assignLabels ||
    locationDetailsForUser?.permissions.additionalPermissions?.assignLabels;

  const [printerCart, setPrinterCart] = useState<PrintLabel[]>(printerState.cart);
  const [cartCount, setCartCount] = useState<number>(cartLength || 0);

  // send to printer res
  const [selectedQueue, setSelectedQueue] = useState('');

  const { queues, getQueueLabels } = usePrintQueues();

  const isCartEmpty = printerCart.length === 0;
  const isAppOnline = contextState.online;

  useEffect(() => {
    const selectedQueueAsInt = parseInt(selectedQueue, 10);
    const printableLabels: PrintLabel[] | null = getQueueLabels(selectedQueueAsInt);
    if (printableLabels !== null) {
      setPrinterCart(printableLabels);
      const payload: any = { newCart: printableLabels };
      dispatch(updateCart(payload));
    }
  }, [selectedQueue, dispatch, getQueueLabels]);

  useEffect(() => {
    const count = printerState.cart.reduce((accum, label) => accum + label.count, 0);

    setCartCount(count);
    setPrinterCart(printerState.cart);

    // reset queue selection after printing
    if (!printerState.cart.length) {
      setSelectedQueue('');
    }
  }, [printerState.cart]);

  const clearCart = useCallback(() => {
    setSelectedQueue('');
    setPrinterCart([]);
    const payload: any = { newCart: [] };
    dispatch(updateCart(payload));
  }, [dispatch]);

  const handleClose = () => {
    // if closing modal
    // update store with changes from printList Cart
    const payload: any = { newCart: printerCart };
    dispatch(updateCart(payload));
    onClose();
  };

  const handlePrintAll = async () => {
    const [printedLabels] = await printCart(printerCart);
    const newCart = printerCart.filter((label) => !printedLabels.includes(label));

    setPrinterCart(newCart);
    const payload: any = { newCart };
    dispatch(updateCart(payload));

    if (newCart.length > 0) {
      showToast({
        type: ToastTypes.ERROR,
        txt1: 'Some labels did not print and were kept on the queue',
        txt2: 'Search for printers and try again',
      });
    } else {
      clearSearch();
    }

    recordPrintedLabels(printedLabels);
  };

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
              Labeling Print Queue
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
              {cartCount > 0
                ? translate('subtitleHasItems')
                : translate('subtitleEmpty')}
            </Text>
          </View>

          {canUsePrintQueue && (
            <View>
              <PSelect
                isMulti={false}
                placeholder={
                  isAppOnline ? translate('selectSavedQueue') : translate('connectWifi')
                }
                labelName="label"
                valueField="value"
                selected={selectedQueue}
                setSelected={setSelectedQueue}
                options={queues.map((queue) => ({
                  label: queue.name,
                  value: queue.id.toString(),
                }))}
                disabled={!isAppOnline}
                styles={styles}
              />
            </View>
          )}
        </View>
        <View style={{ flex: 0.5 }}>
          <Button
            style={styles.closeBtn}
            onPress={handleClose}
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
        <PrintList
          printerCart={printerCart}
          setPrinterCart={setPrinterCart}
          setCartCount={setCartCount}
          cartCount={cartCount}
        />
      </View>

      <View style={[globalStyles.row, { justifyContent: 'center', top: '1%' }]}>
        <Pressable onPress={clearCart}>
          <View style={styles.buttonGroup}>
            <Button
              style={styles.button}
              accessibilityLabel={translate('clear')}
              mode="contained"
              compact={true}
              buttonColor={CANCEL_COLOR}
              labelStyle={{ fontWeight: '600', fontSize: 20 }}
            >
              {translate('clear')}
            </Button>
          </View>
        </Pressable>

        {canUsePrintQueue && (
          <Pressable
            onPress={onSave}
            disabled={isCartEmpty || !canSavePrintQueue || !isAppOnline}
          >
            <View style={styles.buttonGroup}>
              <Button
                style={styles.button}
                accessibilityLabel={translate('save')}
                mode="contained"
                compact={true}
                disabled={isCartEmpty || !canSavePrintQueue || !isAppOnline}
                buttonColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
                labelStyle={{ fontWeight: '600', fontSize: 20 }}
              >
                {translate('save')}
              </Button>
            </View>
          </Pressable>
        )}
        <Pressable onPress={handlePrintAll} disabled={isCartEmpty}>
          <View style={styles.buttonGroup}>
            <Button
              style={styles.button}
              labelStyle={{ fontWeight: '600', fontSize: 20 }}
              accessibilityLabel={translate('printAll')}
              mode="contained"
              compact={true}
              disabled={isCartEmpty}
              buttonColor={SAVE_COLOR}
            >
              {translate('printcart')}
            </Button>
          </View>
        </Pressable>
      </View>
    </>
  );
};

export default PrintListContainer;

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
    width: windowWidth * 0.22,
    height: windowHeight * 0.075,
    borderRadius: 15,
    fontSize: 24,
    fontWeight: '600',
  },
  closeBtn: {
    textAlign: 'center',
    width: windowWidth * 0.05,
    backgroundColor: 'transparent',
  },
  container: {
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: windowWidth * 0.45,
    marginTop: '2%',
    marginBottom: platformIOS.isPad ? '2%' : windowHeight * 0.025,
  },
  dropdown: {
    width: platformIOS.isPad ? windowWidth * 0.2 : windowWidth * 0.65,
    height: platformIOS.isPad ? 50 : 45,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    marginTop: -15,
  },
  placeholderDisabledTextColor: {
    color: PATHSPOT_COLORS.PATHPOT_ORANGE_BROWN,
  },
});
