import { DAY_NAMES, DAY_SHORT_NAMES, PeriodTimeConfig } from '../types';
import { Language, translations } from '../i18n/translations';

export const getDayName = (day: number, lang: Language = 'ru'): string => {
  const dict = translations[lang] || translations.ru;
  const key = `day_${day}` as keyof typeof dict;
  return (dict[key] as string) || DAY_NAMES[day] || `Day ${day}`;
};

export const getDayShortName = (day: number, lang: Language = 'ru'): string => {
  const dict = translations[lang] || translations.ru;
  const key = `day_short_${day}` as keyof typeof dict;
  return (dict[key] as string) || DAY_SHORT_NAMES[day] || `D${day}`;
};

export const formatSlotKey = (day: number, period: number): string => {
  return `${day}-${period}`;
};

export const parseSlotKey = (key: string): { day: number; period: number } => {
  const [day, period] = key.split('-').map(Number);
  return { day: day || 1, period: period || 1 };
};

export const getDefaultPeriodTimes = (periodsCount = 8, startHour = 8, startMin = 0, lessonMinutes = 45, breakMinutes = 10): PeriodTimeConfig[] => {
  const result: PeriodTimeConfig[] = [];
  let currentMinutes = startHour * 60 + startMin;

  for (let p = 1; p <= periodsCount; p++) {
    const endMinutes = currentMinutes + lessonMinutes;
    const startH = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
    const startM = String(currentMinutes % 60).padStart(2, '0');
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');

    result.push({
      period: p,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
    });

    const currentBreak = p === 2 || p === 3 ? breakMinutes + 5 : breakMinutes;
    currentMinutes = endMinutes + currentBreak;
  }

  return result;
};
