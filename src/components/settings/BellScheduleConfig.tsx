import React from 'react';
import { Clock } from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { PeriodTimeConfig } from '../../types';

export const BellScheduleConfig: React.FC = () => {
  const { settings, updateSettings } = useSchoolStore();

  const maxPeriod = Math.max(...settings.workingDays.map((d) => settings.periodsPerDay[d] || 7), 8);
  const periodTimes = settings.periodTimes || [];

  const handleTimeChange = (period: number, field: 'startTime' | 'endTime', value: string) => {
    let updated = [...periodTimes];
    const existingIndex = updated.findIndex((pt) => pt.period === period);

    if (existingIndex >= 0) {
      updated[existingIndex] = { ...updated[existingIndex], [field]: value };
    } else {
      updated.push({
        period,
        startTime: field === 'startTime' ? value : '08:00',
        endTime: field === 'endTime' ? value : '08:45',
      });
    }

    updated.sort((a, b) => a.period - b.period);
    updateSettings({ periodTimes: updated });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Расписание звонков
        </CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Задайте время начала и окончания каждого урока для отображения в расписании и PDF-отчетах.
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => {
            const config = periodTimes.find((pt) => pt.period === p) || {
              period: p,
              startTime: `0${7 + p}:00`,
              endTime: `0${7 + p}:45`,
            };

            return (
              <div
                key={p}
                className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2.5 shadow-xs"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{p}-урок</span>
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    {config.startTime} – {config.endTime}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Начало
                    </label>
                    <input
                      type="time"
                      className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={config.startTime}
                      onChange={(e) => handleTimeChange(p, 'startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Конец
                    </label>
                    <input
                      type="time"
                      className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={config.endTime}
                      onChange={(e) => handleTimeChange(p, 'endTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
