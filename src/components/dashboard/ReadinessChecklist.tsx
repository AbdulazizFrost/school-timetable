import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  DoorOpen,
  GraduationCap,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { NavSection } from '../layout/Sidebar';

export interface ReadinessChecklistProps {
  onNavigate: (section: NavSection) => void;
}

export const ReadinessChecklist: React.FC<ReadinessChecklistProps> = ({ onNavigate }) => {
  const { teachers, classes, subjects, rooms, settings, validation } = useSchoolStore();
  const { schedule, setDiagnosticsModalOpen } = useScheduleStore();

  const totalCurriculumLessons = classes.reduce((sum, cls) => {
    return sum + (cls.curriculum?.reduce((cSum, req) => cSum + (req.lessonsPerWeek || 0), 0) || 0);
  }, 0);

  const checks = [
    {
      title: 'Учителя добавлены и настроены',
      isReady: teachers.length > 0,
      detail: `${teachers.length} преподавателей`,
      targetSection: 'teachers' as NavSection,
    },
    {
      title: 'Классы и учебные планы сформированы',
      isReady: classes.length > 0 && totalCurriculumLessons > 0,
      detail: `${classes.length} классов (${totalCurriculumLessons} уроков/нед.)`,
      targetSection: 'classes' as NavSection,
    },
    {
      title: 'Предметы и сложность указаны',
      isReady: subjects.length > 0,
      detail: `${subjects.length} предметов`,
      targetSection: 'subjects' as NavSection,
    },
    {
      title: 'Кабинетный фонд настроен',
      isReady: rooms.length > 0,
      detail: `${rooms.length} кабинетов`,
      targetSection: 'rooms' as NavSection,
    },
    {
      title: 'Сетка рабочих дней и звонков',
      isReady: settings.workingDays.length > 0,
      detail: `${settings.workingDays.length} учебных дней`,
      targetSection: 'settings' as NavSection,
    },
    {
      title: 'Проверка жестких ограничений (Hard Constraints)',
      isReady: validation.canProceed,
      detail: validation.canProceed
        ? 'Нет критических конфликтов'
        : `Найдено ошибок: ${validation.errors.length}`,
      targetSection: 'dashboard' as NavSection,
      onAction: !validation.canProceed ? () => setDiagnosticsModalOpen(true) : undefined,
    },
  ];

  const readyCount = checks.filter((c) => c.isReady).length;
  const percent = Math.round((readyCount / checks.length) * 100);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Готовность данных к генерации
        </CardTitle>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono">
          {readyCount} из {checks.length}
        </span>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Progress bar */}
        <div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2.5">
          {checks.map((check, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (check.onAction) check.onAction();
                else onNavigate(check.targetSection);
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-xs"
            >
              <div className="flex items-center gap-2.5">
                {check.isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {check.title}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {check.detail}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
