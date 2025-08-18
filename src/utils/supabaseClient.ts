import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials or URL');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function getJournals() {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .order('date', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function getJournalById(id: number) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createJournal(journal: { date: string; title: string; content: string; folder: string; mood: string }) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('journals')
    .insert([journal])
    .select();
    
  if (error) throw error;
  return data[0];
}

export async function updateJournal(id: number, journal: { date?: string; title?: string; folder?: string; mood?: string }) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('journals')
    .update(journal)
    .eq('id', id)
    .select();
    
  if (error) throw error;
  return data[0];
}

export async function deleteJournal(id: number) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('journals')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
}
