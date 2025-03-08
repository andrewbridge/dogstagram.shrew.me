export function msToMinSec(milliseconds) {
    // Convert milliseconds to total seconds
    const totalSeconds = Math.floor(milliseconds / 1000);
  
    // Calculate minutes and remaining seconds
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    // Format as MM:SS with leading zeros for seconds if needed
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a timestamp into a relative time string (e.g., "2 hours ago")
 * @param {number} timestamp - Millisecond timestamp to compare against current time
 * @return {string} Relative time string
 */
export function getRelativeTimeString(timestamp) {
    // Get current time in milliseconds
    const now = Date.now();
  
    // Calculate the time difference in seconds
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
  
    // Define time intervals in seconds
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
  
    // Handle future dates
    if (diffInSeconds < 0) {
      return "in the future";
    }
  
    // Find the appropriate interval
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const count = Math.floor(diffInSeconds / secondsInUnit);
  
      if (count >= 1) {
        // Handle singular vs plural
        return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
      }
    }
  
    return "just now";
}