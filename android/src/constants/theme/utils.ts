/** Convert a 6-digit hex color to an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Parse hex to RGB components for color mixing. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Lighten a hex color toward white. */
export function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const t = Math.max(0, Math.min(1, amount));
  return `rgb(${Math.round(r + (255 - r) * t)}, ${Math.round(g + (255 - g) * t)}, ${Math.round(b + (255 - b) * t)})`;
}
