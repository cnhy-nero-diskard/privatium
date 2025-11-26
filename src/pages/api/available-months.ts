import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ message: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
