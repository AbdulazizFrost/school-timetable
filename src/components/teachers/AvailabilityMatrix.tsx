import React from 'react';
import { Check, X } from 'lucide-react';
import { DAY_NAMES, DAY_SHORT_NAMES, ScheduleSettings } from '../../types';
import { formatSlotKey } from '../../utils/timeUtils';
import { useSchoolStore } from '../../store/useSchoolStore';

export interface AvailabilityMatrixProps {
  availability: Record<string, boolean>;
  onChange: (newAvailability: Record<string, boolean>) => void;
  settings: ScheduleSettings;
}

export const AvailabilityMatrix: React.FC<AvailabilityMatrixProps> = ({
  availability,
  onChange,
  settings,
}) => {
  const { language } = useSchoolStore();

  // Always support at least 7 periods
  const settingsMax = Math.max(...settings.workingDays.map((d) => settings.periodsPerDay[d] || 7), 5);
  const maxPeriod = Math.max(7, settingsMax);
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const toggleSlot = (day: number, period: number) => {
    const key = formatSlotKey(day, period);
    const current = availability[key] !== false; // default true
    onChange({
      ...availability,
      [key]: !current,
    });
  };

  const toggleDay = (day: number) => {
    const dayKeys = periods.map((p) => formatSlotKey(day, p));
    const allAvailable = dayKeys.every((k) => availability[k] !== false);

    const updated = { ...availability };
    dayKeys.forEach((k) => {
      updated[k] = !allAvailable;
    });
    onChange(updated);
  };

  const setPeriodRange = (startP: number, endP: number) => {
    const updated: Record<string, boolean> = {};
    settings.workingDays.forEach((day) => {
      periods.forEach((p) => {
        updated[formatSlotKey(day, p)] = p >= startP && p <= endP;
      });
    });
    onChange(updated);
  };

  const setAll = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    settings.workingDays.forEach((day) => {
      periods.forEach((p) => {
        updated[formatSlotKey(day, p)] = val;
      });
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          {language === 'uz'
            ? "O'qituvchining bandlik matritsasi (kunlar va dars soatlari)"
            : 'Матрица доступности учителя (по дням и урокам)'}
        </label>
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px] mr-1">
            {language === 'uz' ? 'Shablonlar:' : 'Шаблоны:'}
          </span>
          <button
            type="button"
            onClick={() => setAll(true)}
            className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 font-bold cursor-pointer"
          >
            {language === 'uz' ? 'Barchasi (1–7)' : 'Все (1–7)'}
          </button>
          <button
            type="button"
            onClick={() => setPeriodRange(1, 4)}
            className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 font-bold cursor-pointer"
          >
            {language === 'uz' ? 'Ertalab 1–4' : 'Утро 1–4'}
          </button>
          <button
            type="button"
            onClick={() => setPeriodRange(4, maxPeriod)}
            className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 font-bold cursor-pointer"
          >
            {language === 'uz' ? 'Tushdan keyin 4–7' : 'День 4–7'}
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 font-bold cursor-pointer"
          >
            {language === 'uz' ? 'Tozalash' : 'Очистить'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto touch-scroll border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-inner">
        <table className="w-full min-w-[360px] text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <th className="p-2 sm:p-3 text-left font-bold w-16 sm:w-20 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-800">
                {language === 'uz' ? 'Kun' : 'День'}
              </th>
              {periods.map((p) => (
                <th key={p} className="p-2 font-bold min-w-[42px] sm:min-w-[48px]">
                  {p} {language === 'uz' ? 'soat' : 'ур.'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {settings.workingDays.map((day) => {
              return (
                <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-2 sm:p-2.5 text-left font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      title={language === 'uz' ? "Butun kunni yoqish / o'chirish" : 'Кликните, чтобы включить/выключить весь день'}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-start text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer"
                    >
                      {DAY_SHORT_NAMES[day] || `Д${day}`}
                    </button>
                  </td>
                  {periods.map((period) => {
                    const key = formatSlotKey(day, period);
                    const isAvail = availability[key] !== false;

                    return (
                      <td key={period} className="p-1 sm:p-1.5">
                        <button
                          type="button"
                          onClick={() => toggleSlot(day, period)}
                          className={`w-full min-w-[40px] sm:min-w-[46px] h-10 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none ${
                            isAvail
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 shadow-xs font-black'
                              : 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900 font-black'
                          }`}
                          title={`${DAY_NAMES[day]}, ${period} ${language === 'uz' ? 'dars' : 'урок'}: ${isAvail ? (language === 'uz' ? 'Mavjud (Ruxsat)' : 'Доступен') : (language === 'uz' ? 'Band (Taqiqlangan)' : 'Недоступен')}`}
                        >
                          {isAvail ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
        {language === 'uz'
          ? "Yashil (✓) = o'qituvchi dars berishga tayyor. Qizil (✗) = o'qituvchi band / dars qo'yish taqiqlangan."
          : 'Зеленый (✓) = учитель доступен для уроков. Красный (✗) = учитель занят / методический день.'}
      </p>
    </div>
  );
};
