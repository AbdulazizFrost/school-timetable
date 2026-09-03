import React from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Button } from '../common/Button';
import { DAY_NAMES } from '../../types';

export const ConflictDrawer: React.FC = () => {
  const { schedule, conflictDrawerOpen, setConflictDrawerOpen, optimizeCurrentSchedule, isOptimizing } =
    useScheduleStore();
  const { classes, teachers, rooms, subjects } = useSchoolStore();

  if (!conflictDrawerOpen) return null;

  const conflicts = schedule?.conflicts || [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={() => setConflictDrawerOpen(false)}
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 z-10 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Панель конфликтов ({conflicts.length})
            </h3>
          </div>
          <button
            onClick={() => setConflictDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {conflicts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Конфликтов не обнаружено!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Все жесткие ограничения (Hard Constraints) полностью соблюдены.
              </p>
            </div>
          ) : (
            conflicts.map((conflict, idx) => (
              <div
                key={conflict.id || idx}
                className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                    {conflict.type.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {DAY_NAMES[conflict.day]}, {conflict.period} урок
                  </span>
                </div>

                <p className="font-medium text-rose-900 dark:text-rose-200 leading-relaxed">
                  {conflict.message}
                </p>

                {conflict.suggestion && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-1 border-t border-rose-200/50 dark:border-rose-900/40">
                    <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{conflict.suggestion}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        {conflicts.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => optimizeCurrentSchedule()}
              isLoading={isOptimizing}
              className="w-full text-xs font-semibold"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Попробовать исправить автоматически
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
