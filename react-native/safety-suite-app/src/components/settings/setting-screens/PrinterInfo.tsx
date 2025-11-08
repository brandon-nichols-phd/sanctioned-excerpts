import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Menu, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

import { platformIOS, showToast } from '../../../../utils/utils';
import { windowWidth } from '../../../../utils/Dimensions';
import { State, labelSizePayload } from '../../../../store/types/store-types';
import { setLabelSize } from '../../../../store/slices/labelSlice';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { ToastTypes } from '../../../types/app';
import { usePrinters } from '../../../hooks/use-printers';
import { SearchPrinters } from '../../headers/label-headers/SearchPrinters';
import { translate } from '../../../data/translations';

const PRINTER_OPTIONS = [
  { key: 'zebra-bluetooth', brand: 'zebra', connection: 'bluetooth', label: 'Zebra - Bluetooth' },
  { key: 'zebra-wifi', brand: 'zebra', connection: 'wifi', label: 'Zebra - Wi-Fi' },
  { key: 'brother-bluetooth', brand: 'brother', connection: 'bluetooth', label: 'Brother - Bluetooth' },
  { key: 'brother-wifi', brand: 'brother', connection: 'wifi', label: 'Brother - Wi-Fi' },
  { key: 'bixolonupos-wifi', brand: 'bixolonupos', connection: 'wifi', label: 'Bixolon SRPS300 - Wi-Fi' },
  { key: 'bixolon-bluetooth', brand: 'bixolon', connection: 'bluetooth', label: 'Bixolon DX220 - Bluetooth' },
];
const LABEL_SIZE_OPTIONS = [
  { key: '1x1', label: '1x1' },
  { key: '1x1.25', label: '1x1.25' },
  { key: '2x1', label: '2x1' },
];

const getPrinterOptionKeyFromConfig = (config?: { brand?: string; connection?: string }) => {
  if (!config?.brand || !config?.connection) return 'zebra-bluetooth'; // default
  return `${config.brand}-${config.connection}`;
};

const PrinterInfo = () => {
  const [labelMenuVisible, setLabelMenuVisible] = useState(false);
  const labelStateSize = useSelector((state: State) => state.labels.labelSize);
  const selectedLabelSizeLabel =
    LABEL_SIZE_OPTIONS.find(o => o.key === labelStateSize)?.label ??
    translate('settingsPrinterSelectLabelSize') ?? 'Select Label Size';
  const selectedLocationId = useSelector(
    (state: State) => state.context.locationId
  );

  const dispatch = useDispatch();
  const {
    printerConfig,
    dateOfLastSearch,
    searchPrinters,
    userShouldSearchPrinters,
    printers,
    updatePrinterConfig,
    isSearching,
  } = usePrinters();

  const [printerOptionKey, setPrinterOptionKey] = useState(
    getPrinterOptionKeyFromConfig(printerConfig)
  );

  const [printerMenuVisible, setPrinterMenuVisible] = useState(false);

  useEffect(() => {
    setPrinterOptionKey(getPrinterOptionKeyFromConfig(printerConfig));
  }, [printerConfig?.brand, printerConfig?.connection]); 

  const handleLabelSizeChange = useCallback(
    (labelSize: string) => {
      if (labelSize !== labelStateSize) {
        dispatch(setLabelSize({ size: labelSize } as labelSizePayload));
        showToast({
          type: ToastTypes.SUCCESS,
          txt1: translate('settingsPrinterSuccessToastTxt1'),
          txt2: translate('settingsPrinterSuccessToastTxt2', { labelSize }),
        });
      }
    },
    [dispatch, labelStateSize]
  );
  const handlePrinterSettingChange = useCallback(
    async (newKey: string) => {
      setPrinterOptionKey(newKey);

      const option = PRINTER_OPTIONS.find(o => o.key === newKey);
      if (!option || !selectedLocationId) {
        return;
      }

      try {
        await updatePrinterConfig({
          locationId: selectedLocationId,
          printer_brand: option.brand,
          printer_connection: option.connection,
        });

        showToast({
          type: ToastTypes.SUCCESS,
          txt1: translate('settingsPrinterSavedTitle') ?? 'Printer settings updated',
          txt2: `${option.label} ${translate('settingsPrinterSaved')}`,
        });
      } catch (e) {
        console.error('Failed to save printer config', e);
        showToast({
          type: ToastTypes.ERROR,
          txt1: translate('settingsPrinterErrorTitle'),
          txt2: translate('settingsPrinterErrorSaving'),
        });
      }
    },
    [selectedLocationId, updatePrinterConfig]
  );

  const selectedPrinterLabel =
    PRINTER_OPTIONS.find(o => o.key === printerOptionKey)?.label ??
    translate('settingsPrinterSelectPrinter');

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.formField}>
          <Text style={styles.txtLabel}>{translate('settingsPrinterLastSearch')}</Text>
          <Text style={[styles.bold, styles.fieldValue]}>
            {dateOfLastSearch
              ? dateOfLastSearch.toLocaleString()
              : translate('settingsPrinterUnknownSearch')}
          </Text>
        </View>
        <View style={styles.formField}>
          <Text style={styles.txtLabel}>{translate('settingsPrinterLastSearchName')} </Text>
          <View style={[styles.printersListContainer, styles.fieldValue]}>
            {printers.length === 0 ? (
              <Text style={styles.itemText}> {translate('settingsPrinterNoPrintersSearch')} </Text>
            ) : (
              printers.map((printer) => (
                <Text key={printer.id} style={styles.itemText}> {printer.name} </Text>
              ))
            )}
          </View>
        </View>
        <View style={styles.searchBPViewContainer}>
          <SearchPrinters search={searchPrinters} showAlert={userShouldSearchPrinters} isSearching={isSearching}/>
        </View>
      </View>
      <View style={styles.sectionDivider} />
      <View style={[styles.formField, styles.formFieldColumn]}>
        <Text style={styles.labelSizeTxt}>{translate('PrinterSettings')}</Text>
        <Menu
          visible={printerMenuVisible}
          onDismiss={() => setPrinterMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setPrinterMenuVisible(true)}
              style={styles.printerPickerButton}
              contentStyle={styles.printerPickerButtonContent}
            >
              {selectedPrinterLabel}
            </Button>
          }
        >
          {PRINTER_OPTIONS.map(option => (
            <Menu.Item
              key={option.key}
              onPress={async () => {
                setPrinterMenuVisible(false);
                await handlePrinterSettingChange(option.key);
              }}
              title={option.label}
            />
          ))}
        </Menu>
      </View>
      {['zebra', 'bixolon', 'bixolonupos', 'brother'].includes(printerConfig.brand) && (
        <View style={[styles.formField, styles.formFieldColumn]}>
          <Text style={styles.labelSizeTxt}>{translate('settingsPrinterLabelSize')}</Text>

          <Menu
            visible={labelMenuVisible}
            onDismiss={() => setLabelMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setLabelMenuVisible(true)}
                style={styles.printerPickerButton}
                contentStyle={styles.printerPickerButtonContent}
              >
                {selectedLabelSizeLabel}
              </Button>
            }
          >
            {LABEL_SIZE_OPTIONS.map(option => (
              <Menu.Item
                key={option.key}
                onPress={() => {
                  setLabelMenuVisible(false);
                  handleLabelSizeChange(option.key);  // same auto-save logic
                }}
                title={option.label}
              />
            ))}
          </Menu>
        </View>
      )}
    </View>
  );
};

