import { getSupabaseClient } from './supabaseClient';
import { Tag } from '../types/tags';

export async function createTag(name: string): Promise<Tag> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tags')
    .insert([{ name }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTags(): Promise<Tag[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getJournalTags(journalId: number): Promise<Tag[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('journal_tags')
    .select(`
      tag_id,
      tags:tags(*)
    `)
    .eq('journal_id', journalId);

  if (error) throw error;
  return data?.map(row => row.tags) || [];
}

export async function addTagToJournal(journalId: number, tagId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('journal_tags')
    .insert([{ journal_id: journalId, tag_id: tagId }]);

  if (error) throw error;
}

export async function removeTagFromJournal(journalId: number, tagId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('journal_tags')
    .delete()
    .match({ journal_id: journalId, tag_id: tagId });

  if (error) throw error;
}

export async function updateJournalTags(journalId: number, tagIds: number[]): Promise<void> {
  const supabase = getSupabaseClient();
  
  // First, delete all existing tags for this journal
  await supabase
    .from('journal_tags')
    .delete()
    .eq('journal_id', journalId);

  // Then insert new tags if any
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('journal_tags')
      .insert(tagIds.map(tagId => ({ journal_id: journalId, tag_id: tagId })));

    if (error) throw error;
  }
}

export async function searchTags(query: string): Promise<Tag[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name');

  if (error) throw error;
  return data || [];
}
