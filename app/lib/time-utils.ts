/**
 * Utility function to format relative timestamps
 * Examples: "1 minute ago", "2 hours ago", "3 days ago", "11/20/2025"
 */

export function formatRelativeTime(dateString: string | Date | number | null | undefined): string {
  if (dateString === null || dateString === undefined) {
    return 'unknown time';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  // Less than 1 minute ago
  if (diffSecs < 60) {
    if (diffSecs < 5) return 'Just now';
    return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
  }

  // Less than 1 hour ago
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }

  // Less than 1 day ago
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  // Less than 1 week ago
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // More than 1 week ago - show date format MM/DD/YYYY
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Get formatted date with time for display
 * Example: "Nov 24, 2025 at 3:45 PM"
 */
export function formatDateWithTime(dateString: string | Date | number): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get just the date without time
 * Example: "Nov 24, 2025"
 */
export function formatDateOnly(dateString: string | Date | number): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
