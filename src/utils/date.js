// utils/date.js - Date formatting utilities

/**
 * Format a date to Arabic locale string
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return 'غير محدد';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'تاريخ غير صالح';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return d.toLocaleDateString('ar-EG', defaultOptions);
}

/**
 * Format time to Arabic locale string
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date and time together
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  if (!date) return 'غير محدد';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'تاريخ غير صالح';
  
  return `${formatDate(date)} - ${formatTime(date)}`;
}

/**
 * Get relative time (e.g., "منذ 2 أيام")
 * @param {Date|string|number} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - d) / 1000);
  
  if (diffInSeconds < 60) return 'منذ لحظات';
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
  if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
  if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 604800)} أسبوع`;
  if (diffInSeconds < 31536000) return `منذ ${Math.floor(diffInSeconds / 2592000)} شهر`;
  return `منذ ${Math.floor(diffInSeconds / 31536000)} سنة`;
}

/**
 * Check if date is overdue
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isOverdue(date) {
  if (!date) return false;
  const d = new Date(date);
  return d < new Date();
}

/**
 * Get days until date
 * @param {Date|string|number} date - Target date
 * @returns {number} Number of days
 */
export function getDaysUntil(date) {
  if (!date) return 0;
  const d = new Date(date);
  const now = new Date();
  const diff = d - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Date string for input
 */
export function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Parse a date string to Date object
 * @param {string|Date} date - Date to parse
 * @returns {Date|null} Parsed Date or null
 */
export function parseDate(date) {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format date for display (short format)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get today's date as ISO string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Add days to a date
 * @param {Date|string|number} date - Starting date
 * @param {number} days - Days to add
 * @returns {Date} New date
 */
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Check if two dates are the same day
 * @param {Date|string|number} date1 
 * @param {Date|string|number} date2 
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
}