import React from 'react';
import { Award, CheckCircle2, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Button } from '../common/Button';
import { getScoreRatingText } from '../../utils/formatters';

export const ScoreWidget: React.FC = () => {
  const { schedule, optimizeCurrentSchedule, isOptimizing } = useScheduleStore();

  if (!schedule || !schedule.score) {
    return (
      <Card className="h-full flex flex-col justify-center items-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
          <Award className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          Оценка расписания
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          После генерации система рассчитает качество распределения и отсутствие окон (0–100 баллов).
        </p>
      </Card>
    );
  }

  const { totalScore, rating, breakdown, metrics } = schedule.score;
  const ratingInfo = getScoreRatingText(totalScore);

  const criteria = [
    { label: 'Окна у учителей (25%)', value: breakdown.teacherGapsScore, detail: `${metrics.totalTeacherGaps} окон` },
    { label: 'Баланс нагрузки классов (20%)', value: breakdown.classBalanceScore, detail: `перепад: ${metrics.maxDailyLessonsDiff} ур.` },
    { label: 'Распределение предметов (20%)', value: breakdown.subjectDistributionScore, detail: 'равномерность' },
    { label: 'Сложные предметы (15%)', value: breakdown.difficultSubjectsScore, detail: `${metrics.difficultSubjectsLateCount} в конце дня` },
    { label: 'Сдвоенные уроки (10%)', value: breakdown.consecutiveLessonsScore, detail: `${metrics.consecutiveViolationsCount} нарушений` },
    { label: 'Пожелания учителей (10%)', value: breakdown.teacherPreferencesScore, detail: `${metrics.preferenceFulfillmentPercent}% учтено` },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Качество расписания
          </CardTitle>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ratingInfo.bg} ${ratingInfo.color}`}
        >
          {rating}
        </span>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Main Score Bar */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-md shadow-blue-500/20">
              <span className="text-xl font-black leading-none">{totalScore}</span>
              <span className="text-[9px] font-medium opacity-80 mt-0.5">из 100</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Итоговый рейтинг
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {ratingInfo.label}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalScore >= 85 ? 'bg-emerald-500' : totalScore >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${totalScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-2.5">
          {criteria.map((item, idx) => (
            <div key={idx} className="text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                <span className="font-medium">{item.label}</span>
                <span className="font-mono text-slate-900 dark:text-white font-semibold">
                  {item.value} / 100
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.value >= 85 ? 'bg-emerald-500' : item.value >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Optimize CTA */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => optimizeCurrentSchedule()}
            isLoading={isOptimizing}
            className="w-full text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
            Оптимизировать (устранить окна)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
