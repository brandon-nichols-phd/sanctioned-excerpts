import React, { FC, useCallback, useRef, useState, useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  View,
  Modal,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Text,
  DimensionValue,
  Alert,
  LayoutChangeEvent
} from 'react-native';
import type { KeyboardEvent as RNKeyboardEvent, KeyboardEventName } from 'react-native';
import { useSelector } from 'react-redux';
import { Button, Card, IconButton, Menu, RadioButton } from 'react-native-paper';
import moment from 'moment';
import { TouchableHighlight } from 'react-native';
import { CachesDirectoryPath } from 'react-native-fs';
import { RichEditor } from 'react-native-pell-rich-editor';
import WebView from 'react-native-webview';
import { State } from '../../../store/types/store-types';
import { isValidValue, platformIOS } from '../../../utils/utils';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { TaskType, Task, S3Attachment } from '../../data/task';
import TaskEditor from './modals/TasksEditor';
import PModal from '../../../utils/components/Modal';
import CorrectActionModal from './modals/CorrectActionModal';
import { CANCEL_COLOR, SAVE_COLOR, globalStyles } from '../../../utils/styles';
import { CheckList } from './Checklist';
import { getMediaType } from '../../../utils/notes-utils';
import TemperatureInput from './task-types/TemperatureInput';
import TemperatureManualInput from './task-types/TemperatureManualInput';
import TaskInput from './task-types/TaskInput';
import DateRecord from './task-types/DateRecord';
import NumberEntry from './task-types/NumberEntry';
import TimeInput from './task-types/TimeInput';
import Pickdown from './task-types/Pickdown';
import MultiSelect from './task-types/MultiSelect';
import TotalScans from './task-types/TotalScans';
import UserSelect from './task-types/UserSelect';
import {
  isTaskResponseComplete,
  shouldFlagTask,
  shouldShowSubtasks,
} from '../../../utils/task-utils';
import { useCorrectiveAction } from '../../hooks/use-corrective-action';
import { useTaskAttachment } from '../../hooks/use-task-attachment';
import { isIphoneSe } from '../../../utils/Platform';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { User } from '../../types/app';
import { BinaryInput } from './task-types/BinaryInput';
import PSlider from './task-types/Slider';
import { SensorData } from './task-types/SensorData';
import { Signature } from './task-types/Signature';
import { useUserPreferences } from '../../hooks/use-user-preferences';
import { NotRequired } from './task-types/NotRequired';
import { NumberAndSelect } from './task-types/NumberAndSelect';
import { translate } from '../../data/translations';
import { createTaggedLogger } from '../../../utils/dev-logging';
import { DishTemperatureInput } from './task-types/DishTemperatureInput';

const meta = '<meta name="viewport" content="width=device-width, initial-scale=1">';

const logger = createTaggedLogger('Task:');

const DEFAULT_TASK_WIDTH_IPHONE = 96;

const MIN_EDITOR_BOX_HEIGHT = 220;
const MODAL_SCROLL_PADDING_TOP = 12;
const MODAL_SCROLL_PADDING_BOTTOM = 76;
const EDITOR_BOX_MARGIN_TOP = 8;
const EDITOR_BOTTOM_SPACER_HEIGHT = 12;
const EDITOR_HEADER_MARGIN_BOTTOM = 10;
const LAYOUT_EPSILON = 1;
const FIXED_MODAL_VERTICAL_SPACING =
  MODAL_SCROLL_PADDING_TOP +
  MODAL_SCROLL_PADDING_BOTTOM +
  EDITOR_BOX_MARGIN_TOP +
  EDITOR_BOTTOM_SPACER_HEIGHT;


type TaskComponentExtraProps = {
  item: Task;
  level: number;
  readOnly: boolean;
  lastTempReader: string;
  setLastTempReader: (id: string) => void;
  saveTask: (task: Task) => Task;
  uploadAttachment: (attachment: S3Attachment) => void;
};

