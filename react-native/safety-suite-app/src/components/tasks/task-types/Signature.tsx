import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  SetStateAction,
  Dispatch,
} from 'react';
import { StyleSheet, View, Modal, Image, Pressable, Text } from 'react-native';
import { S3Attachment, Task } from '../../../data/task';
import { windowHeight, windowWidth } from '../../../../utils/Dimensions';
import { getUUID, platformIOS } from '../../../../utils/utils';
import { useSelector } from 'react-redux';
import { State } from '../../../../store/types/store-types';
import { S3GetPayload, S3GetReturn, s3getObject } from '../../../../api/aws/s3';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import FS, { CachesDirectoryPath } from 'react-native-fs';
import { Button } from 'react-native-paper';
import { translate } from '../../../data/translations';

type Props = {
  task: Task;
  readOnly: boolean;
  saveResponse: (res: Task['taskResponse']) => void;
  uploadAttachment: (attachment: S3Attachment) => void;
};

// base 64 inline prefix
const BASE_64_PREFIX = 'data:image/png;base64,';

/**
 *
 * Signatures and how it is saved in different places
 *
 * S3 - is saved using {customer Id}/{UUID},
 * here the UUID is assigned on each saved signature or new resposne
 * This allows us to keep historical data without having to enable versioning on s3 buckets
 * And maintain some distinction between csutomer attachments
 *
 * Locally - Is saved {cache dir}/{UUID}
 * This is where all cached files/attachemnts live for the app
 * And customer distinction is not necessary because a user will only ever be signed in to a single customer
 *
 * Response - is saved as {customer Id}/{UUID}
 * This ensure that all saved attachments/s3 files maintain some record of the the customer Id
 * This is important for reporting, when we are pulling signaure files from s3
 *
 */
export const Signature = (props: Props) => {
  const { uploadAttachment, saveResponse } = props;
  const customerId = useSelector((state: State) => state.context.customerId);
  const currUser = useSelector((state: State) => state.user.currUser);
  const [showModal, setShowModal] = useState<boolean>(false);

  // base64 representation of signature img/png
  const [signature, setSignature] = useState<string>('');

  /**
   * The response is saved as {customer id}/{uuid}
   * bc reporting is dependent on the format
   * but we only need the uuid here
   *
   * The UUID is only necessary here because we save the
   * signature locally to {cache directory}/{UUID}
   */
  useEffect(() => {
    if (props.task.taskResponse && customerId) {
      // fetch from s3
      // response should be the key
      const params: S3GetPayload = {
        customerId: customerId,
        file: props.task.taskResponse.split('/').pop() ?? '',
      };

      s3getObject(params)
        .then((res: S3GetReturn) => {
          if (res.success && res.data) {
            setSignature(BASE_64_PREFIX + res.data);
          }
        })
        .catch(() => {
          setSignature('');
          console.error( 'Error captured:',
            `[Signature] ERROR getting s3 object with key=${props.task.taskResponse}`
          );
        });
    }
  }, [customerId, props.task.taskResponse]);

  const showSignatureModal = useCallback(() => {
    setShowModal(true);
  }, []);

  // saves image locally in the cache dir
  const saveImageDataToCache = useCallback(
    async (base64Signature: string, s3Key: string) => {
      if (!base64Signature) {
        return;
      }

      // save locally
      // base 64 prefix not needed to save locally
      await FS.writeFile(s3Key, base64Signature.replace(BASE_64_PREFIX, ''), 'base64');
      setSignature(base64Signature);
    },
    []
  );

  const handleSave = useCallback(
    async (base64Signature: string) => {
      // unique uuid for s3 key
      const s3Key = getUUID();

      // this will be used as the response
      // and is needed in this format to make reporting
      // work easier
      const responseKey = `${customerId}/${s3Key}`;

      // will be saved here locally
      const localKey = `${CachesDirectoryPath}/${s3Key}`;

      // save locally
      await saveImageDataToCache(base64Signature, localKey).catch((err) => {
        console.error( 'Error captured:', err);
      });

      // add to offline tasks queue to save to s3
      uploadAttachment({
        customerId: customerId || -1,
        file: s3Key,
        uri: localKey,
        hash: '',
        type: '',
        addedby: currUser?.id ?? null,
        addedWhen: Date.now(),
      });

      // save calculated key as response
      // if there is already a key saved in task response, then we will use that
      // other wise we use the default calculated key for the first save
      saveResponse(responseKey);

      setShowModal(false);
    },
    [saveImageDataToCache, customerId, saveResponse, uploadAttachment, currUser]
  );

  return (
    <View style={styles.container}>
      {signature ? (
        <Pressable onPress={showSignatureModal}>
          <Image style={styles.image} source={{ uri: signature }} />
        </Pressable>
      ) : (
        <Button
          style={styles.addsignatureBtn}
          labelStyle={styles.btnLabel}
          onPress={showSignatureModal}
          compact={true}
          disabled={props.readOnly}
        >
          {translate('taskAddSignature')}
        </Button>
      )}

      {showModal ? (
        <SignatureModal
          showModal={showModal}
          setShowModal={setShowModal}
          signature={signature}
          setSignature={setSignature}
          onSave={handleSave}
        />
      ) : null}
    </View>
  );
};

type SignatureModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setSignature: Dispatch<SetStateAction<string>>;
  signature: string;
  onSave: (signature: string) => void;
};

/**
 * to hide built in clear and save buttons
 * using custom below
 *
 * the signature pad had a weird spacing issue
 * and fixing by manually setting margin left
 */
const webStyle = `.m-signature-pad--footer
    .save {
        display: none;
    }
    .clear {
      display: none;
    }
    .m-signature-pad {
      margin-left: 0;
    }
`;

const SignatureModal = (props: SignatureModalProps) => {
  const ref = useRef<SignatureViewRef>(null);
  const [signature, setSignature] = useState('');

  const handleEnd = () => {
    ref.current?.readSignature();
  };

  const handleOk = (signature64: string) => {
    setSignature(signature64);
  };

  // to make sure modal doesn't get in a weird state
  useEffect(() => {
    return () => {
      props.setShowModal(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using this for un-mount actions
  }, []);

  const onSave = useCallback(() => {
    if (signature) {
      props.setSignature(signature);
      props.onSave(signature);
    }
  }, [props, signature]);

  const onCancel = useCallback(() => {
    props.setShowModal(false);
  }, [props]);

  const onClear = () => {
    ref.current?.clearSignature();
  };

  return (
    <View style={modalStyles.centeredView}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={props.showModal}
        onRequestClose={() => {
          props.setShowModal(false);
        }}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.ModalView}>
            <View style={modalStyles.headerView}>
              <Button
                style={modalStyles.closeBtn}
                onPress={onCancel}
                labelStyle={modalStyles.closeBtnLabel}
                mode="contained-tonal"
                compact={true}
                buttonColor="white"
                textColor="black"
              >
                {'x'}
              </Button>
            </View>

            <View style={modalStyles.signatureContainer}>
              <Text style={modalStyles.header}>{translate('taskAddSignatureTitle')}</Text>
              <SignatureScreen
                ref={ref}
                onEnd={handleEnd}
                onOK={handleOk}
                descriptionText={''}
                imageType={'image/png'}
                style={
                  platformIOS.isPad ? modalStyles.signature : modalStyles.signatureIphone
                }
                webStyle={webStyle}
                dataURL={props.signature}
              />

              <View style={modalStyles.buttonsContainer}>
                <Button
                  style={modalStyles.cancelBtn}
                  labelStyle={modalStyles.btnLabel}
                  onPress={onClear}
                  compact={true}
                >
                  {translate('clearButtonText')}
                </Button>

                <Button
                  style={modalStyles.saveBtn}
                  labelStyle={modalStyles.btnLabel}
                  onPress={onSave}
                  compact={true}
                >
                  {translate('saveButtonText')}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// styles for main component
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    marginHorizontal: '1%',
  },
  addsignatureBtn: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    width: platformIOS.isPad ? windowWidth * 0.15 : windowWidth * 0.35,
    alignSelf: 'center',
    borderRadius: 20,
    marginHorizontal: '1%',
  },
  btnLabel: {
    color: 'white',
    fontWeight: '700',
  },
  image: {
    width: platformIOS.isPad ? 175 : 150,
    height: platformIOS.isPad ? 75 : 50,
    marginHorizontal: '2%',
    borderWidth: 1,
    borderRadius: 7,
    resizeMode: 'contain',
  },
});

// styles for signature modal
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
  },
  headerView: {
    alignSelf: 'flex-end',
    margin: '2%',
    marginTop: platformIOS.isPad ? 0 : windowHeight * 0.075,
  },
  ModalView: {
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
    width: platformIOS.isPad ? windowWidth : windowWidth,
    height: platformIOS.isPad ? windowHeight * 0.825 : windowHeight,
    zIndex: 1,
  },
  signatureContainer: {
    justifyContent: 'center',
    alignContent: 'center',
  },
  signature: {
    flex: 0.9,
    alignSelf: 'center',
    width: windowWidth * 0.65,
    alignContent: 'center',
    justifyContent: 'center',
  },
  signatureIphone: {
    flex: 0.75,
    alignSelf: 'center',
    width: windowWidth,
    alignContent: 'center',
    top: windowHeight * 0.15,
  },
  buttonsContainer: {
    flex: platformIOS.isPad ? 0.45 : 0.55,
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    marginVertical: '7%',
  },
  cancelBtn: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_TEAL,
    width: platformIOS.isPad ? windowWidth * 0.2 : windowWidth * 0.35,
    alignSelf: 'center',
    borderRadius: 20,
    marginHorizontal: '1%',
  },
  saveBtn: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    width: platformIOS.isPad ? windowWidth * 0.2 : windowWidth * 0.35,
    alignSelf: 'center',
    borderRadius: 20,
    marginHorizontal: '1%',
  },
  btnLabel: {
    color: 'white',
    fontWeight: '700',
  },
  header: {
    fontWeight: '600',
    fontSize: 22,
    textAlign: 'center',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    margin: '2%',
  },
  closeBtnLabel: { fontSize: 24, padding: '1%' },
});
