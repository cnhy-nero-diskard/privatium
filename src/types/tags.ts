export interface Tag {
  id?: number;
  name: string;
  created_at?: string;
}

export interface JournalTag {
  journal_id: number;
  tag_id: number;
  created_at?: string;
}
