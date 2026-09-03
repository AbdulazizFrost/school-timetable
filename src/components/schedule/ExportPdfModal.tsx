import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Printer,
  Sparkles,
  Users,
  LayoutGrid,
  CheckCircle2,
  Loader2,
  Eye,
  Settings2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { exportService, PDFExportOptions } from '../../services/exportService';

export interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({ isOpen, onClose }) => {
  const { classes, teachers, subjects, rooms, settings, language } = useSchoolStore();
  const { schedule } = useScheduleStore();

  const [scope, setScope] = useState<'classes' | 'teachers' | 'master_grid'>('classes');
  const [targetClassId, setTargetClassId] = useState<string>('all');
  const [targetTeacherId, setTargetTeacherId] = useState<string>('all');
  const [docLanguage, setDocLanguage] = useState<'ru' | 'uz'>(language === 'uz' ? 'uz' : 'ru');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  if (!schedule) return null;

  const isUz = docLanguage === 'uz';

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // Selected preview class
  const previewClassId = targetClassId === 'all' ? (classes[0]?.id || '') : targetClassId;
  const previewClass = classMap.get(previewClassId);
  const previewClassEntries = schedule.entries.filter((e) => e.classId === previewClassId);

  // Selected preview teacher
  const previewTeacherId = targetTeacherId === 'all' ? (teachers[0]?.id || '') : targetTeacherId;
  const previewTeacher = teacherMap.get(previewTeacherId);
  const previewTeacherEntries = schedule.entries.filter((e) => e.teacherId === previewTeacherId);

  const maxPeriod = Math.max(...settings.workingDays.map((d) => settings.periodsPerDay[d] || 7));

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress(isUz ? 'PDF tayyorlanmoqda...' : 'Создание PDF...');

    try {
      const options: PDFExportOptions = {
        scope,
        targetClassId: scope === 'classes' ? targetClassId : undefined,
        targetTeacherId: scope === 'teachers' ? targetTeacherId : undefined,
        language: docLanguage,
        onProgress: (current, total, msg) => {
          setExportProgress(msg);
        },
      };

      await exportService.exportToPDF(schedule, teachers, classes, subjects, rooms, settings, options);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleExportExcel = () => {
    exportService.exportToExcel(schedule, teachers, classes, subjects, rooms, settings, docLanguage);
  };

  const handlePrint = () => {
    exportService.triggerPrint();
  };

  const dayLabels = isUz
    ? { 1: 'Dushanba', 2: 'Seshanba', 3: 'Chorshanba', 4: 'Payshanba', 5: 'Juma', 6: 'Shanba', 7: 'Yakshanba' }
    : { 1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isUz ? 'Dars jadvalini eksport qilish va chop etish' : 'Экспорт и печать школьного расписания'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isUz ? "A4 Landscape formatida rasmiy nashrga tayyor hujjat" : "Официальный документ для печати в формате A4 Альбомная"}
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* TOP CONTROLS: Mode, Target & Language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          {/* 1. Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-blue-500" />
              {isUz ? "Jadval turi:" : "Тип расписания:"}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-200/70 dark:bg-slate-900/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setScope('classes')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scope === 'classes'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {isUz ? 'Sinflar' : 'Классы'}
              </button>
              <button
                type="button"
                onClick={() => setScope('teachers')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scope === 'teachers'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {isUz ? "O'qituvchilar" : 'Учителя'}
              </button>
              <button
                type="button"
                onClick={() => setScope('master_grid')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scope === 'master_grid'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {isUz ? 'Svodnaya' : 'Сводная'}
              </button>
            </div>
          </div>

          {/* 2. Target Entity Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {scope === 'classes' && (isUz ? 'Sinfni tanlang:' : 'Выбор класса:')}
              {scope === 'teachers' && (isUz ? "O'qituvchini tanlang:" : 'Выбор учителя:')}
              {scope === 'master_grid' && (isUz ? 'Ko‘lam:' : 'Объём:')}
            </label>
            {scope === 'classes' && (
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100"
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
              >
                <option value="all">
                  ✨ {isUz ? `Barcha ${classes.length} ta sinf (alohida A4 varaqda)` : `Все ${classes.length} классов (по 1 стр. на класс)`}
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {isUz ? 'sinfi' : 'класс'} ({c.studentCount} {isUz ? "o'quvchi" : 'уч.'})
                  </option>
                ))}
              </select>
            )}

            {scope === 'teachers' && (
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100"
                value={targetTeacherId}
                onChange={(e) => setTargetTeacherId(e.target.value)}
              >
                <option value="all">
                  ✨ {isUz ? `Barcha ${teachers.length} ta o'qituvchi` : `Все ${teachers.length} преподавателей`}
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.weeklyLoad} {isUz ? 'soat' : 'ч.'})
                  </option>
                ))}
              </select>
            )}

            {scope === 'master_grid' && (
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                📊 {isUz ? `Barcha sinflar umumiy jadvali` : `Сводная таблица по всей школе`}
              </div>
            )}
          </div>

          {/* 3. Document Language */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isUz ? 'Hujjat tili:' : 'Язык документа:'}
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 dark:bg-slate-900/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDocLanguage('uz')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  docLanguage === 'uz'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                🇺🇿 O'zbekcha
              </button>
              <button
                type="button"
                onClick={() => setDocLanguage('ru')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  docLanguage === 'ru'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                🇷🇺 Русский
              </button>
            </div>
          </div>
        </div>

        {/* LIVE PREVIEW CONTAINER */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              {isUz ? 'PDF ko‘rinishi (A4 Landscape formati):' : 'Предварительный просмотр (формат A4 Альбомная):'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {scope === 'classes' && targetClassId === 'all'
                ? (isUz ? `Jami ${classes.length} ta A4 sahifa yaratiladi` : `Будет создано ${classes.length} страниц A4`)
                : (isUz ? '1 ta sahifa A4' : '1 страница A4')}
            </span>
          </div>

          {/* Scaled Visual Preview Card */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-100 dark:bg-slate-950/80 p-3 sm:p-4 overflow-x-auto shadow-inner">
            <div className="bg-white text-slate-900 rounded-xl p-5 shadow-lg border border-slate-300/80 max-w-[860px] mx-auto text-xs min-w-[650px] font-sans">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-tight uppercase">
                    {settings.schoolName || (isUz ? "1-SONLI UMUMIY O'RTA TA'LIM MAKTABI" : 'ГОСУДАРСТВЕННАЯ ШКОЛА № 1')}
                  </h3>
                  <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                    {scope === 'classes' && `${isUz ? 'RASMIY DARS JADVALI' : 'ОФИЦИАЛЬНОЕ РАСПИСАНИЕ УРОКОВ'} • ${settings.academicYear || '2026–2027'} • ${previewClass?.shift || 1}-${isUz ? 'smena' : 'смена'}`}
                    {scope === 'teachers' && `${isUz ? "O'QITUVCHI DARS JADVALI" : 'РАСПИСАНИЕ ПРЕПОДАВАТЕЛЯ'} • ${settings.academicYear || '2026–2027'}`}
                    {scope === 'master_grid' && `${isUz ? 'UMUMIY MAKTAB DARS JADVALI' : 'СВОДНОЕ РАСПИСАНИЕ ШКОЛЫ'} • ${settings.academicYear || '2026–2027'}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-extrabold px-3 py-1 rounded-md text-xs tracking-wider">
                    {scope === 'classes' && `${previewClass?.name || '1-A'} ${isUz ? 'SINF' : 'КЛАСС'}`}
                    {scope === 'teachers' && (previewTeacher?.fullName || 'O\'qituvchi')}
                    {scope === 'master_grid' && (isUz ? 'BARCHA SINFLAR' : 'ВСЕ КЛАССЫ')}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">
                    {scope === 'classes' && `${previewClass?.studentCount || 0} ${isUz ? "o'quvchi" : 'уч.'} • ${previewClassEntries.length} ${isUz ? 'soat/hafta' : 'ч/нед'}`}
                    {scope === 'teachers' && `${previewTeacher?.weeklyLoad || 0} ${isUz ? 'soat haftalik' : 'ч. в неделю'}`}
                  </div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-300 text-center text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold h-7">
                    <th className="w-8 border border-slate-900">№</th>
                    <th className="w-20 border border-slate-900">{isUz ? 'Vaqt' : 'Время'}</th>
                    {settings.workingDays.map((d) => (
                      <th key={d} className="border border-slate-900 py-1">
                        {dayLabels[d as keyof typeof dayLabels]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((p) => {
                    const timeConfig = settings.periodTimes.find((pt) => pt.period === p);
                    const timeStr = timeConfig ? `${timeConfig.startTime} – ${timeConfig.endTime}` : '';
                    return (
                      <tr key={p} className={p % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 font-bold bg-slate-100 text-slate-800 py-1.5">{p}</td>
                        <td className="border border-slate-300 font-mono text-slate-600 text-[9.5px] py-1.5">{timeStr}</td>
                        {settings.workingDays.map((d) => {
                          if (scope === 'classes') {
                            const entry = previewClassEntries.find((e) => e.day === d && e.period === p);
                            if (!entry) return <td key={d} className="border border-slate-300 text-slate-300 py-1.5">—</td>;
                            const sub = subjectMap.get(entry.subjectId);
                            const tch = teacherMap.get(entry.teacherId);
                            const rm = roomMap.get(entry.classroomId);
                            const isKelajak = entry.subjectId === 'kelajak-darsi' || sub?.name?.toLowerCase().includes('kelajak');

                            return (
                              <td key={d} className="border border-slate-300 p-1">
                                <div className={isKelajak ? 'bg-blue-50 border border-blue-200 rounded p-1' : ''}>
                                  <div className={`font-bold text-[10.5px] ${isKelajak ? 'text-blue-700' : 'text-slate-900'}`}>
                                    {sub?.name || 'Dars'}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-medium">
                                    {tch?.shortName || tch?.fullName} {rm?.roomNumber ? `• x.${rm.roomNumber}` : ''}
                                  </div>
                                </div>
                              </td>
                            );
                          } else {
                            const entry = previewTeacherEntries.find((e) => e.day === d && e.period === p);
                            if (!entry) return <td key={d} className="border border-slate-300 text-slate-300 py-1.5">—</td>;
                            const cls = classMap.get(entry.classId);
                            const sub = subjectMap.get(entry.subjectId);
                            return (
                              <td key={d} className="border border-slate-300 p-1">
                                <span className="inline-block bg-slate-900 text-white font-bold text-[9px] px-1.5 py-0.5 rounded mr-1">
                                  {cls?.name}
                                </span>
                                <span className="font-bold text-[10px] text-slate-900">{sub?.shortName || sub?.name}</span>
                              </td>
                            );
                          }
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-300 pt-2.5 mt-2.5 text-[9.5px] text-slate-500">
                <span>{isUz ? "Rasmiy maktab dars jadvali" : "Официальное школьное расписание"} • {settings.academicYear || '2026–2027'}</span>
                <span className="font-semibold text-slate-700">{isUz ? "Tasdiqlayman: Maktab direktori" : "Утверждаю: Директор школы"} __________________</span>
                <span className="font-bold text-slate-900">{isUz ? '1-sahifa' : 'Страница 1'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleExportExcel}
              disabled={isExporting}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
              {isUz ? 'Excel (.xlsx)' : 'Скачать Excel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handlePrint}
              disabled={isExporting}
            >
              <Printer className="w-4 h-4 mr-2 text-slate-600 dark:text-slate-300" />
              {isUz ? 'Chop etish' : 'Печать'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isExporting}
            >
              {isUz ? 'Yopish' : 'Закрыть'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleExportPDF}
              isLoading={isExporting}
              disabled={isExporting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20 px-6 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {exportProgress || (isUz ? 'PDF tayyorlanmoqda...' : 'Создание PDF...')}
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {isUz ? '📄 Dars jadvalini PDF yuklab olish' : '📄 Скачать расписание PDF'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

