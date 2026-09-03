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
  Radio,
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
  const { teachers, classes, subjects, rooms, settings, loadDemoData, language, t } = useSchoolStore();
  const { schedule, generateSchedule, isGenerating } = useScheduleStore();

  const isUz = language === 'uz';

  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 text-white shadow-xl shadow-blue-500/15 relative overflow-hidden">
      {/* Background ambient shapes */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] sm:text-xs font-semibold mb-2 sm:mb-3">
            <Sparkles className="w-3.5 h-3.5" /> CSP Backtracking + AI Optimizer
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
            {isUz ? "Maktab dars jadvalini avtomatik tuzish" : "Автоматическое составление школьного расписания"}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1.5 sm:mt-2 leading-relaxed opacity-90">
            {isUz
              ? "Tizim barcha qat'iy qoidalarni 100% bajaradi (o'qituvchi, sinf va xonalar to'qnashuvsiz) hamda o'qituvchilar oraliq darchalarini minimallashtiradi."
              : "Система гарантирует 100% соблюдение обязательных правил (отсутствие накладок у учителей, классов и кабинетов) и оптимизирует окна преподавателей."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            size="md"
            onClick={() => generateSchedule()}
            isLoading={isGenerating}
            disabled={isGenerating}
            className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 active:bg-blue-100 shadow-lg shadow-black/10 border-0 font-bold text-xs sm:text-sm px-5 py-2.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
            {schedule
              ? (isUz ? "Jadvalni qayta tuzish" : "Пересоставить расписание")
              : (isUz ? "Jadvalni tuzish" : "Составить расписание")}
          </Button>

          {schedule && (
            <>
              <Button
                size="md"
                variant="outline"
                onClick={() => onNavigate('observer')}
                className="w-full sm:w-auto bg-emerald-500/25 hover:bg-emerald-500/35 border-emerald-300/40 text-white font-bold text-xs sm:text-sm backdrop-blur-md cursor-pointer flex items-center gap-1.5"
              >
                <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>{isUz ? "Jonli kuzatuv" : "Наблюдатель (LIVE)"}</span>
              </Button>
              <Button
                size="md"
                variant="outline"
                onClick={() => onNavigate('schedule')}
                className="w-full sm:w-auto bg-white/15 hover:bg-white/25 border-white/30 text-white font-semibold text-xs sm:text-sm backdrop-blur-md cursor-pointer"
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                <span>{isUz ? "Jadvalni ochish" : "Открыть сетку"}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
