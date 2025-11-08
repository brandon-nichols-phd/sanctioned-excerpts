import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

import LabelIphone from './LabelIphone';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { PrintLabel, isSamePrintLabel } from '../../../data/label';
import { isIphoneSe } from '../../../../utils/Platform';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { PSelect } from '../../../../utils/components/selects';
import { usePrinters } from '../../../hooks/use-printers';
import { usePrint } from '../../../hooks/use-print';
import { useLabels } from '../../../hooks/use-labels';
import { State } from '../../../../store/types/store-types';
import { updateCart } from '../../../../store/slices/printerSlice';
import { BOTTOM_TAB_HEIGHT, IPHONE_SE } from '../../../constants/constants';
// at top with other imports
import { translate } from '../../../data/translations';


type RenderItemProps = { item: PrintLabel; index: number };

const getLabelCountFromLabels = (plabels: PrintLabel[]): number =>
  plabels.reduce((accum, label) => accum + label.count, 0) || 0;

const keyExtractor = (item: PrintLabel) =>
  `${item.phaseId}-${item.categoryId}-${item.itemId}`;

const LabelListIphone = () => {
  const cart = useSelector((state: State) => state.printer.cart);
  const dispatch = useDispatch();

  const [
    {
      getPrintLabelsForPhase,

      phase,
      phaseOptions,
      handlePhaseChange,

      category,
      categoryOptions,
      handleCategoryChange,
    },
  ] = useLabels();

  const { isWifiEnabled, printers, printerConfig, isSearching } = usePrinters();
  const { printCart, recordPrintedLabels } = usePrint({
    printers,
    printerConfig,
    isSearching,
  });

  const printerCount = getLabelCountFromLabels(cart);

  const listMarginTop = isIphoneSe ? '10%' : 0;

  const print = async () => {
    if (printerCount === 0) {
      return;
    }
    const [printedLabels] = await printCart(cart);
    const newCart = cart.filter((label) => !printedLabels.includes(label));
    const setcartPayload = {
      newCart: newCart,
    };
    dispatch(updateCart(setcartPayload));
    recordPrintedLabels(printedLabels);
  };

  const clearAll = () => {
    dispatch(updateCart({ newCart: [] }));
  };

  const renderItem = useCallback(
    (props: RenderItemProps) => {
      const label = cart.find((cartLabel) => isSamePrintLabel(props.item, cartLabel));
      return (
        <LabelIphone label={props.item} labelInCart={label ?? null} context={phase} />
      );
    },
    [phase, cart]
  );

  const printLabels = getPrintLabelsForPhase(phase);

  return (
    <SafeAreaView style={styles.safeViewContaienr}>
      <View style={styles.categoryFitlerContainer}>
        <View style={styles.rowContainer}>
          <View style={styles.dropdownContainer}>
            <PSelect
              isMulti={false}
              placeholder={translate('selectCategory')}
              labelName="label"
              valueField={'value'}
              selected={category}
              setSelected={handleCategoryChange}
              options={categoryOptions}
              styles={pSelectStyles}
              placeholderTextColor="white"
              selectedTextColor="white"
              iconColor="white"
            />
          </View>

          <View style={styles.dropdownContainer}>
            <PSelect
              isMulti={false}
              placeholder={translate('selectPhase')}
              labelName="label"
              valueField={'value'}
              selected={phase}
              setSelected={handlePhaseChange}
              options={phaseOptions}
              styles={pSelectStyles}
              placeholderTextColor="white"
              selectedTextColor="white"
              iconColor="white"
            />
          </View>
        </View>
      </View>

      <View style={[styles.container, { marginTop: listMarginTop }]}>
        {printLabels.length ? (
          <FlatList
            data={printLabels}
            numColumns={1}
            scrollEnabled={true}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        ) : (
          <View style={styles.noLabelsContainer}>
            <Text style={styles.noLabelsTxt}>{translate('noLabelsAvailable')}</Text>
          </View>
        )}

        <View style={styles.footerContainer}>
          <View style={[styles.footer, styles.btnRow]}>
            <Button
              compact={true}
              buttonColor={'red'}
              mode={'contained'}
              textColor={'white'}
              style={styles.btn}
              labelStyle={styles.btnLabel}
              onPress={clearAll}
              disabled={printerCount === 0}
            >
              {translate('clearall')}
            </Button>

            <Button
              compact={true}
              buttonColor={'green'}
              mode={'contained'}
              textColor={'white'}
              style={styles.btn}
              labelStyle={styles.btnLabel}
              onPress={print}
              disabled={printerCount === 0}
            >
              {translate('printAll')}
            </Button>
          </View>
        </View>
        <View style={styles.bottomSpacer} />
      </View>
    </SafeAreaView>
  );
};
export default LabelListIphone;

const styles = StyleSheet.create({
  safeViewContaienr: {
    width: windowWidth,
    height: isIphoneSe ? windowHeight + 25 : windowHeight,
  },
  container: {
    width: '100%',
    height: '80%',
    display: 'flex',
    margin: '3%',
    marginTop: isIphoneSe ? '8%' : '8%',
  },
  categoryFitlerContainer: {
    height: IPHONE_SE,
    width: windowWidth,
    position: 'absolute',
    top: 0,
    borderColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_GREY,
    borderBottomWidth: 1.5,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    justifyContent: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    display: 'flex',
    marginHorizontal: '1%',
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  btnRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    marginRight: '5%',
    paddingHorizontal: '5%',
    paddingVertical: '1%',
  },
  bottomSpacer: {
    width: '100%',
    backgroundColor: 'white',
    height: BOTTOM_TAB_HEIGHT*0.5,
  },
  text: {
    flex: 1,
    justifyContent: 'center',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerContainer: {
    width: windowWidth,
    alignSelf: 'center',
    marginHorizontal: '2%',
  },
  footer: {
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    alignItems: 'center'
  },
  btn: {
    width: windowWidth * 0.425,
    textAlign: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: '4%',
  },
  btnLabel: {
    textAlign: 'center',
    fontWeight: '700',
  },
  dropdownContainer: {
    width: '45%',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    marginBottom: '2%',
  },
  BpActionsContainer: {
    height: isIphoneSe ? windowHeight * 0.065 : windowHeight * 0.045,
    width: windowWidth,
    position: 'absolute',
    top: isIphoneSe ? windowHeight * 0.065 : windowHeight * 0.04,
    borderColor: '#aaaaaa',
    borderBottomWidth: 1.5,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  queueDropdownContainer: {
    width: '50%',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginVertical: '2%',
  },
  searchPrinterBtn: {
    height: '85%',
    textAlign: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  searchPrinterBtnLabel: {
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
    height: '50%',
  },
  searchPrinterBtnContainer: {
    width: '40%',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  noLabelsContainer: {
    width: '100%',
    height: '80%',
    display: 'flex',
    margin: '3%',
    marginTop: windowHeight * 0.04,
  },
  noLabelsTxt: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
});

const pSelectStyles = StyleSheet.create({
  container: {
    width: '90%',
    height: '25%',
    marginLeft: '10%',
  },
  boxStyles: {
    width: '100%',
    height: '100%',
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
    height: '95%',
    backgroundColor: 'white',
  },
  dropdownItemStyles: {
    marginHorizontal: 10,
    borderBottomWidth: 0.6,
    borderBottomColor: 'grey',
    backgroundColor: 'grey',
  },
});
