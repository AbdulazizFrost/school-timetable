import React from 'react';
import { DAY_NAMES, DAY_SHORT_NAMES } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../common/Button';

export const WorkingDaysConfig: React.FC = () => {
  const { settings, updateSettings, language, t } = useSchoolStore();

  const allDays = [1, 2, 3, 4, 5, 6]; // Mon - Sat

  const toggleDay = (day: number) => {
    const isWorking = settings.workingDays.includes(day);
    let newDays: number[];
    if (isWorking) {
      if (settings.workingDays.length <= 1) return; // keep at least 1
      newDays = settings.workingDays.filter((d) => d !== day);
    } else {
      newDays = [...settings.workingDays, day].sort();
    }
    updateSettings({ workingDays: newDays });
  };

  const handlePeriodsChange = (day: number, count: number) => {
    const safeCount = Math.max(1, Math.min(10, count));
    updateSettings({
      periodsPerDay: {
        ...settings.periodsPerDay,
        [day]: safeCount,
      },
    });
  };

  const applyPreset = (days: number[], periodsCount: number) => {
    const newPeriods: Record<number, number> = {};
    days.forEach((d) => {
      newPeriods[d] = periodsCount;
    });
    updateSettings({
      workingDays: days,
      periodsPerDay: newPeriods,
    });
  };

  const totalWeeklySlots = settings.workingDays.reduce(
    (acc, d) => acc + (settings.periodsPerDay[d] || 7),
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {language === 'uz' ? "O'qish kunlari va kunlik darslar soni" : 'Учебные дни и количество уроков'}
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {language === 'uz'
                ? `Hozirgi sig'im: haftasiga ${totalWeeklySlots} soat/dars joyi mavjud.`
                : `Текущая вместимость сетки: ${totalWeeklySlots} уроков в неделю.`}
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset([1, 2, 3, 4, 5], 7)}
              className="text-[11px] font-semibold"
            >
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
              {language === 'uz' ? '5 kun x 7 dars (35 soat)' : '5 дней по 7 уроков (35 ч.)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset([1, 2, 3, 4, 5], 5)}
              className="text-[11px]"
            >
              {language === 'uz' ? '5 kun x 5 dars (25 soat)' : '5 дней по 5 уроков (25 ч.)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset([1, 2, 3, 4, 5, 6], 6)}
              className="text-[11px]"
            >
              {language === 'uz' ? '6 kun x 6 dars (36 soat)' : '6 дней по 6 уроков (36 ч.)'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {allDays.map((day) => {
            const isWorking = settings.workingDays.includes(day);
            const periodsCount = settings.periodsPerDay[day] || 7;

            return (
              <div
                key={day}
                className={`p-3.5 rounded-xl border transition-all ${
                  isWorking
                    ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={isWorking}
                      onChange={() => toggleDay(day)}
                    />
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                      {DAY_NAMES[day]}
                    </span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {isWorking ? (language === 'uz' ? "O'qish kuni" : 'Учебный день') : (language === 'uz' ? 'Dam olish' : 'Выходной')}
                  </span>
                </div>

                {isWorking && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {language === 'uz' ? 'Kunlik darslar soni:' : 'Уроков в день:'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-xs text-slate-900 dark:text-slate-100"
                        value={periodsCount}
                        onChange={(e) => handlePeriodsChange(day, Number(e.target.value))}
                      />
                      <span className="text-[11px] text-slate-400">{language === 'uz' ? 'ta' : 'ур.'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
