import { createSlice } from '@reduxjs/toolkit';
import { CachesDirectoryPath, moveFile } from 'react-native-fs';
import { defaultTemplateHTML, demoTemplate } from '../../src/dummy-data/notes';
import { Attachment, Note } from '../../src/types/Notes';
import { getFormattedDate, isValidValue, orderList } from '../../utils/utils';
import {
  EditorState,
  NoteState,
  OfflineNoteActions,
  Visibility,
} from '../types/store-types';

const initNoteState: NoteState = {
  notes: [],
  pinned: [],
  search: '',
  showVoiceBox: false,
  selected: null,
  newNote: null,
  templates: [
    {
      name: 'Blank',
      html: '',
      shareWith: {},
      createdBy: null,
    },
    {
      name: 'Store Check',
      html: defaultTemplateHTML,
      shareWith: {},
      createdBy: null,
    },
    {
      name: 'Agenda',
      html: demoTemplate,
      shareWith: {},
      createdBy: null,
    },
  ],
  editor: {
    id: '',
    note: '',
  },
  visibility: {}, // maps of userId's to visibility obj
  offlineQueue: [],
  showCreateTaskModal: false,
};

const noteSlice = createSlice({
  name: 'notes',
  initialState: initNoteState,
  reducers: {
    setNotes: (state: any, action: any) => {
      const { notes } = action.payload;
      state.notes = notes;

      // clear editor
      state.editor = {
        id: null,
        note: '',
      };
      // if (platformIOS.isPad) {
      // 	const initSelected: Note = notes[0];
      // 	if (initSelected) {
      // 		state.selected = { ...initSelected };
      // 		state.editor = {
      // 			id: initSelected?.id,
      // 			note: initSelected?.note || initSelected?.template?.html || '',
      // 		} as EditorState;
      // 	}
      // }
      state.selected = null;
      // return state;
    },
    newNoteTemplate: (state: any, action: any) => {
      const { template, user } = action.payload;

      const newNote: Note = {
        id: state.notes.length,
        name: state?.newNote?.name || '',
        dateCreated: getFormattedDate(),
        lastModified: getFormattedDate(),
        createdBy: user,
        note: '',
        pin: false,
        template: template || null,
        active: true,
      };

      // add current note to new note
      state.newNote = newNote;
    },
    newNoteTitle: (state: any, action: any) => {
      const { title, user } = action.payload;

      const newNote: Note = {
        id: state.notes.length,
        name: title,
        dateCreated: getFormattedDate(),
        lastModified: getFormattedDate(),
        createdBy: user,
        note: '',
        pin: false,
        template: state?.newNote?.template || null,
        // SharingPermissions: [SharingPermissions.PRIVATE],
        active: true,
      };

      // add current note to new note
      state.newNote = newNote;
    },
    newNotetwo: (state: any, action: any) => {
      const { shareWith, user } = action.payload;

      const newNote: Note = {
        ...state.newNote,
        shareWith: shareWith,
        createdBy: user,
      };

      // add new note to note
      state.notes = [newNote, ...state?.notes];
      state.newNote = null;
      state.selected = newNote;
    },
    resetNewNote: (state: any, action: any) => {
      state.newNote = null;
    },
    // from api - add new note res
    addNewNote: (state: any, action: any) => {
      const { newNote } = action.payload;
      state.notes = [newNote, ...state.notes];
      state.selected = newNote;
      state.editor = {
        id: newNote?.id,
        note: newNote?.note,
      };
    },

    removeNote: (state: any, action: any) => {
      const { note } = action.payload;

      const newNoteList = state.notes.filter((curr: Note) => curr.id !== note.id);
      state.notes = newNoteList;
      state.selected = newNoteList.length ? newNoteList[0] : null;
    },
    setVisibility: (state: any, action: any) => {
      const { visibility } = action.payload;

      state.visibility = visibility;
    },
    setPin: (state: any, action: any) => {
      const { userId, noteId, pin } = action.payload;

      const visibility: Visibility = state?.visibility[userId] || null;
      let newPinnedList: any[] = [];
      if (Object.values(visibility).length) {
        const pinned: any[] = visibility.pinned;
        if (!pin) {
          newPinnedList = pinned.includes(noteId)
            ? pinned.filter((nId: any) => nId != noteId)
            : pinned;
        } else {
          newPinnedList = [...pinned, noteId];
        }
        state.visibility = {
          ...state.visibility,
          [userId]: {
            ...visibility,
            pinned: newPinnedList,
          },
        };
      } else {
        if (pin) {
          state.visibility = {
            ...state.visibility,
            [userId]: {
              pinned: [noteId],
            },
          };
        }
      }
    },
    archiveNote: (state: any, action: any) => {
      const { userId, noteId } = action.payload;

      const userVisibility: Visibility = state?.visibility?.hasOwnProperty(userId)
        ? state?.visibility[userId]
        : null;
      let newHiddenList: any[] = [];
      if (userVisibility) {
        const hidden: any[] = userVisibility.hidden;

        newHiddenList = hidden.includes(noteId)
          ? hidden.filter((nId: any) => nId != noteId)
          : [...hidden, noteId];

        state.visibility = {
          ...state.visibility,
          [userId]: {
            ...userVisibility,
            hidden: newHiddenList,
          },
        };
      } else {
        state.visibility = {
          ...state.visibility,
          [userId]: {
            hidden: [noteId],
          },
        };
      }
    },
    searchNotes: (state: any, action: any) => {
      const { search } = action.payload;
      state.search = search;
    },
    addAttachments: (state: any, action: any) => {
      const { noteId, attachments } = action.payload;

      const currNote: Note | undefined = state.notes.find(
        (curr: Note) => curr.id == noteId
      );
      if (currNote) {
        const prevState: Note[] = state.notes.filter((curr: Note) => curr.id != noteId);
        const allAttachments: Attachment[] = currNote.attachments?.length
          ? [...currNote.attachments, ...attachments]
          : [...attachments];
        const newNote: Note = { ...currNote, attachments: allAttachments };

        // check if new note is selected
        state.selected = state.selected?.id === newNote.id ? newNote : state.selected;

        state.notes = [newNote, ...prevState];
      }
    },
    updateAttachments: (state: any, action: any) => {
      const { noteId, attachments } = action.payload;

      const currNote: Note | undefined = state.notes.find(
        (curr: Note) => curr.id == noteId
      );
      if (currNote) {
        const prevState: Note[] = state.notes.filter((curr: Note) => curr.id != noteId);
        const newNote: Note = { ...currNote, attachments: attachments };

        // check if new note is selected
        state.selected = state.selected?.id === newNote.id ? newNote : state.selected;
        state.notes = [newNote, ...prevState];
      }
    },
    editVoiceMessageTitle: (state: any, action: any) => {
      const { updatedVM, noteId } = action.payload;
      // todo
      const currNote: Note | undefined = state.notes.find(
        (curr: Note) => curr.id == noteId
      );
      if (currNote) {
        // const order = state.notes.map((curr: Note) => curr.id);
        const prevState: Note[] = state.notes.filter((curr: Note) => curr.id != noteId);

        const vmsgToEdit: Attachment | undefined = currNote.attachments?.find(
          (att: Attachment) =>
            att.dateAdded == updatedVM?.dateAdded && att.hash == updatedVM?.hash
        );
        if (vmsgToEdit) {
          const prevAttachments: Attachment[] =
            currNote.attachments?.filter(
              (att: Attachment) =>
                att.dateAdded != updatedVM?.dateAdded && att.hash != updatedVM?.hash
            ) || [];

          const newAttachments: Attachment[] = prevAttachments.length
            ? [...prevAttachments, updatedVM]
            : [updatedVM];
          const newNote: Note = {
            ...currNote,
            attachments: newAttachments,
          };

          const dir: string = CachesDirectoryPath + '/';
          moveFile(dir + updatedVM?.name, dir + vmsgToEdit.file);

          state.notes = [newNote, ...prevState];
          state.selected = newNote;
        }
      }
    },
    setShowVoiceBox: (state: NoteState) => {
      state.showVoiceBox = state.showVoiceBox ? false : true;
    },
    removeVoiceContainer: (state: NoteState) => {
      state.showVoiceBox = false;
    },
    setSelected: (state: NoteState, action: any) => {
      const { id } = action.payload;
      // console.log('[setSelected] selectinggggg: ', id);

      // get curr selected
      // if valid - set curr note with editor contents
      // before reassigning note.editor state
      if (!id) {
        state.selected = null;
        state.editor = {
          id: null,
          note: '',
        } as EditorState;
      }

      const currModifiedId: any = state.editor.id;
      if (isValidValue(currModifiedId)) {
        const currSelectedNote: Note | undefined = state.notes.find(
          (note: Note) => note.id == currModifiedId
        );
        if (currSelectedNote) {
          const newSelectedNote: Note = {
            ...currSelectedNote,
            note: state.editor.note,
          };
          const order: any[] = state.notes.map((note: Note) => note.id);
          const notes: Note[] = state.notes.filter(
            (curr: Note) => curr.id !== currModifiedId
          );
          const unordredNotes: Note[] = [newSelectedNote, ...notes];
          const orderedNotes: Note[] = orderList(order, unordredNotes);
          state.notes = orderedNotes;
        }
      }

      // updaet editor id and note with new selected
      const note: Note | undefined = state.notes.find((note: Note) => note.id == id);
      if (note) {
        // console.log('[setSelected] state.editor updating...: ', note);
        state.selected = { ...note };
        state.editor = {
          id: note.id,
          note: note.note || note.template?.html || '',
        } as EditorState;
      }
    },
    editNoteTitle: (state: NoteState, action: any) => {
      const { id, title } = action.payload;

      const note: Note | any = state.notes.find((curr: Note) => curr.id == id);
      if (!note) {
        return;
      }
      note.name = title || note?.name;
      if (state.selected && note?.id == state.selected.id) {
        state.selected.name = title || note?.name;
      }
      return state;
    },

    addTemplate: (state: NoteState, action: any) => {
      const { template } = action.payload;
      console.log('[addTemplate] template: ', template);
      state.templates = state.templates.concat([template]);
    },
    editShareWith: (state: NoteState, action: any) => {
      const { noteId, shareWith } = action.payload;
      console.log('[EDIT SHARING] SLICINGGGG share with params: ', shareWith);
      // TODO : have to get order and modify obj in state
      //  bc they're immutable and cant modify a single propert of a redux obj
      const note: Note | undefined = state.notes.find((note: Note) => note.id == noteId);
      if (note) {
        const editedNote: Note = {
          ...note,
          shareWith: shareWith,
          lastModified: getFormattedDate(),
        };
        console.log('[EDIT SHARE WITH] share with res: ', editedNote.shareWith);

        const order: any[] = state.notes.map((note: Note) => note.id);
        const notes: Note[] = state.notes.filter((curr: Note) => curr.id !== noteId);
        const unordredNotes: Note[] = [editedNote, ...notes];

        const orderedNotes: Note[] = orderList(order, unordredNotes);

        state.notes = orderedNotes;
        if (state.selected?.id == noteId) {
          state.selected = editedNote;
        }
      }
    },
    updateNote: (state: NoteState, action: any) => {
      const { newNote } = action.payload;

      const oldNote: Note | undefined = state.notes.find(
        (note: Note) => note.id == newNote?.id
      );

      if (oldNote) {
        const order: any[] = state.notes.map((note: Note) => note.id);
        const notes: Note[] = state.notes.filter((curr: Note) => curr.id !== newNote?.id);
        const unordredNotes: Note[] = [newNote, ...notes];

        const orderedNotes: Note[] = orderList(order, unordredNotes);
        state.notes = orderedNotes;
        if (state.selected?.id == newNote?.id) {
          state.selected = newNote;
        }
      }
    },
    setEditorContent: (state: NoteState, action: any) => {
      const { notes } = action.payload;

      state.editor.note = notes;
      if (state.selected?.id) {
        state.selected = {
          ...state.selected,
          note: notes,
        };
      }
    },
    clearEditor: (state: NoteState) => {
      state.editor = {
        id: null,
        note: '',
      };
      // state.selected = null;
    },
    /** add to offline queue for note state */
    setOfflineQueue: (state: NoteState, action: any) => {
      const { queue } = action.payload;

      state.offlineQueue = queue;
    },
    /** add to offline queue for note state */
    addToOfflineQueue: (state: NoteState, action: any) => {
      /** if adding content update to queue,
       * make it is the only
       * and most up to date instance
       *  */
      if (action.payload?.action == OfflineNoteActions.CONTENT) {
        const noteId: any = action.payload?.noteId;
        const filteredQueue: any =
          state.offlineQueue
            .filter((queue: any) => queue?.noteId != noteId)
            .filter((action: any) => isValidValue(action)) || [];

        const offlineQueue: any[] = [filteredQueue, action?.payload];
        state.offlineQueue = offlineQueue;
      } else {
        state.offlineQueue = [
          ...(state.offlineQueue || []),
          {
            action: action.payload?.action,
            params: action.payload?.params,
          },
        ].filter((val: any) => isValidValue(val));
      }
    },
    setShowCreateTaskModal: (state: NoteState) => {
      state.showCreateTaskModal = !state.showCreateTaskModal;
    },
  },
});

export const {
  setNotes,
  removeNote,
  addAttachments,
  editVoiceMessageTitle,
  setShowVoiceBox,
  removeVoiceContainer,
  setSelected,
  editNoteTitle,
  newNoteTitle,
  newNoteTemplate,
  newNotetwo,
  addTemplate,
  editShareWith,
  resetNewNote,
  setEditorContent,

  updateNote, // for api
  addNewNote, // for api

  clearEditor, // to clear editor state on init
  setVisibility, // update note visibilty
  setPin, // modify pinning in state.visibility

  setOfflineQueue, // set offline queue with new one
  addToOfflineQueue, // add single item to queue to last of the queue
  archiveNote, // instead of deleting note add to hide section
  searchNotes,

  setShowCreateTaskModal, // shows create task modal in notes
} = noteSlice.actions;

export default noteSlice.reducer;
