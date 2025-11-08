import React, { FC, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { PrinterQueueToastConfig } from '../../../utils/components/config/Toast';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import CreatePrintQueue from './CreatePrintQueue';
import { match } from 'ts-pattern';
import PrintListContainer from './PrintListContainer';

type ModalScreen = 'printList' | 'createQueue';

type PrintListModalExtraProps = {
  cartLength: number;
  showPrintModal: boolean;
  setShowPrintModal: (show: boolean) => void;
};

const PrintListModal: FC<PrintListModalExtraProps> = (props) => {
  const { cartLength, showPrintModal, setShowPrintModal } = props;
  const [activeModalScreen, setActiveModalScreen] = useState<ModalScreen>('printList');

  return (
    <View style={styles.centeredView}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPrintModal}
        onRequestClose={() => {
          setShowPrintModal(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.ModalView}>
            {match(activeModalScreen)
              .with('printList', () => (
                <PrintListContainer
                  cartLength={cartLength}
                  onClose={() => setShowPrintModal(false)}
                  onSave={() => setActiveModalScreen('createQueue')}
                />
              ))
              .with('createQueue', () => (
                <CreatePrintQueue
                  onClose={() => setShowPrintModal(false)}
                  onBack={() => setActiveModalScreen('printList')}
                />
              ))
              .otherwise(() => null)}

            <Toast config={PrinterQueueToastConfig} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PrintListModal;

const styles = StyleSheet.create({
  ModalView: {
    marginTop: 55,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: windowWidth * 0.9,
    height: windowHeight * 0.75,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
