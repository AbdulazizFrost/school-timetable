import React from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Plus,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Button } from '../common/Button';
import { NavSection } from '../layout/Sidebar';
import { exportService } from '../../services/exportService';

export interface QuickActionsProps {
  onNavigate: (section: NavSection) => void;
  onOpenAddTeacher?: () => void;
  onOpenAddClass?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const { teachers, classes, subjects, rooms, settings, loadDemoData } = useSchoolStore();
  const { schedule, generateSchedule, isGenerating } = useScheduleStore();

  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/15 relative overflow-hidden">
      {/* Background ambient shapes */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> CSP Backtracking + AI Optimizer
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Автоматическое составление школьного расписания
          </h2>
          <p className="text-sm text-blue-100 mt-2 leading-relaxed opacity-90">
            Система гарантирует 100% соблюдение обязательных правил (отсутствие накладок у учителей, классов и кабинетов) и оптимизирует окна преподавателей.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button
            size="lg"
            onClick={() => generateSchedule()}
            isLoading={isGenerating}
            disabled={isGenerating}
            className="bg-white text-blue-600 hover:bg-blue-50 active:bg-blue-100 shadow-lg shadow-black/10 border-0 font-bold text-sm sm:text-base px-6 py-3"
          >
            <Sparkles className="w-5 h-5 mr-2 text-indigo-600 animate-pulse-subtle" />
            {schedule ? 'Пересоставить расписание' : 'Составить расписание'}
          </Button>

          {schedule && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate('schedule')}
              className="bg-white/15 hover:bg-white/25 border-white/30 text-white font-semibold text-sm backdrop-blur-md"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Открыть сетку
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
