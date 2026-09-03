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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => {
            const config = periodTimes.find((pt) => pt.period === p) || {
              period: p,
              startTime: `0${7 + p}:00`,
              endTime: `0${7 + p}:45`,
            };

            return (
              <div
                key={p}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs space-y-2"
              >
                <div className="font-bold text-slate-900 dark:text-white">
                  {p} урок
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Начало</label>
                    <input
                      type="time"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      value={config.startTime}
                      onChange={(e) => handleTimeChange(p, 'startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Конец</label>
                    <input
                      type="time"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono"
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
