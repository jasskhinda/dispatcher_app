// Utility functions for date formatting and handling

/**
 * Convert ISO date (YYYY-MM-DD) to US format (MM/DD/YYYY)
 */
export function formatDateToUS(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Convert US format (MM/DD/YYYY) to ISO date (YYYY-MM-DD)
 */
export function formatDateFromUS(usDate) {
  if (!usDate) return '';
  
  // Handle different separators
  const parts = usDate.split(/[\/\-\.]/);
  if (parts.length !== 3) return '';
  
  const month = String(parts[0]).padStart(2, '0');
  const day = String(parts[1]).padStart(2, '0');
  const year = parts[2];
  
  // Validate the parts
  if (month < 1 || month > 12 || day < 1 || day > 31 || year.length !== 4) {
    return '';
  }
  
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in US format (MM/DD/YYYY)
 */
export function getTodayUS() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Validate US date format
 */
export function isValidUSDate(usDate) {
  if (!usDate) return false;
  
  const parts = usDate.split(/[\/\-\.]/);
  if (parts.length !== 3) return false;
  
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return false;
  }
  
  // Create a date and check if it's valid
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}