import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Allow passing Supabase credentials in headers for non-server environments
    // e.g., when simulating runtime credentials from a client
    const headerUrl = req.headers['x-supabase-url'] as string | undefined;
    const headerKey = req.headers['x-supabase-key'] as string | undefined;

    const supabase = getSupabaseClient(
      headerUrl && headerKey ? { supabaseUrl: headerUrl, supabaseKey: headerKey } : undefined
    );

    // Query to get distinct year-months from journal entries
    // We'll extract year-month from the date field and count entries
    const { data, error } = await supabase
      .from('journals')
      .select('date')
      .order('date', { ascending: false });

    if (error) {
      console.error('Supabase error fetching dates:', error);
      return res.status(500).json({ message: 'Failed to fetch available months', error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({ months: [] });
    }

    // Process the dates to extract unique year-months with counts
    const monthMap = new Map<string, number>();
    
    data.forEach((entry: { date: string }) => {
      if (entry.date) {
        // Extract YYYY-MM from the date string
        const yearMonth = entry.date.substring(0, 7); // Gets "YYYY-MM"
        monthMap.set(yearMonth, (monthMap.get(yearMonth) || 0) + 1);
      }
    });

    // Convert to array and sort by date (newest first)
    const months = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return res.status(200).json({ months });

  } catch (error: any) {
    console.error('Error in available-months API:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch available months', 
      error: error.message || 'Unknown error' 
    });
  }
}