const TaskComponent: FC<TaskComponentExtraProps> = React.memo((props) => {
  const { saveTask, uploadAttachment } = props;
  const currUser = useSelector((state: State) => state.user.currUser);
  const { displayTemperatureUnit } = useUserPreferences();
  const hasNA = props.item.naEnabled && props.item.type !== TaskType.BINARY;


  const editorRef = useRef<RichEditor>(null);
  const [showEditorModal, setShowEditorModal] = useState<boolean>(false);
  const [showMediaModal, setShowMediaModal] = useState<boolean>(false);
  const [taskType, setTaskType] = useState<TaskType>(props.item.type);
  const [previousTaskType, setPreviousTaskType] = useState<TaskType | null>(null);
  const attachments: S3Attachment[] = props.item.attachments;

  const [kb, setKb] = useState(0);
  const { height: winH } = useWindowDimensions();
  const [modalBodyHeight, setModalBodyHeight] = useState<number | null>(null);
  const [modalHeaderHeight, setModalHeaderHeight] =
    useState<number | null>(null);
  const [editorViewportHeight, setEditorViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const onShow = (e: RNKeyboardEvent) => setKb(e.endCoordinates?.height ?? 0);
    const onHide = () => setKb(0);

    const showEvt: KeyboardEventName =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt: KeyboardEventName =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

    const handleModalBodyLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const {
        nativeEvent: {layout: { height },},
      } = event;
      setModalBodyHeight((prev) => {
        if (prev === null || Math.abs(prev - height) > LAYOUT_EPSILON) {
          return height;
        }
        return prev;
      });
    },
    []
  );

  const handleModalHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const {
        nativeEvent: {
          layout: { height },
        },
      } = event;

      const measuredHeight = height + EDITOR_HEADER_MARGIN_BOTTOM;

      setModalHeaderHeight((prev) => {
        if (prev === null || Math.abs(prev - measuredHeight) > LAYOUT_EPSILON) {return measuredHeight;}
        return prev;
      });
    },
    []
  );

  useEffect(() => {
    if (modalBodyHeight === null || modalHeaderHeight === null) {
      return;
    }
    const availableHeight =modalBodyHeight - (FIXED_MODAL_VERTICAL_SPACING + modalHeaderHeight);
    const normalizedHeight = Math.max(availableHeight, MIN_EDITOR_BOX_HEIGHT);
    setEditorViewportHeight((prev) => {
      if (prev === null || Math.abs(prev - normalizedHeight) > LAYOUT_EPSILON) {
        return normalizedHeight;
      }
      return prev;
    });
  }, [modalBodyHeight, modalHeaderHeight]);

  // if task has been skipped or marked N/A from the NotRe
  const [skipped, setSkipped] = useState<boolean>(props.item.skipped);

  const [showSubtasks, setShowSubtasks] = useState<boolean>(
    isValidValue(props.item.taskResponse)
      ? shouldShowSubtasks(props.item, skipped, props.item.taskResponse)
      : false
  );

  const { takePicture, imgFromLibrary, removeTaskAttachment } = useTaskAttachment({
    task: props.item,
    saveTask,
    uploadAttachment,
  });

  const { showCorrectiveAction, submitCorrectiveAction } = useCorrectiveAction({
    task: props.item,
    saveTask,
  });

  const onTaskTypeChange = useCallback(
    (newTaskType: TaskType | null) => {
      const currentTaskType = taskType;
      const taskChanged = newTaskType !== currentTaskType;
      //Check that the task type changed
      if (taskChanged) {
        //If the new type is null, it means the toggle state is potentially ambiguous (one to many)
        if (newTaskType === null) {
          //If the previous task type is also null, just use the item type, otherwise revert to previous task type
          setTaskType(previousTaskType === null ? props.item.type : previousTaskType);
        } else {
          //otherwise just update to the new task type
          setTaskType(newTaskType);
        }
      }
      //Update previous task type
      setPreviousTaskType(currentTaskType);
    },
    [previousTaskType, props.item.type, taskType]
  );

  const handleDeleteAttachment = useCallback(
    (attachment: S3Attachment) => {
      const filteredAttachments: S3Attachment[] = attachments.filter(
        (att: S3Attachment) =>
          att.file !== attachment.file && att.hash !== attachment.hash
      );

      if (!filteredAttachments.length) {
        setShowMediaModal(false);
        removeTaskAttachment(attachment);
      } else {
        removeTaskAttachment(attachment);
      }
    },
    [removeTaskAttachment, attachments]
  );

  const skipResponse = useCallback(() => {
    const flag = shouldFlagTask(props.item, true, 'N/A');
    setSkipped(true);

    saveTask({
      ...props.item,
      taskResponse: 'N/A',
      temperature: null,
      completed: true,
      flag: flag,
      skipped: true,
    });
  }, [props.item, saveTask]);

  /**
   * Isolates the ability to remove the n/a response for the user
   * without saving the response as a row in the completed_task table with an empty response
   *
   * This is because we do not support adding an empty entry
   * that would remove a completion status or add an empty response
   *
   * Instead we are maintaining a local state for skipping the task
   *
   * By only updating the local state of the task, we still get access
   * to the task type action by unskipping
   *
   * This means that, unless the user un-skips && adds a valid response for the task type,
   * they would still see the task as skipped if they navigate
   * in and out before entering another response
   */
  const removeSkipResponse = useCallback(() => {
    setSkipped(false);
  }, []);

  const handleSkipResponse = useCallback(
    (isSkipped = false) => {
      setShowSubtasks(shouldShowSubtasks(props.item, isSkipped));
      if (isSkipped) {
        skipResponse();
      } else {
        removeSkipResponse();
      }
    },
    [skipResponse, props.item, removeSkipResponse]
  );

  /**
   * skipped is flag to determine if the task has been skipped
   * This can only happen when a task has the n/a enabled flag set to true
   */
  const saveResponse = useCallback(
    (val: Task['taskResponse']) => {
      const showFlag = shouldFlagTask(props.item, false, val);
      setShowSubtasks(shouldShowSubtasks(props.item, false, val));

      const addTemperatureResponse = [
        TaskType.BLE_TEMPERATURE_ONLY,
        TaskType.TEMPERATURE,
        TaskType.SENSOR,
        TaskType.TEMPERATURE_MANUAL,
        TaskType.DISH_TEMPERATURE,
      ].includes(taskType);

      if (addTemperatureResponse) {
        logger.log(`Saving temperature task ${props.item.id}: taskResponse="${val}", temperature="${val}"`);
      }

      saveTask({
        ...props.item,
        taskResponse: val,
        attachments: [...(props.item.attachments || [])],
        temperature: addTemperatureResponse ? val : null,
        completed: isTaskResponseComplete(props.item, val),
        flag: showFlag,
        skipped: false,
      });
    },
    [props.item, taskType, saveTask]
  );

  const updateTaskNotes = (notes: string) => {
    setShowEditorModal(false);

    saveTask({
      ...props.item,
      notes: notes,
    });
  };

  /**
   * @summary - used for nested subtasks to assign and get store changes
   */

  const getTaskFrontWidth = (): string | number => {
    let w: string | number;
    if (props.level && props.level > 0) {
      w = platformIOS.isPad
        ? `${86 - props.level * 2}%`
        : `${DEFAULT_TASK_WIDTH_IPHONE - props.level * 2}%`;
    } else {
      w = platformIOS.isPad ? '88%' : '100%';
    }
    return w;
  };

  const isReadOnly =
    props.readOnly ||
    (!!props.item.lastModifiedBy && props.item.lastModifiedBy !== currUser?.id);

  return (
    <View>
      {showEditorModal ? (
        <View style={styles.centeredView}>
          <View style={styles.centeredView}>
            <Modal
              visible={showEditorModal}
              animationType="slide"
              transparent={true}
              presentationStyle="overFullScreen"
              statusBarTranslucent
              onRequestClose={() => {
                setShowEditorModal(false);
              }}
            >
              <View
                style={[
                  styles.centeredView,
                  kb > 0 ? styles.centeredViewKeyboard : null,
                  kb > 0 ? { paddingBottom: kb } : null,
                ]}
              >
                {/* Dim backdrop */}
                <View style={cm.backdrop} />

                {/* Card; maxHeight shortens by keyboard height */}
                <View
                  style={[
                    styles.ModalView,
                    cm.card,
                    cm.shadow,
                    { maxHeight: winH - kb - 12, alignItems: 'stretch' },
                  ]}
                >
                  <Text style={taskStyles.editorModalHeader}>
                    {translate('taskNotesHeader', { name: props.item.name })}
                  </Text>

                  {/* Body */}
                  <View style={cm.body} onLayout={handleModalBodyLayout}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      bounces={false}
                      contentContainerStyle={cm.scrollContent}
                      style={cm.scroll}
                    >
                      <Text
                        style={styles.title}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                        onLayout={handleModalHeaderLayout}
                      >
                        {props.item.name}
                      </Text>

                      {/* Editor forced full width */}
                      <View
                        style={[
                          taskStyles.editorView,
                          cm.editorBox,
                          editorViewportHeight !== null
                            ? { height: editorViewportHeight, flex: 0 }
                            : null,
                        ]}
                      >
                        {editorViewportHeight !== null ? (
                          <TaskEditor
                            task={props.item}
                            editorRef={editorRef}
                            availableHeight={editorViewportHeight}
                          />
                        ) : null}
                      </View>
                      <View style={{ height: EDITOR_BOTTOM_SPACER_HEIGHT }} />
                    </ScrollView>
                  </View>

                  {/* Footer pinned FLUSH to keyboard */}
                  <View style={cm.footer}>
                    <Button
                      style={[styles.btn, cm.btn]}
                      mode="outlined"
                      buttonColor={CANCEL_COLOR}
                      textColor="white"
                      onPress={() => setShowEditorModal(false)}
                    >
                      {translate('cancelButtonText')}
                    </Button>
                    <Button
                      style={[styles.btn, cm.btn]}
                      mode="contained"
                      buttonColor={SAVE_COLOR}
                      textColor="white"
                      onPress={async () => {
                        try {
                          const note = (await editorRef.current?.getContentHtml()) ?? '';
                          updateTaskNotes(note);
                        } catch (e) {
                          console.error('Error getting notes from editor: ', e);
                        }
                      }}
                    >
                      {translate('saveButtonText')}
                    </Button>
                  </View>
                </View>
              </View>

            </Modal>
          </View>
        </View>
      ) : null}

      {showCorrectiveAction ? (
        <CorrectActionModal
          task={props.item}
          visible={showCorrectiveAction}
          onClose={() => {
            // We don't currently support this
          }}
          onComplete={submitCorrectiveAction}
        />
      ) : null}

      <View
        style={[
          taskStyles.cardContainer,
          {
            width: getTaskFrontWidth() as DimensionValue,
            marginLeft: props.level > 0 ? (`${props.level * 3}%` as `${number}%`) : 0,
          },
        ]}
      >
        <Card style={taskStyles.card}>
          <Card.Title
            title={
              <View>
                <Text style={taskStyles.cardTitleText}>
                  {props.item.name || props.item.description || ''}
                </Text>
              </View>
            }
            subtitle={
              <View>
                <Text style={taskStyles.cardSubtitleText}>
                  {props.item.description || ''}
                </Text>
              </View>
            }
            subtitleStyle={taskStyles.subtitleStyle}
            titleVariant="titleMedium"
            titleStyle={taskStyles.titleStyle}
            right={() => (
              <View style={taskStyles.rightView}>
                <TaskRight
                  task={props.item}
                  flag={props.item.flag}
                  readOnly={isReadOnly}
                  modified={props.item.lastModified}
                  lastModifiedBy={props.item.lastModifiedBy}
                  saveTask={saveTask}
                />
              </View>
            )}
            rightStyle={taskStyles.rightStyle}
          />

          {/* should containe where attachments and notes are stored */}
          {attachments.length || props.item.notes.length ? (
            <View style={taskStyles.attachmentContainer}>
              <Text style={taskStyles.attachmentLabel}>Attachments/Notes</Text>
              <View style={styles.attachmentsContainer}>
                <View>
                  {attachments[0] != null ? (
                    <View style={globalStyles.column}>
                      <MediaContainer
                        attachment={attachments[0]}
                        width={200}
                        height={150}
                        setShowModal={setShowMediaModal}
                        context={'task'}
                      />
                      <Button
                        onPress={() => {
                          setShowMediaModal(true);
                        }}
                        mode={'outlined'}
                        style={taskStyles.attachmentViewBtn}
                      >
                        {translate('taskViewAllAttachments', {
                          length: attachments.length,
                        })}
                      </Button>
                      {showMediaModal && attachments.length > 0 ? (
                        <PModal
                          showModal={showMediaModal}
                          setShowModal={setShowMediaModal}
                          width={windowWidth}
                          height={windowHeight}
                          transparent={false}
                        >
                          <MediaModalContent
                            task={props.item}
                            attachments={attachments}
                            setShowModal={setShowMediaModal}
                            deleteAttachment={handleDeleteAttachment}
                            currUser={currUser}
                          />
                        </PModal>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                {props.item.notes ? (
                  <Pressable
                    style={styles.webviewContainer}
                    onPress={() => setShowEditorModal(true)}
                  >
                    <WebView
                      style={styles.webview}
                      source={{ html: props.item.notes ? meta + props.item.notes : '' }}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
          {hasNA ? (
            // 👉 CASE 1: N/A configured
            <View style={taskStyles.bottomContainer}>
              {/* Row 1: task type response only (right-aligned) */}
              <View style={taskStyles.actionRow}>
                {!skipped || props.item.type === TaskType.BINARY ? (
                  <ActionButton
                    type={taskType}
                    task={props.item}
                    skipped={skipped}
                    saveResponse={saveResponse}
                    readOnly={isReadOnly}
                    displayTemperatureUnit={displayTemperatureUnit}
                    lastTempReader={props.lastTempReader}
                    setLastTempReader={props.setLastTempReader}
                    handleTaskTypeChange={onTaskTypeChange}
                    handleSkipResponse={handleSkipResponse}
                    uploadAttachment={uploadAttachment}
                  />
                ) : null}
              </View>
              {/* Row 2: attachments/comments on the left, N/A on the right */}
              <View style={taskStyles.bottomRowWithNA}>
                <View style={taskStyles.bottomleftView}>
                  <TaskBottomLeft
                    task={props.item}
                    readOnly={isReadOnly}
                    type={props.item.type}
                    setShowEditorModal={setShowEditorModal}
                    setShowSubtasks={setShowSubtasks}
                    showSubtasks={showSubtasks}
                    takePicture={takePicture}
                    imgFromLibrary={imgFromLibrary}
                  />
                </View>

                <View style={taskStyles.naContainer}>
                  <NotRequired
                    skipped={skipped}
                    handleSkipResponse={handleSkipResponse}
                    readOnly={isReadOnly}
                  />
                </View>
              </View>
            </View>
          ) : (

            // 👉 CASE 2: N/A NOT configured → task type shares row with attachments when it fits
            <View style={taskStyles.bottomRowNoNA}>
              <View style={taskStyles.actionRowNoNA}>
                {!skipped || props.item.type === TaskType.BINARY ? (
                  <ActionButton
                    type={taskType}
                    task={props.item}
                    skipped={skipped}
                    saveResponse={saveResponse}
                    readOnly={isReadOnly}
                    displayTemperatureUnit={displayTemperatureUnit}
                    lastTempReader={props.lastTempReader}
                    setLastTempReader={props.setLastTempReader}
                    handleTaskTypeChange={onTaskTypeChange}
                    handleSkipResponse={handleSkipResponse}
                    uploadAttachment={uploadAttachment}
                  />
                ) : null}
              </View>

              {/* Attachments / comments (visually on the left; will drop below if needed) */}
              <View style={taskStyles.bottomleftRow}>
                <TaskBottomLeft
                  task={props.item}
                  readOnly={isReadOnly}
                  type={props.item.type}
                  setShowEditorModal={setShowEditorModal}
                  setShowSubtasks={setShowSubtasks}
                  showSubtasks={showSubtasks}
                  takePicture={takePicture}
                  imgFromLibrary={imgFromLibrary}
                />
              </View>
            </View>
          )}

        </Card>
      </View>
      {/* </SwipeRow> */}

      {props.item.subtasks.length &&
      (showSubtasks ||
        shouldShowSubtasks(props.item, skipped, props.item.taskResponse)) ? (
        <View style={taskStyles.checklistView}>
          <CheckList
            checklist={props.item.subtasks}
            level={props.level ? props.level + 1 : 1}
            lastTempReader={props.lastTempReader}
            setLastTempReader={props.setLastTempReader}
            saveTask={saveTask}
            uploadAttachment={uploadAttachment}
          />
        </View>
      ) : null}
    </View>
  );
});

export default TaskComponent;

type MediaModalContentProps = {
  task: Task;
  attachments: S3Attachment[];
  setShowModal: (show: boolean) => void;
  deleteAttachment: (attachment: S3Attachment) => void;
  currUser: User | null;
};

const MediaModalContent: FC<MediaModalContentProps> = (props: MediaModalContentProps) => {
  const handleDelete = useCallback(
    (attachment: S3Attachment) => {
      props.deleteAttachment(attachment);
    },
    [props]
  );

  const renderItem = useCallback(
    ({ item }: { item: S3Attachment }) => {
      return (
        <View style={styles.mediaContainer}>
          <MediaContainer
            attachment={item}
            width={350}
            height={350}
            context={'list'}
            setShowModal={props.setShowModal}
            handleDelete={handleDelete}
            currUser={props.currUser}
          />
        </View>
      );
    },
    [handleDelete, props.currUser, props.setShowModal]
  );

  return (
    <>
      <Text style={styles.attachmentsTitle}>
        {translate('taskTaskAttachmentsHeader', { name: props.task.name })}
      </Text>
      <View style={styles.attachmentContainer}>
        <View style={styles.attachmentListContainer}>
          <FlatList
            style={mediaContainerStyles.flatList}
            data={props.attachments}
            scrollEnabled={true}
            horizontal={true}
            numColumns={1}
            renderItem={renderItem}
          />
        </View>
        <View style={mediaModalStyles.closeView}>
          <Button
            onPress={() => {
              props.setShowModal(false);
            }}
            mode={'contained'}
            buttonColor={CANCEL_COLOR}
            textColor="white"
            style={mediaModalStyles.closeBtn}
          >
            {translate('closeButtonText')}
          </Button>
        </View>
      </View>
    </>
  );
};

type MediaContext = 'task' | 'list';
const MediaContainer: FC<{
  attachment: S3Attachment;
  width?: number;
  height?: number;
  context: MediaContext;
  setShowModal: (show: boolean) => void;
  handleDelete?: (attachment: S3Attachment) => void;
  currUser?: User | null;
}> = React.memo(
  ({ attachment, width, height, context, setShowModal, handleDelete, currUser }) => {
    const cacheDir = CachesDirectoryPath;
    const file = attachment.file;
    const fpath = cacheDir + '/' + file;
    const imgStyles = {
      width: width ? width : 155,
      height: height ? height : 100,
      borderRadius: 12,
    };
    const ext = file ? file.split('.')[1] : '';
    const type = getMediaType(ext ?? '') || '';

    const canDeleteAttachment: boolean =
      // @ts-expect-error -- type specifies addedby, but some cases attachments were saved with addedBy
      attachment.addedBy === currUser?.id || attachment.addedby === currUser?.id;

    if (type === 'picture') {
      return (
        <Pressable
          onPress={() => {
            setShowModal(true);
          }}
          style={mediaContainerStyles.container}
        >
          <Image
            source={{
              uri: fpath,
            }}
            style={imgStyles}
          />
          {context === 'list' && canDeleteAttachment && handleDelete ? (
            <View style={mediaContainerStyles.deleteBtnView}>
              <Button
                textColor="white"
                onPress={() => {
                  Alert.alert(
                    translate('taskMediaDeleteConfirmation', { type }),
                    '',
                    [
                      {
                        text: translate('yesText'),
                        onPress: () => {
                          handleDelete(attachment);
                        },
                      },
                      { text: translate('cancelButtonText') },
                    ],
                    { cancelable: true }
                  );
                }}
                labelStyle={mediaContainerStyles.deleteBtnLabel}
              >
                {'x'}
              </Button>
            </View>
          ) : null}
        </Pressable>
      );
    }

    const html = `
			    ${meta}
			    <video width="225" height="225" controls>
			        <source src="${fpath}" type="video/mp4">
			    </video>
			`;

    return <WebView style={styles.webviewHTML} source={{ html: html }} />;
  }
);

const Updates: FC<{
  user: string;
  lastModifiedBy: number | null | undefined;
  lastModified: string | null;
}> = ({ user, lastModified, lastModifiedBy }) => {
  const selected = useSelector((state: State) => state.tasks.selected);
  if (lastModifiedBy && lastModified) {
    return (
      <Text style={updatesStyles.modified}>{`${user && lastModifiedBy ? user : ''} ${
        lastModified ? lastModified : ''
      }`}</Text>
    );
  } else if (!lastModifiedBy && !lastModified) {
    return (
      <Text style={updatesStyles.notModified}>{translate('taskUpdateNotStarted')}</Text>
    );
  } else {
    return (
      <Text style={updatesStyles.default}>
        {translate('taskUpdateDue', {
          date:
            moment(selected?.config.endTime || selected?.config.lockedTime).format(
              'h:mm a'
            ) || translate('taskUpdateNotStarted'),
        })}
      </Text>
    );
  }
};

const TaskRight = ({
  task,
  flag,
  readOnly,
  modified,
  lastModifiedBy,
  saveTask,
}: {
  task: Task;
  flag: boolean;
  readOnly: boolean;
  modified: number | null;
  lastModifiedBy: number | null | undefined;
  saveTask: TaskComponentExtraProps['saveTask'];
}) => {
  const users = useSelector((state: State) => state.user.users);

  const flagTask = () => {
    if (readOnly) {
      return;
    }

    // update api | send to offline queue to process
    saveTask({
      ...task,
      flag: !task.flag,
    });
  };

  const user = users.find((uu) => uu.id === lastModifiedBy)?.firstName || '';
  const lastModified = modified ? moment(modified).format('h:mm a') : '';

  return (
    <View style={styles.rgroup}>
      <Updates user={user} lastModified={lastModified} lastModifiedBy={lastModifiedBy} />
      <IconButton
        icon={'flag'}
        iconColor={flag ? PATHSPOT_COLORS.PATHPOT_ORANGE : 'grey'}
        size={25}
        style={taskRightStyles.icon}
        onPress={flagTask}
      />
    </View>
  );
};

const TaskBottomLeft: FC<{
  task: Task;
  readOnly: boolean;
  type: TaskType;
  showSubtasks: boolean;
  setShowSubtasks: (show: boolean) => void;
  setShowEditorModal: (show: boolean) => void;
  takePicture: () => void;
  imgFromLibrary: () => void;
}> = (props) => {
  const {
    task,
    readOnly,
    type,
    setShowEditorModal,
    setShowSubtasks,
    showSubtasks,
    takePicture,
    imgFromLibrary,
  } = props;

  const [showAttachmentsOptions, setShowAttachmentsOptions] = useState<boolean>(false);

  const handlePicture = () => {
    takePicture();
    setShowAttachmentsOptions(false);
  };

  const handleChoosePic = () => {
    imgFromLibrary();
    setShowAttachmentsOptions(false);
  };

  return (
    <View style={styles.lbgroup}>
      <Menu
        visible={showAttachmentsOptions}
        onDismiss={() => {
          setShowAttachmentsOptions(false);
        }}
        anchor={
          <View style={[type === TaskType.PICTURE ? globalStyles.column : {}, {}]}>
            {type === TaskType.PICTURE ? (
              <Text style={taskBottomLeftStyles.pictureRequired}>*</Text>
            ) : null}
            <IconButton
              icon="paperclip"
              onPress={() => {
                setShowAttachmentsOptions(!showAttachmentsOptions);
              }}
              disabled={readOnly}
            />
          </View>
        }
        style={taskBottomLeftStyles.anchorCenter}
      >
        <Menu.Item
          key={'take picture'}
          title={translate('taskTakePicture')}
          onPress={handlePicture}
          style={taskBottomLeftStyles.pictureItem}
          disabled={readOnly}
        />
        <Menu.Item
          key={'choose from library'}
          title={translate('taskChooseFromLibrary')}
          onPress={handleChoosePic}
          style={taskBottomLeftStyles.chooseFromLibItem}
          disabled={readOnly}
        />
      </Menu>

      <View style={taskBottomLeftStyles.noteBtnView}>
        <IconButton
          icon={'note-plus'}
          iconColor={'grey'}
          onPress={() => {
            setShowEditorModal(true);
          }}
          disabled={readOnly}
          style={
            type === TaskType.PICTURE
              ? taskBottomLeftStyles.noteBtnPicture
              : taskBottomLeftStyles.noteBtnPicNotRequired
          }
        />
      </View>

      {task.subtasks.length ? (
        <TouchableHighlight
          activeOpacity={0.6}
          underlayColor="#DDDDDD"
          style={[globalStyles.row, taskBottomLeftStyles.subtaskView]}
          onPress={() => {
            setShowSubtasks(!showSubtasks);
          }}
        >
          <>
            <Text style={taskBottomLeftStyles.subtaskText}>{task.subtasks.length}</Text>
            <IconButton icon={'file-tree'} iconColor={'grey'} />
          </>
        </TouchableHighlight>
      ) : null}
    </View>
  );
};

type ActionButtonExtraProps = {
  task: Task;
  type: TaskType;
  skipped: boolean;
  saveResponse: (val: Task['taskResponse']) => void;
  uploadAttachment: TaskComponentExtraProps['uploadAttachment'];
  readOnly: boolean;
  displayTemperatureUnit: string;
  lastTempReader: string;
  setLastTempReader: (id: string) => void;
  handleSkipResponse: (skipped: boolean) => void;
  handleTaskTypeChange: (TaskType: TaskType | null) => void;
};

export const ActionButton: FC<ActionButtonExtraProps> = (props) => {
  const {
    type,
    task,
    skipped,
    saveResponse,
    readOnly,
    handleTaskTypeChange,
    displayTemperatureUnit,
    handleSkipResponse,
    uploadAttachment,
  } = props;

  switch (type) {
    case TaskType.BINARY:
      return (
        <View style={actionButtonStyles.container}>
          <BinaryInput
            task={task}
            skipped={skipped}
            readOnly={readOnly}
            saveResponse={saveResponse}
            handleSkipResponse={handleSkipResponse}
          />
        </View>
      );
    case TaskType.TEMPERATURE_MANUAL:
      return (
        <View style={actionButtonStyles.container}>
          <View style={[globalStyles.row, actionButtonStyles.switchContainer]}>
            <Text style={actionButtonStyles.switchText}>{translate('taskSensorBluetooth')}</Text>
            <RadioButton.Android
              value={type}
              onPress={() => {
                handleTaskTypeChange(TaskType.TEMPERATURE);
              }}
              disabled={readOnly}
            />
          </View>
          {/* Key is used to re-mount the component if the response changes

              this is important because it's using local state to manage the response,
              and we can reset it when the task update the top-level response */}
          <TemperatureManualInput
            key={task.taskResponse + displayTemperatureUnit}
            task={task}
            readOnly={readOnly}
            saveResponse={saveResponse}
          />
        </View>
      );
    case TaskType.TEMPERATURE:
      return (
        <View style={actionButtonStyles.container}>
          <View style={[globalStyles.row, actionButtonStyles.switchContainer]}>
            <Text>{translate('taskManualTemperature')}</Text>
            <RadioButton.Android
              value={type}
              onPress={() => {
                handleTaskTypeChange(TaskType.TEMPERATURE_MANUAL);
              }}
              disabled={readOnly}
            />
          </View>

          <TemperatureInput
            taskId={task.id}
            task={task}
            readOnly={readOnly}
            lastTempReader={props.lastTempReader}
            setLastTempReader={props.setLastTempReader}
            saveResponse={saveResponse}
          />
        </View>
      );
    case TaskType.DISH_TEMPERATURE:
      return (
        <View style={actionButtonStyles.container}>
          <View style={[globalStyles.row, actionButtonStyles.switchContainer]}>
            <Text>{translate('taskManualTemperature')}</Text>
            <RadioButton.Android
              value={type}
              onPress={() => {
                handleTaskTypeChange(TaskType.TEMPERATURE_MANUAL);
              }}
              disabled={readOnly}
            />
          </View>

          <DishTemperatureInput
            taskId={task.id}
            task={task}
            readOnly={readOnly}
            lastTempReader={props.lastTempReader}
            setLastTempReader={props.setLastTempReader}
            saveResponse={saveResponse}
          />
        </View>
      );
    case TaskType.BLE_TEMPERATURE_ONLY: // temp type for ble temp only without switch option
      return (
        <View style={actionButtonStyles.container}>
          <TemperatureInput
            taskId={task.id}
            task={task}
            readOnly={readOnly}
            lastTempReader={props.lastTempReader}
            setLastTempReader={props.setLastTempReader}
            saveResponse={saveResponse}
          />
        </View>
      );
    case TaskType.TEXT:
      return (
        <View style={actionButtonStyles.container}>
          <TaskInput task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );

    case TaskType.NUMBER:
      return (
        <View style={[actionButtonStyles.container, actionButtonStyles.numberBottom]}>
          <NumberEntry task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.DATE:
      return (
        <View style={actionButtonStyles.container}>
          <DateRecord task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.TIME:
      return (
        <View style={actionButtonStyles.container}>
          <TimeInput task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.SELECT:
      return (
        <View style={actionButtonStyles.container}>
          <Pickdown task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.MULTI_SELECT:
      return (
        <View style={actionButtonStyles.container}>
          <MultiSelect task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.TOTAL_SCANS:
      return (
        <View style={actionButtonStyles.container}>
          <TotalScans task={task} />
        </View>
      );
    case TaskType.USER_SELECT:
      return (
        <View style={actionButtonStyles.container}>
          <UserSelect task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.SLIDER_NUMERIC:
      return (
        <View style={actionButtonStyles.container}>
          <PSlider task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.SENSOR:
      return (
        <View style={actionButtonStyles.container}>
          <View style={[globalStyles.row, actionButtonStyles.switchContainer]}>
            <Text style={actionButtonStyles.switchText}>
              {translate('taskSensorTempManual')}
            </Text>

            <RadioButton.Android
              value={type}
              status={type === TaskType.TEMPERATURE_MANUAL ? 'checked' : 'unchecked'}
              onPress={() => {
                handleTaskTypeChange(TaskType.TEMPERATURE_MANUAL);
              }}
              disabled={readOnly}
            />
          </View>

          <SensorData task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.SIGNATURE:
      return (
        <View style={actionButtonStyles.container}>
          <Signature
            task={task}
            readOnly={readOnly}
            saveResponse={saveResponse}
            uploadAttachment={uploadAttachment}
          />
        </View>
      );
    case TaskType.NUMBER_AND_SELECT:
      return (
        <View style={actionButtonStyles.container}>
          <NumberAndSelect task={task} readOnly={readOnly} saveResponse={saveResponse} />
        </View>
      );
    case TaskType.PICTURE:
      // returning null here because the task action is the attachment only
      return null;
    default:
      return (
        <View style={actionButtonStyles.defaultContainer}>
          <Text style={actionButtonStyles.notSupportedLabel}>
            {translate('taskTypeUnavailable')}
          </Text>
        </View>
      );
  }
};

const actionButtonStyles = StyleSheet.create({
  container: { justifyContent: 'flex-start', marginRight: '1%' },
  switchContainer: { justifyContent: 'center', alignItems: 'center' },
  switchText: { justifyContent: 'center', textAlign: 'left' },
  numberBottom: { bottom: 0 },
  notSupportedLabel: { color: PATHSPOT_COLORS.PATHPOT_ORANGE_BROWN, fontWeight: '700' },
  defaultContainer: {
    justifyContent: 'flex-start',
    marginRight: '1%',
    width: platformIOS.isPad ? windowWidth * 0.275 : windowWidth * 0.52,
  },
});

const styles = StyleSheet.create({
  rgroup: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingRight: platformIOS.isPad ? '2%' : '2%',
  },
  lbgroup: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  webviewContainer: {
    width: '75%',
    flexShrink: 1,
  },
  webview: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    borderColor: 'black',
  },
  webviewHTML: {
    borderWidth: 1,
    borderRadius: 20,
    borderColor: 'black',
    width: 450,
    height: 450,
    marginHorizontal: '5%',
  },
  attachmentsContainer: {
    height: windowHeight * 0.15,
    display: 'flex',
    flexDirection: 'row',
    marginHorizontal: '3%',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  centeredViewKeyboard: {
    justifyContent: 'flex-end',
  },
  ModalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: platformIOS.isPad ? windowWidth * 0.45 : windowWidth * 0.9,
    height: platformIOS.isPad
      ? windowHeight * 0.7
      : isIphoneSe
      ? windowHeight * 0.725
      : windowHeight * 0.675,
  },
  bgrp: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btn: {
    marginHorizontal: 10,
    alignSelf: 'center',
    flex: 1,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    overflow: 'hidden',
    fontSize: platformIOS.isPad ? 22 : 20,
    marginBottom: 10,
  },
  attachmentsTitle: {
    width: '100%',
    textAlign: 'center',
    fontSize: 24,
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    fontWeight: '500',
  },
  attachmentContainer: {
    width: '100%',
    height: windowHeight * 0.45,
    alignItems: 'center',
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'column',
  },
  attachmentListContainer: {
    width: '100%',
    alignItems: 'center',
    alignContent: 'center',
    alignSelf: 'center',
    top: '5%',
    padding: '2%',
  },
  mediaContainer: { margin: 10, justifyContent: 'center' },
});

const cm = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '92%',
    maxHeight: '70%',        
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    justifyContent: 'space-between', 
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  body: {
    flex: 1,
    minHeight: 0,   
  },
  scroll: {
    flex: 1,                
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 76,
  },
  editorBox: {
    flex: 1,                   
    minHeight: 220,            
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAFAFB',
    marginTop: 8,
    alignSelf: 'stretch',
    width: '100%',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,         
    height: 64,
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6E8EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12
  },
  btn: {
    flex: 1,
    borderRadius: 12,
  },
});


const taskStyles = StyleSheet.create({
  bottomContainer: {
    width: '100%',
    paddingTop: '4%',
    paddingBottom: '2%',
  },

  // row that holds task type response + N/A, aligned to the right
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  editorViewContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    padding: 20,
  },
  editorModalHeader: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    color: 'white',
    width: '100%',
    textAlign: 'center',
    padding: 15,
    fontSize: 20,
    fontWeight: 'bold',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  editorView: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  cardContainer: {
    paddingHorizontal: platformIOS.isPad ? 0 : '2%',
    marginBottom: '1.5%',
  },
  card: { 
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
   },
  cardTitleText: {
    marginTop: '3%',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'left',
    paddingLeft: '3.5%',
  },
  cardSubtitleText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
    paddingLeft: '3.5%',
    color: 'grey',
  },
  subtitleStyle: {
    flexWrap: 'nowrap',
    marginTop: '2%',
  },
  titleStyle: {
    fontWeight: 'bold',
    textAlign: 'left',
  },
  rightView: {
    top: 0,
  },
  rightStyle: {
    alignSelf: 'flex-start',
    marginTop: '2%',
  },
  attachmentContainer: {
    flexDirection: 'column',
    height: 200,
    marginBottom: '2%',
  },
  attachmentLabel: {
    fontWeight: 'bold',
    marginLeft: '5%',
  },
  attachmentViewBtn: {
    marginVertical: '3%',
    left: -2,
    padding: '.25%',
  },
  bottomleftContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: '5%',
    paddingBottom: '1.5%',
  },
  bottomleftView: {
    flex: 1,
    marginTop: '1%',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  actionButtonView: {
    flexDirection: 'row',
    flexWrap: 'wrap',        
    justifyContent: 'flex-end', 
    alignItems: 'center',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  bottomRowWithNA: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 10,           
    marginTop: 4,
  },
  bottomRowNoNA: {
    width: '100%',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: '5%',
    paddingBottom: '1.5%',
    paddingHorizontal: '1.5%',
  },
  naContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  bottomleftRow: {
    flexShrink: 0, 
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionRowNoNA: {
    flexShrink: 1,
    flexGrow: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  checklistView: {
    marginVertical: '.5%',
    marginLeft: platformIOS.isPad ? 0 : '1%',
  },
});

const mediaModalStyles = StyleSheet.create({
  closeView: {
    marginTop: '5%',
  },
  closeBtn: {
    width: windowWidth * 0.4,
  },
});

const mediaContainerStyles = StyleSheet.create({
  flatList: {
    overflow: 'visible',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  deleteBtnView: {
    zIndex: 9999,
    backgroundColor: 'red',
    position: 'absolute',
    top: 0,
    right: -0.5,
    borderRadius: 12,
    justifyContent: 'center',
  },
  deleteBtnLabel: {
    fontSize: 18,
    fontWeight: '700',
    padding: 1,
    textAlign: 'center',
  },
});

const updatesStyles = StyleSheet.create({
  modified: {
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    fontWeight: '600',
    marginHorizontal: '1%',
  },
  notModified: {
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    marginHorizontal: '1%',
  },
  default: {
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    marginHorizontal: '1%',
  },
});

const taskRightStyles = StyleSheet.create({
  icon: {
    marginTop: -12,
  },
});

const taskBottomLeftStyles = StyleSheet.create({
  pictureRequired: {
    color: 'red',
    bottom: -22,
    right: 12,
    alignSelf: 'flex-end',
    fontSize: 18,
  },
  anchorCenter: {
    justifyContent: 'center',
  },
  pictureItem: {
    width: '100%',
    height: 25,
    marginBottom: '5%',
    alignSelf: 'flex-start',
    borderBottomColor: 'grey',
    borderBottomWidth: 1,
  },
  chooseFromLibItem: {
    width: '100%',
    height: 20,
    alignSelf: 'flex-start',
    marginBottom: '5%',
  },
  noteBtnView: {
    alignItems: 'center',
  },
  noteBtnPicture: {
    top: 10,
    right: 5,
  },
  noteBtnPicNotRequired: {},
  subtaskView: { alignItems: 'center', borderRadius: 15 },
  subtaskText: { left: 10 },
});
