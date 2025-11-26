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

/**
 * Generate a list of all months within a range
 * @param monthsBack Number of months to go back from current month (default: 24)
 * @param monthsForward Number of months to go forward from current month (default: 12)
 * @returns Array of month keys in format 'YYYY-MM'
 */
export function generateMonthRange(monthsBack: number = 24, monthsForward: number = 12): string[] {
  const months: string[] = [];
  const now = new Date();
  
  // Generate months going backward
  for (let i = monthsBack; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    months.push(monthKey);
  }
  
  // Generate months going forward
  for (let i = 1; i <= monthsForward; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    months.push(monthKey);
  }
  
  return months;
}

/**
 * Get all available months (combination of months with entries and a reasonable range)
 * @param entries All journal entries
 * @returns Array of month keys sorted from newest to oldest
 */
export function getAllAvailableMonths(entries: any[]): string[] {
  // Get months that have entries
  const monthsWithEntries = Object.keys(groupEntriesByMonth(entries));
  
  // Generate a range of months (2 years back, 1 year forward)
  const monthRange = generateMonthRange(24, 12);
  
  // Combine and deduplicate
  const allMonths = Array.from(new Set([...monthsWithEntries, ...monthRange]));
  
  // Sort from newest to oldest
  return allMonths.sort((a, b) => b.localeCompare(a));
}

/**
 * Get entries for the last X months
 * @param entries All journal entries
 * @param monthsCount Number of months to include (from current month backwards)
 * @returns Entries from the last X months
 */
export function getEntriesForLastMonths(entries: any[], monthsCount: number): any[] {
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);
  
  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= cutoffDate;
  });
}

/**
 * Get entries for the last X years
 * @param entries All journal entries
 * @param yearsCount Number of years to include (from current year backwards)
 * @returns Entries from the last X years
 */
export function getEntriesForLastYears(entries: any[], yearsCount: number): any[] {
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear() - yearsCount + 1, 0, 1);
  
  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= cutoffDate;
  });
}

/**
 * Get entries within a custom date range
 * @param entries All journal entries
 * @param startMonthKey Start month in format 'YYYY-MM'
 * @param endMonthKey End month in format 'YYYY-MM'
 * @returns Entries within the specified range (inclusive)
 */
export function getEntriesForDateRange(entries: any[], startMonthKey: string, endMonthKey: string): any[] {
  const [startYear, startMonth] = startMonthKey.split('-').map(Number);
  const [endYear, endMonth] = endMonthKey.split('-').map(Number);
  
  const startDate = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth, 0); // Last day of end month
  
  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

/**
 * Format a date range description
 * @param rangeType The type of range selected
 * @param value The value (months/years count or month keys)
 * @returns A human-readable description of the range
 */
export function formatDateRangeDescription(rangeType: string, value: any): string {
  switch (rangeType) {
    case 'single':
      return formatMonthKey(value);
    case 'lastMonths':
      return `Last ${value} month${value > 1 ? 's' : ''}`;
    case 'lastYears':
      return `Last ${value} year${value > 1 ? 's' : ''}`;
    case 'custom':
      return `${formatMonthKey(value.start)} - ${formatMonthKey(value.end)}`;
    default:
      return 'Unknown range';
  }
}