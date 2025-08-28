import { Tag } from "../types/tags";

interface EntryState {
  id?: string;
  title?: string;
  date?: string;
  content?: string;
  folder?: string;
  mood?: string;
  tags?: Tag[];
}

export const saveEntryState = (entry: EntryState) => {
  sessionStorage.setItem('privatium_entry_state', JSON.stringify(entry));
};

export const getEntryState = (): EntryState | null => {
  const state = sessionStorage.getItem('privatium_entry_state');
  if (!state) return null;
  return JSON.parse(state);
};

export const clearEntryState = () => {
  sessionStorage.removeItem('privatium_entry_state');
};
