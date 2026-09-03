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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3 sm:space-y-4 shadow-xs">
      {/* Top row: View Switcher, Entity Dropdown, History Undo/Redo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* View Mode Tabs */}
        <div className="w-full sm:w-auto">
          <Tabs
            tabs={viewTabs}
            activeTab={viewMode}
            className="w-full sm:w-auto"
            onChange={(id) => {
              setViewMode(id as ScheduleViewMode);
              if (id === 'classes' && classes.length > 0) setSelectedEntityId(classes[0].id);
              if (id === 'teachers' && teachers.length > 0) setSelectedEntityId(teachers[0].id);
              if (id === 'classrooms' && rooms.length > 0) setSelectedEntityId(rooms[0].id);
            }}
          />
        </div>

        {/* Undo/Redo & Conflict Status */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
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
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('zero_conflicts')}
            </span>
          ) : <div />}

          {/* Undo / Redo buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo()}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={t('undo')}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo()}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={t('redo')}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Entity Selector Dropdown (Full width on mobile) */}
      <div className="w-full">
        {viewMode === 'classes' && (
          <select
            className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 cursor-pointer"
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
            className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 cursor-pointer"
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
            className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 cursor-pointer"
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

      {/* Row 3: Swipeable Day Filters row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-scroll">
        <button
          type="button"
          onClick={() => setFilterDay(undefined)}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            filterDay === undefined
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {t('all_week')}
        </button>
        {settings.workingDays.map((day) => (
          <button
            type="button"
            key={day}
            onClick={() => setFilterDay(day)}
            className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              filterDay === day
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {getDayShortName(day, language)}
          </button>
        ))}
      </div>

      {/* Row 4: Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {schedule && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => optimizeCurrentSchedule()}
                isLoading={isOptimizing}
                title={t('optimize')}
                className="px-3"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                <span className="hidden sm:inline">{t('optimize')}</span>
                <span className="sm:hidden">{language === 'uz' ? 'Oraliq' : 'Окна'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                title="Excel (.xlsx)"
                className="px-3"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportModalOpen(true)}
                title="PDF"
                className="border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold px-3"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                PDF
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSchedule}
                title={t('clear')}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => generateSchedule()}
          isLoading={isGenerating}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          {schedule ? t('regenerate_schedule') : t('generate_schedule')}
        </Button>
      </div>

      {/* Modern PDF Export & Print Modal */}
      <ExportPdfModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
