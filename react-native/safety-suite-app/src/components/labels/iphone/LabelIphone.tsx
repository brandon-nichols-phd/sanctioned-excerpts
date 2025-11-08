import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { IconButton, Surface, Tooltip } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import RNDateTimePicker from '@react-native-community/datetimepicker';

import { ACTIVE_COLORS, PrintLabel } from '../../../data/label';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { windowHeight } from '../../../../utils/Dimensions';
import { globalStyles } from '../../../../utils/styles';
import { addLabelToPrinter, removeFromCart } from '../../../../store/slices/printerSlice';

type LabelIphoneProps = {
  label: PrintLabel;
  labelInCart: PrintLabel | null;
  context: string;
};

const LabelIphone = React.memo((props: LabelIphoneProps) => {
  const { label, labelInCart } = props;

  const printLabel = labelInCart ?? label;

  const [expirationDate, setExpirationDate] = useState(printLabel.expirationDate);

  const dispatch = useDispatch();

  const dynamicStyles = StyleSheet.create({
    label: {
      padding: 2,
      width: '100%',
      height: '95%',
      justifyContent: 'center',
      textAlign: 'center',
      borderRadius: 7,
      backgroundColor: printLabel.colorBackground || ACTIVE_COLORS.default,
    },
  });

  const updateLabel = useCallback(
    (cnt: number, dt: Date) => {
      if (cnt === 0) {
        const payload = {
          label: printLabel,
        };
        dispatch(removeFromCart(payload));
      } else {
        const payload = {
          label: {
            ...printLabel,
            count: cnt,
            expirationDate: dt.getTime(),
          },
        };
        dispatch(addLabelToPrinter(payload));
      }
      setExpirationDate(dt.getTime());
    },
    [printLabel, dispatch]
  );

  const handleUpdateCount = useCallback(
    (val: number) => {
      const newCnt = Math.max(printLabel.count + val, 0);
      updateLabel(newCnt, new Date(expirationDate));
    },
    [printLabel.count, expirationDate, updateLabel]
  );

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Surface style={dynamicStyles.label} elevation={3}>
          <Text style={styles.text}>{printLabel.name}</Text>
        </Surface>
      </View>

      <View style={styles.datePhasecontainer}>
        <Tooltip title={label.context}>
          <Text style={styles.phaseLabel} numberOfLines={2}>
            {label.context}
          </Text>
        </Tooltip>

        <RNDateTimePicker
          onChange={(event) => {
            if (event.nativeEvent.timestamp) {
              updateLabel(printLabel.count, new Date(event.nativeEvent.timestamp));
            }
          }}
          value={new Date(expirationDate)}
          minimumDate={new Date()}
          accentColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
          textColor={'black'}
          mode={'date'}
          style={styles.datePicker}
        />
      </View>

      <View style={[styles.btnGroup, styles.iconBtnMargin]}>
        <IconButton
          icon="minus"
          iconColor={'black'}
          size={20}
          mode="contained"
          onPress={() => {
            handleUpdateCount(-1);
          }}
          style={styles.btn}
        />

        <Text style={[styles.text, styles.countText]}>{printLabel.count}</Text>

        <IconButton
          icon="plus"
          iconColor={'black'}
          size={20}
          mode="contained"
          onPress={() => {
            handleUpdateCount(1);
          }}
          style={styles.btn}
        />
      </View>
    </View>
  );
});

export default LabelIphone;

const styles = StyleSheet.create({
  countText: { marginTop: '5%', fontSize: 16, color: 'black' },
  iconBtnMargin: { marginTop: '3%' },
  datePicker: {
    width: 85,
    height: 45,
    color: 'white',
  },
  btn: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'center',
  },
  date: {
    flex: 0.5,
    width: '100%',
    alignContent: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginLeft: '8%',
    flexWrap: 'wrap',
    marginBottom: '2.5%',
  },
  btnGroup: {
    flex: 1.5,
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    padding: 4,
    textAlign: 'center',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    paddingHorizontal: '1%',
  },
  labelContainer: {
    width: '25%',
    height: windowHeight * 0.1,
    marginLeft: 0,
    flex: 0.75,
  },
  phaseLabel: {
    textAlign: 'center',
    marginHorizontal: '1%',
    fontWeight: '600',
  },
  datePhasecontainer: {
    ...globalStyles.column,
    flex: 0.5,
    width: '100%',
    alignContent: 'center',
    textAlign: 'center',
    flexWrap: 'wrap',
    marginBottom: '2.5%',

    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: '12%',
  },
});
