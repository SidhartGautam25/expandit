/**
 * Formats seconds into MM:SS format.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculates and formats a percentage.
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  const percentage = Math.round((value / total) * 100);
  return `${percentage}%`;
}