export default PrinterInfo;

const styles = StyleSheet.create({
  container: {
    margin: '5%',
  },
    formFieldColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  printerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  printerOptionLabel: {
    fontSize: platformIOS.isPad ? 16 : 14,
  },
  printerPickerButton: {
    marginTop: 8,
    marginBottom: 4,
  },
  printerPickerButtonContent: {
    justifyContent: 'space-between',
  },
  formField: {
    marginVertical: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 15,
  },
  btnGroup: {
    justifyContent: 'center',
    alignSelf: 'center',
    margin: '3%',
  },
  btn: {
    margin: 22,
    padding: 2,
    textAlign: 'center',
    width: platformIOS.isPad ? windowWidth * 0.15 : windowWidth * 0.6,
    height: 45,
  },
  rbtn: {
    margin: 22,
    padding: 2,
    textAlign: 'center',
    width: 140,
    height: 45,
  },
  section: {
    fontSize: platformIOS.isPad ? 26 : 20,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: '3%',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  txtLabel: {
    fontWeight: 'bold',
    marginVertical: 10,
    marginRight: platformIOS.isPad ? 50 : '3%',
    fontSize: platformIOS.isPad ? 18 : 16,
  },
  bold: {
    marginVertical: 10,
  },
  searchBPViewContainer: { alignItems: 'flex-start', alignSelf: 'flex-start',},
  labelSizeTxt: {
    fontWeight: 'bold',
    marginRight: platformIOS.isPad ? 25 : '10%',
    marginTop: 15,
    fontSize: platformIOS.isPad ? 18 : 16,
  },
  labelSizeTxtUnbolded: {
    marginRight: platformIOS.isPad ? 25 : '10%',
    marginTop: 15,
    fontSize: platformIOS.isPad ? 18 : 16,
  },
  toggleRowContainer: { justifyContent: 'center', width: windowWidth * 0.1 },
  toggleButtonView: { width: '100%' },
  toggleTxt: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 16 : 14,
    margin: '2%',
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_GREY,
    marginVertical: 16,
    width: '100%',
  },
  toggleButtonLarge: {
    textAlign: 'center',
    fontSize: platformIOS.isPad ? 16 : 12,
    margin: '2%',
    fontWeight: '600',
  },
  list: {
    marginTop: 20,
  },
  fieldValue: {
    flexShrink: 0,
  },
  printersListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  itemText: {
    padding: 10,
  },
});
