import React from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Sparkles,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Button } from '../common/Button';
import { exportService } from '../../services/exportService';

export interface HeaderProps {
  onOpenBackup: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBackup, onOpenSettings }) => {
  const { settings, teachers, classes, subjects, rooms, validation, loadDemoData, language, setLanguage, t } =
    useSchoolStore();
  const { schedule, generateSchedule, isGenerating } = useScheduleStore();

  const handleExportExcel = () => {
    if (!schedule) return;
    exportService.exportToExcel(schedule, teachers, classes, subjects, rooms, settings, language === 'uz' ? 'uz' : 'ru');
  };

  const handleExportPDF = () => {
    if (!schedule) return;
    exportService.exportToPDF(schedule, teachers, classes, subjects, rooms, settings, {
      scope: 'classes',
      language: language === 'uz' ? 'uz' : 'ru',
    });
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'uz' : 'ru');
  };

  const clickCountRef = React.useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });
  const handleTitleClick = () => {
    const now = Date.now();
    if (now - clickCountRef.current.lastTime > 2500) {
      clickCountRef.current.count = 1;
    } else {
      clickCountRef.current.count += 1;
    }
    clickCountRef.current.lastTime = now;

    if (clickCountRef.current.count >= 5) {
      clickCountRef.current.count = 0;
      window.dispatchEvent(new CustomEvent('open-secret-audit'));
    }
  };

  return (
    <header className="h-[calc(3.5rem+env(safe-area-inset-top))] sm:h-16 pt-[env(safe-area-inset-top)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between z-20 shrink-0 no-print">
      {/* School Name & Status Indicator (Stealth trigger: 5 clicks opens Secret Auditor) */}
      <div onClick={handleTitleClick} className="flex items-center gap-2 min-w-0 pr-2 cursor-pointer select-none active:opacity-90">
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
            {settings.schoolName || (language === 'uz' ? "1-sonli maktab" : "Школа № 1")}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            <span className="truncate">{settings.academicYear}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            {validation.canProceed ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="hidden xs:inline">{t('ready_to_generate')}</span>
                <span className="xs:hidden">{language === 'uz' ? 'Tayyor' : 'Готово'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{validation.errors.length} {language === 'uz' ? 'xato' : 'ошиб.'}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer select-none"
          title={language === 'ru' ? "O'zbek tiliga o'tkazish" : 'Переключить на русский'}
        >
          <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{language === 'ru' ? '🇷🇺 RU' : '🇺🇿 UZ'}</span>
        </button>

        {/* Demo data (hidden on tiny screens) */}
        <Button
          variant="outline"
          size="sm"
          onClick={loadDemoData}
          title={language === 'ru' ? 'Загрузить готовый пример школы' : "Maktab demo-namunasini yuklash"}
          className="hidden sm:inline-flex px-2.5 py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{t('demo_data')}</span>
        </Button>

        {/* Schedule Export Shortcuts (hidden on mobile header, already in toolbar) */}
        {schedule && (
          <div className="hidden lg:flex items-center gap-1.5">
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              title="Excel (.xlsx)"
              className="px-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">{t('excel_export')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              title="PDF"
              className="px-2"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden xl:inline">{t('pdf_export')}</span>
            </Button>
          </div>
        )}

        {/* Project Backup (hidden on small phones) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenBackup}
          title={t('backup_restore')}
          className="hidden md:inline-flex px-2"
        >
          <Download className="w-3.5 h-3.5" />
        </Button>

        {/* Primary Generate Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => generateSchedule()}
          isLoading={isGenerating}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs px-2.5 sm:px-3 py-1 text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">
            {schedule ? t('regenerate_schedule') : t('generate_schedule')}
          </span>
          <span className="sm:hidden">
            {language === 'uz' ? 'Tuzish' : 'Создать'}
          </span>
        </Button>
      </div>
    </header>
  );
};
