// Utility functions for working with date filtering and AI summary 

/**
 * Group entries by month and year
 * @param entries The journal entries
 * @returns An object with keys as 'YYYY-MM' and values as entry arrays
 */
export function groupEntriesByMonth(entries: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    
    grouped[monthKey].push(entry);
  });
  
  return grouped;
}

/**
 * Format a month key (YYYY-MM) into a human-readable string
 * @param monthKey The month key in format 'YYYY-MM'
 * @returns A formatted string like 'September 2025'
 */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

/**
 * Get entries for a specific month
 * @param entries All journal entries
 * @param monthKey The month key in format 'YYYY-MM'
 * @returns Entries belonging to that month
 */
export function getEntriesForMonth(entries: any[], monthKey: string): any[] {
  const [year, month] = monthKey.split('-');
  
  return entries.filter(entry => {
    const date = new Date(entry.date);
    return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
  });
}

/**
 * Get the current month key in format 'YYYY-MM'
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}