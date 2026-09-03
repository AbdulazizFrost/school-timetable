export const SUBJECT_PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#e11d48', // Rose
  '#0284c7', // Sky
  '#d97706', // Yellow
  '#7c3aed', // Violet
];

export const getContrastTextColor = (hexColor?: string): string => {
  if (!hexColor || hexColor.length < 6) return '#ffffff';
  
  const cleanHex = hexColor.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  
  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
};

export const getSubjectBadgeStyle = (hexColor?: string) => {
  const bg = hexColor || '#3b82f6';
  const text = getContrastTextColor(bg);
  return {
    backgroundColor: bg,
    color: text,
    borderColor: 'rgba(0,0,0,0.1)',
  };
};

export const getSubjectSoftStyle = (hexColor?: string) => {
  const color = hexColor || '#3b82f6';
  return {
    backgroundColor: `${color}18`, // 10% opacity
    borderColor: `${color}40`,     // 25% border
    color: color,
  };
};
