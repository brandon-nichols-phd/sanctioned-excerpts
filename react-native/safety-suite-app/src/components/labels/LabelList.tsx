import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';

import { Label } from './Label';
import { platformIOS, showToast } from '../../../utils/utils';
import FilterBar from './FilterBar';
import {
  ExpirationTypes,
  Label as LabelType,
  Phase,
  getExpirationDate,
  getExpirationFormat,
  getExpirationAdditionalFormat,
  getPrintLabel,
} from '../../data/label';
import { usePrinters } from '../../hooks/use-printers';
import { usePrint } from '../../hooks/use-print';
import { useLabels } from '../../hooks/use-labels';
import LabelModal from './LabelModal';
import { translate } from '../../data/translations';


type ModalState = { _tag: 'Open'; item: LabelType } | { _tag: 'Close' };

const LabelList = (props: {
  context: string;
  labels: LabelType[];
  dontSubtract: boolean;
}) => {
  const { labels, context } = props;
  const hasLabels = labels.length;

  const [, { clearSearch }] = useLabels();
  const [showModal, setShowModal] = useState<ModalState>({ _tag: 'Close' });
  const { printers, printerConfig, isSearching } = usePrinters();
  const { printLabel } = usePrint({ printers, printerConfig, isSearching });

  /**
   * ** long press print **
   * prints with default phase or phase of current context
   * if no def phase | custom expiration
   * 	then expiration is end of day
   * 	else expiration using current time
   */
  const quickPrint = useCallback(
    async (label: LabelType) => {
      const count = 1;
      let defaultPhase: Phase | undefined;
      if (context === 'All' && label.phases.length) {
        defaultPhase = label.phases[0];
      } else {
        defaultPhase = label.phases.find((phase: Phase) => phase.name === context);
      }

      if (defaultPhase) {
        const expExpression = defaultPhase.expiration || '';
        const expirationFormat = getExpirationFormat(defaultPhase, expExpression);
        const expDate = getExpirationDate(
          expExpression,
          defaultPhase.name as ExpirationTypes,
          props.dontSubtract
        );
        let expirationAdditional = '';
        if (defaultPhase.expirationAdditional) {
          expirationAdditional = defaultPhase.expirationAdditional;
        } else if (defaultPhase.expiration) {
          expirationAdditional = defaultPhase.expiration;
        } else if (defaultPhase.expirationCustom) {
          expirationAdditional = 'Custom';
        }
        const expirationAdditionalFormat = getExpirationAdditionalFormat(
          defaultPhase,
          expirationAdditional
        );
        const expirationAdditionalDate = expirationAdditional
          ? getExpirationDate(
              expirationAdditional,
              expirationAdditional,
              props.dontSubtract
            )
          : 0;

        const labelToPrint = getPrintLabel(
          label,
          count,
          label.description,
          defaultPhase.name,
          defaultPhase.expiration,
          defaultPhase,
          expDate,
          expExpression,
          expirationFormat,
          expirationAdditionalDate,
          expirationAdditional,
          expirationAdditionalFormat,
          defaultPhase.useAllExpirations
        );

        if (expExpression == ExpirationTypes.NO_EXPIRATION) {
          labelToPrint.expirationType = ExpirationTypes.NO_EXPIRATION;
          labelToPrint.expirationFormat = '';
        } else if (expExpression == ExpirationTypes.CUSTOM) {
          labelToPrint.expirationType = ExpirationTypes.CUSTOM;
          labelToPrint.expirationFormat = '';
        }

        await printLabel(labelToPrint);
        clearSearch();
      }
    },
    [context, printLabel, clearSearch]
  );

  const renderItem = useCallback(
    ({ item }: { item: LabelType }) => {
      return (
        <Label
          label={item}
          context={context}
          onPress={() => setShowModal({ _tag: 'Open', item })}
          onLongPress={async () => {
            await quickPrint(item);
            clearSearch();
          }}
        />
      );
    },
    [context, printLabel, clearSearch, props.dontSubtract]
  );

  return (
    <View style={styles.outerContainer}>
      <View style={styles.categoryFitlerContainer}>
        <FilterBar />
      </View>
      <View style={styles.container}>
        {hasLabels ? (
          <FlatList
            data={labels}
            numColumns={platformIOS.isPad ? 7 : 3}
            scrollEnabled={true}
            keyExtractor={(item) => `${item.categoryId}-${item.itemId}`}
            renderItem={renderItem}
          />
        ) : (
          <Text>{translate('noLabels')}</Text>
        )}
      </View>
      <View>
        {showModal._tag === 'Open' && (
          <View style={styles.labelModalContainer}>
            <LabelModal
              label={showModal.item}
              context={context}
              closeModal={() => setShowModal({ _tag: 'Close' })}
              showModal={true}
              showToast={showToast}
              dontSubtract={props.dontSubtract}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default LabelList;

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignContent: 'center',
    padding: 2,
  },
  categoryFitlerContainer: {
    borderColor: '#aaaaaa',
    borderBottomWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  labelModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
});
