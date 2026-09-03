import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, HelpCircle, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const DiagnosticsModal: React.FC = () => {
  const { diagnosticsModalOpen, setDiagnosticsModalOpen, fatalErrors, generateSchedule } = useScheduleStore();
  const { validation, autoFixCurriculums, language, t } = useSchoolStore();
  const [fixedNotice, setFixedNotice] = useState(false);

  if (!diagnosticsModalOpen) return null;

  const handleAutoFix = () => {
    autoFixCurriculums();
    setFixedNotice(true);
    setTimeout(async () => {
      setFixedNotice(false);
      setDiagnosticsModalOpen(false);
      await generateSchedule();
    }, 200);
  };

  return (
    <Modal
      isOpen={diagnosticsModalOpen}
      onClose={() => setDiagnosticsModalOpen(false)}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-5 h-5" />
          <span>{t('impossible_title')}</span>
        </div>
      }
      description={
        language === 'uz'
          ? "Tizim qat'iy cheklovlarni (Hard Constraints) tekshirdi va mos kelmaydigan shartlarni aniqladi."
          : 'Система проверила жесткие ограничения (Hard Constraints) и выявила несовместимые условия.'
      }
    >
      <div className="space-y-4">
        {fixedNotice ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {language === 'uz'
              ? "Ulanmagan fanlar olib tashlandi va o'qituvchilar avtomatik biriktirildi! Jadval tuzilmoqda..."
              : 'Удаленные предметы очищены, учителя назначены автоматически! Запуск генерации...'}
          </div>
        ) : null}

        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />{' '}
            {language === 'uz' ? 'Aniqlangan ziddiyatlar:' : 'Обнаруженные критические противоречия:'}
          </h4>
          <div className="space-y-3 mt-3 max-h-60 overflow-y-auto pr-1">
            {fatalErrors.length > 0
              ? fatalErrors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                    <span className="w-4 h-4 rounded-full bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed">{err}</p>
                  </div>
                ))
              : validation.errors.map((err, idx) => (
                  <div key={err.id || idx} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                    <p className="font-semibold text-xs text-rose-700 dark:text-rose-300">{err.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{err.message}</p>
                    {err.suggestion && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> {language === 'uz' ? 'Tavsiya' : 'Рекомендация'}: {err.suggestion}
                      </p>
                    )}
                  </div>
                ))}
          </div>
        </div>

        {/* Actionable Suggestions */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
            <HelpCircle className="w-4 h-4 text-blue-500" /> {language === 'uz' ? 'Qanday toʻgʻrilash mumkin:' : 'Как быстро исправить:'}
          </h4>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
            <li>
              {language === 'uz'
                ? "Fanlar bo'limida: Ona tili, O'qish, Tarbiya kabi fanlarning xona turini «Umumiy xona»ga o'zgartiring (Laboratoriya emas)."
                : 'В разделе «Предметы»: для Ona tili, O\'qish, Tarbiya выберите тип кабинета «Любой общий» (а не лаборатории химии/физики).'}
            </li>
            <li>
              {language === 'uz'
                ? "O'qituvchilar bo'limida: har bir o'qituvchiga dars beradigan fanlarini belgilang."
                : 'В разделе «Учителя»: отметьте галочками преподаваемые предметы у учителей.'}
            </li>
            <li>
              {language === 'uz'
                ? "Sinflar o'quv rejasida o'qituvchilarni tanlang yoki quyidagi «Avtomatik tuzatish» tugmasini bosing."
                : 'В учебных планах классов укажите учителей или нажмите кнопку «Исправить автоматически» ниже.'}
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFix}
              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 cursor-pointer"
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              {language === 'uz' ? "Avtomatik to'g'rilash va tuzish" : 'Исправить автоматически и составить'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { loadDemoData } = useSchoolStore.getState();
                loadDemoData();
                setFixedNotice(true);
                setTimeout(async () => {
                  setFixedNotice(false);
                  setDiagnosticsModalOpen(false);
                  await generateSchedule();
                }, 200);
              }}
              className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {language === 'uz' ? "Toza andozani yuklash va tuzish" : 'Сбросить к образцовым данным и составить'}
            </Button>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setDiagnosticsModalOpen(false)}>
            {language === 'uz' ? 'Yopish' : 'Закрыть'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
