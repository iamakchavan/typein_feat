export type EditorState = {
  content: string;
  baseContent: string;
  lastSaved: number | null;
  isDirty: boolean;
  history: string[];
  historyIndex: number;
};

export type EditorAction = 
  | { type: 'INIT'; payload: { content: string } }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SAVE' }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' };