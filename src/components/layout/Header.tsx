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
    exportService.exportToExcel(schedule, teachers, classes, subjects, rooms, settings);
  };

  const handleExportPDF = () => {
    if (!schedule) return;
    exportService.exportToPDF(schedule, teachers, classes, subjects, rooms, settings);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'uz' : 'ru');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-20 shrink-0 no-print">
      {/* School Name & Status Indicator */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {settings.schoolName}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('academic_year')}: {settings.academicYear}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            {validation.canProceed ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> {t('ready_to_generate')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="w-3 h-3" /> {t('has_errors')} ({validation.errors.length})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title={language === 'ru' ? "O'zbek tiliga o'tkazish" : 'Переключить на русский'}
        >
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{language === 'ru' ? '🇷🇺 RU' : '🇺🇿 UZ'}</span>
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={loadDemoData}
          title={language === 'ru' ? 'Загрузить готовый пример школы' : "Maktab demo-namunasini yuklash"}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('demo_data')}</span>
        </Button>

        {schedule && (
          <>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              title="Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">{t('excel_export')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              title="PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden md:inline">{t('pdf_export')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportService.triggerPrint()}
              title="Print"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden md:inline">{t('print')}</span>
            </Button>
          </>
        )}

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenBackup}
          title={t('backup_restore')}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{t('project')}</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => generateSchedule()}
          isLoading={isGenerating}
          disabled={isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          <span className="font-semibold">{schedule ? t('regenerate_schedule') : t('generate_schedule')}</span>
        </Button>
      </div>
    </header>
  );
};
