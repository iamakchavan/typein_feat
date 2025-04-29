import { EditorState, EditorAction } from '@/types';

const MAX_HISTORY_SIZE = 100;

export const INITIAL_STATE: EditorState = {
  content: '',
  baseContent: '',
  lastSaved: null,
  isDirty: false,
  history: [],
  historyIndex: 0,
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'INIT':
      const { content } = action.payload;
      return {
        ...INITIAL_STATE,
        content,
        history: [content],
        historyIndex: 0,
        baseContent: content,
      };
    case 'SET_CONTENT':
      // Don't add to history if content hasn't changed
      if (action.payload === state.content) {
        return state;
      }
      
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        action.payload
      ].slice(-MAX_HISTORY_SIZE);

      return {
        ...state,
        content: action.payload,
        isDirty: true,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    case 'SAVE':
      return {
        ...state,
        lastSaved: Date.now(),
        isDirty: false,
      };
    case 'UNDO':
      if (state.historyIndex <= 0 || !state.history.length) return state;
      const prevIndex = state.historyIndex - 1;
      return {
        ...state,
        historyIndex: prevIndex,
        content: state.history[prevIndex],
        isDirty: true,
      };
    case 'REDO':
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIndex = state.historyIndex + 1;
      return {
        ...state,
        historyIndex: nextIndex,
        content: state.history[nextIndex],
        isDirty: true,
      };
    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.payload,
      };
    default:
      return state;
  }
}