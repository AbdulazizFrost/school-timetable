export const pluralizeRu = (count: number, one: string, two: string, five: string): string => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${count} ${five}`;
  if (n1 > 1 && n1 < 5) return `${count} ${two}`;
  if (n1 === 1) return `${count} ${one}`;
  return `${count} ${five}`;
};

export const getScoreRatingText = (score: number): { label: string; color: string; bg: string } => {
  if (score >= 90) {
    return { label: 'Превосходно (90-100)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
  }
  if (score >= 80) {
    return { label: 'Хорошо (80-89)', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' };
  }
  if (score >= 65) {
    return { label: 'Удовлетворительно (65-79)', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
  }
  return { label: 'Требует улучшения (<65)', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' };
};
