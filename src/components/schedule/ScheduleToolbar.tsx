import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Copy,
  DoorOpen,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Printer,
  Redo2,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';
import { ScheduleViewMode } from '../../types/schedule';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Button } from '../common/Button';
import { Tabs } from '../common/Tabs';
import { exportService } from '../../services/exportService';
import { getDayShortName } from '../../utils/timeUtils';
import { ExportPdfModal } from './ExportPdfModal';

export const ScheduleToolbar: React.FC = () => {
  const { classes, teachers, rooms, subjects, settings, language, t } = useSchoolStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const {
    schedule,
    viewMode,
    setViewMode,
    selectedEntityId,
    setSelectedEntityId,
    filterDay,
    setFilterDay,
    showAllInGrid,
    setShowAllInGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    generateSchedule,
    isGenerating,
    optimizeCurrentSchedule,
    isOptimizing,
    cloneSchedule,
    clearSchedule,
    setConflictDrawerOpen,
  } = useScheduleStore();

  const handleExportExcel = () => {
    if (!schedule) return;
    exportService.exportToExcel(schedule, teachers, classes, subjects, rooms, settings, language === 'uz' ? 'uz' : 'ru');
  };

  const conflictsCount = schedule?.conflicts.length || 0;

  const viewTabs = [
    { id: 'classes', label: t('view_classes'), icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'teachers', label: t('view_teachers'), icon: <Users className="w-4 h-4" /> },
    { id: 'classrooms', label: t('view_rooms'), icon: <DoorOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
      {/* Top row: View Switcher, Entity Dropdown, History Undo/Redo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-2">
          <Tabs
            tabs={viewTabs}
            activeTab={viewMode}
            onChange={(id) => {
              setViewMode(id as ScheduleViewMode);
              if (id === 'classes' && classes.length > 0) setSelectedEntityId(classes[0].id);
              if (id === 'teachers' && teachers.length > 0) setSelectedEntityId(teachers[0].id);
              if (id === 'classrooms' && rooms.length > 0) setSelectedEntityId(rooms[0].id);
            }}
          />

          {/* Specific Entity Selector */}
          <div className="min-w-[180px]">
            {viewMode === 'classes' && (
              <select
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                value={showAllInGrid ? 'all' : selectedEntityId || (classes[0]?.id ?? '')}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setShowAllInGrid(true);
                  } else {
                    setShowAllInGrid(false);
                    setSelectedEntityId(e.target.value);
                  }
                }}
              >
                <option value="all">📊 {t('summary_grid')}</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.studentCount} {t('class_students').toLowerCase()})
                  </option>
                ))}
              </select>
            )}

            {viewMode === 'teachers' && (
              <select
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                value={showAllInGrid ? 'all' : selectedEntityId || (teachers[0]?.id ?? '')}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setShowAllInGrid(true);
                  } else {
                    setShowAllInGrid(false);
                    setSelectedEntityId(e.target.value);
                  }
                }}
              >
                <option value="all">📊 {t('summary_grid')}</option>
                {teachers.map((tch) => (
                  <option key={tch.id} value={tch.id}>
                    {tch.fullName} ({tch.weeklyLoad} {t('hours')})
                  </option>
                ))}
              </select>
            )}

            {viewMode === 'classrooms' && (
              <select
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                value={showAllInGrid ? 'all' : selectedEntityId || (rooms[0]?.id ?? '')}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setShowAllInGrid(true);
                  } else {
                    setShowAllInGrid(false);
                    setSelectedEntityId(e.target.value);
                  }
                }}
              >
                <option value="all">📊 {t('summary_grid')}</option>
                {rooms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name} ({rm.roomNumber})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Right: History Undo / Redo & Conflicts button */}
        <div className="flex items-center gap-2">
          {conflictsCount > 0 ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConflictDrawerOpen(true)}
              className="text-xs font-semibold animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              {conflictsCount} {t('conflicts')}
            </Button>
          ) : schedule ? (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('zero_conflicts')}
            </span>
          ) : null}

          {/* Undo / Redo buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={t('undo')}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={t('redo')}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Day filters & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* Day Filter Pills */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterDay(undefined)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterDay === undefined
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('all_week')}
          </button>
          {settings.workingDays.map((day) => (
            <button
              key={day}
              onClick={() => setFilterDay(day)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterDay === day
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {getDayShortName(day, language)}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {schedule && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => optimizeCurrentSchedule()}
                isLoading={isOptimizing}
                title={t('optimize')}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                {t('optimize')}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={cloneSchedule}
                title={t('clone')}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                {t('clone')}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                title="Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportModalOpen(true)}
                title="PDF"
                className="border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                {language === 'uz' ? 'PDF yuklab olish' : 'Скачать PDF'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSchedule}
                title={t('clear')}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => generateSchedule()}
            isLoading={isGenerating}
            disabled={isGenerating}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {schedule ? t('regenerate_schedule') : t('generate_schedule')}
          </Button>
        </div>
      </div>

      {/* Modern PDF Export & Print Modal */}
      <ExportPdfModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
