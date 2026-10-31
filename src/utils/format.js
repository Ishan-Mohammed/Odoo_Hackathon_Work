/**
 * Brightloop Pure Formatting Utilities
 * Standardized INR currency and dates across the entire application.
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number or numeric string to INR standard (e.g. ₹13,593.60 or ₹8,42,000.00)
 */
export function formatMoney(amount, showSymbol = true) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formatted = inrFormatter.format(num);
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format date string or Date instance into standardized single format: "12 Mar 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Return human-readable relative due status:
 * "Due in 5 days" | "Due today" | "3 days overdue"
 */
export function relativeDue(dateStr) {
  if (!dateStr) return '—';
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return '—';

  // Compare calendar days at midnight
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((target - today) / msPerDay);

  if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays > 0) {
    return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } else {
    const overdueDays = Math.abs(diffDays);
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
  }
}
