import React, { MutableRefObject, useState } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';
import { actions, RichEditor, RichToolbar } from 'react-native-pell-rich-editor';

import { Task } from '../../../data/task';
import { useKeyboard } from '../../../hooks/use-keyboard';
import { windowHeight } from '../../../../utils/Dimensions';
import { translate } from '../../../data/translations';

type TaskEditorProps = {
  task: Task;
  editorRef: MutableRefObject<RichEditor | null>;
  availableHeight: number;
};

const TaskEditor = (props: TaskEditorProps) => {
const { task, editorRef, availableHeight } = props;
const [noteContent, setNoteContent] = useState<string>(task.notes);
const { keyboardVisible } = useKeyboard();

const editorHeight = Math.max(
  availableHeight - 44,
  keyboardVisible ? windowHeight * 0.25 : windowHeight * 0.2
);
  return (
    <View style={styles.editorContainer}>
      <RichToolbar
        style={styles.textToolbarStyle}
        editor={editorRef}
        disabled={false}
        iconTint={'white'}
        selectedIconTint={'black'}
        disabledIconTint={'grey'}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.setStrikethrough,
          actions.setUnderline,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.undo,
          actions.redo,
        ]}
      />
      <View style={[styles.editorWrapper, { minHeight: editorHeight }]}
        onTouchStart={() => {
          editorRef.current?.focusContentEditor();
        }}
      >
        <RichEditor
          style={[styles.editorStyle, { minHeight: editorHeight }]}
          ref={editorRef}
          containerStyle={{ flex: 1 }}
          placeholder={translate('taskNotesPlaceholder')}
          autoCorrect
          autoCapitalize="sentences"
          onChange={(html) => {
            setNoteContent(html);
          }}
          scrollEnabled
          editorStyle={{ contentCSSText: 'min-height:100%;' }}
          initialHeight={editorHeight}
          initialContentHTML={noteContent || ''}
          onBlur={() => {
            Keyboard.dismiss();
          }}
          initialFocus={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  editorContainer: {
    flex: 1,
    width: '100%',
  },
  editorWrapper: {
    flex: 1,
    width: '100%',
  },
  editorStyle: {
    borderWidth: 1,
    borderColor: '#c6c3b3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
    fontSize: 20,
  },
  textToolbarStyle: {
    backgroundColor: '#b9bbba',
    borderColor: '#c6c3b3',
    alignContent: 'center',
    height: 44,
    borderWidth: 1,
  },
});

export default TaskEditor;
