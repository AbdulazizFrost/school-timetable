import React from 'react';
import { QuickActions } from './QuickActions';
import { DashboardStats } from './DashboardStats';
import { ScoreWidget } from './ScoreWidget';
import { ReadinessChecklist } from './ReadinessChecklist';
import { NavSection } from '../layout/Sidebar';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

export interface DashboardPageProps {
  onNavigate: (section: NavSection) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { schedule, setConflictDrawerOpen } = useScheduleStore();
  const { classes, teachers, subjects } = useSchoolStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <QuickActions onNavigate={onNavigate} />

      {/* Stats Counter Bar */}
      <DashboardStats />

      {/* Main Grid: Score Widget & Readiness Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScoreWidget />
        <ReadinessChecklist onNavigate={onNavigate} />
      </div>

      {/* Conflict Alert Banner if any conflicts */}
      {schedule && schedule.conflicts.length > 0 && (
        <Card className="border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  В расписании обнаружено {schedule.conflicts.length} конфликтов
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Нажмите для подробного просмотра и устранения накладок.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConflictDrawerOpen(true)}
              className="text-xs font-semibold shrink-0"
            >
              Открыть панель конфликтов
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schedule Preview Section */}
      {schedule && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Текущее активное расписание
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {schedule.name} • Всего уроков: {schedule.entries.length}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('schedule')}>
              <span>Открыть интерактивную сетку</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
