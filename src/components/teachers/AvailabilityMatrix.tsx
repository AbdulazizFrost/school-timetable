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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {language === 'uz'
            ? "O'qituvchining bandlik matritsasi (kunlar va 7 ta dars soati bo'yicha)"
            : 'Матрица доступности учителя (по дням и урокам, 7 уроков)'}
        </label>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 dark:text-slate-500 font-medium mr-1">Шаблоны:</span>
          <button
            type="button"
            onClick={() => setAll(true)}
            className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 font-medium cursor-pointer"
          >
            {language === 'uz' ? '1–7 soat (Barchasi)' : '1–7 ур. (Все)'}
          </button>
          <button
            type="button"
            onClick={() => setPeriodRange(2, 4)}
            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 font-medium cursor-pointer"
            title="Доступны только 2-й, 3-й и 4-й уроки (как у Gulnoza Slux)"
          >
            2–4 ур. (Slux)
          </button>
          <button
            type="button"
            onClick={() => setPeriodRange(1, 4)}
            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 font-medium cursor-pointer"
          >
            1–4 ур.
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 font-medium cursor-pointer"
          >
            {language === 'uz' ? 'Taqiqlash' : 'Запретить'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <th className="p-2.5 text-left font-semibold text-slate-600 dark:text-slate-300 w-24">
                {language === 'uz' ? 'Kun' : 'День'}
              </th>
              {periods.map((p) => (
                <th key={p} className="p-2 font-semibold text-slate-600 dark:text-slate-300 min-w-[38px]">
                  {p} {language === 'uz' ? 'soat' : 'ур.'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {settings.workingDays.map((day) => {
              return (
                <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-2.5 text-left font-medium text-slate-800 dark:text-slate-200">
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      title={language === 'uz' ? "Butun kunni yoqish / o'chirish" : 'Кликните, чтобы включить/выключить весь день'}
                      className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer font-bold"
                    >
                      {DAY_SHORT_NAMES[day] || `Д${day}`}
                    </button>
                  </td>
                  {periods.map((period) => {
                    const key = formatSlotKey(day, period);
                    const isAvail = availability[key] !== false;

                    return (
                      <td key={period} className="p-1">
                        <button
                          type="button"
                          onClick={() => toggleSlot(day, period)}
                          className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isAvail
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 shadow-xs font-bold'
                              : 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900'
                          }`}
                          title={`${DAY_NAMES[day]}, ${period} ${language === 'uz' ? 'dars' : 'урок'}: ${isAvail ? (language === 'uz' ? 'Mavjud (Ruxsat)' : 'Доступен') : (language === 'uz' ? 'Band (Taqiqlangan)' : 'Недоступен')}`}
                        >
                          {isAvail ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
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
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        {language === 'uz'
          ? "Yashil (✓) = o'qituvchi bo'sh, dars qo'yish mumkin. Qizil (✗) = o'qituvchi band / metodik kun."
          : 'Зеленый (✓) = учитель свободен. Красный (✗) = учитель занят / методический день.'}
      </p>
    </div>
  );
};
