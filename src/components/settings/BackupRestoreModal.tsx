import React, { useRef, useState } from 'react';
import { Download, FileCode, RotateCcw, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { storageService } from '../../services/storageService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const { settings, teachers, classes, subjects, rooms, importProject } = useSchoolStore();
  const { schedule } = useScheduleStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleExportJSON = () => {
    const jsonString = storageService.exportProjectJSON(
      settings,
      teachers,
      classes,
      subjects,
      rooms,
      schedule
    );

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Проект_расписания_${settings.schoolName.replace(/[\s«»"]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const projectData = storageService.importProjectJSON(content);
        importProject(projectData);
        setImportStatus({
          success: true,
          message: 'Проект успешно восстановлен из резервной копии!',
        });
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: err.message || 'Ошибка импорта файла. Проверьте валидность структуры JSON.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title="Резервное копирование проекта"
      description="Экспорт всех данных школы и расписания в файл JSON или загрузка проекта."
    >
      <div className="space-y-4">
        {/* Export Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              Экспорт всего проекта в JSON
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Сохраняет настройки, преподавателей, классы, учебные планы, кабинеты и текущее расписание.
          </p>
          <Button variant="outline" size="md" onClick={handleExportJSON} className="w-full text-sm font-semibold">
            <Download className="w-4 h-4 mr-2 text-blue-600" />
            Скачать файл проекта (.json)
          </Button>
        </div>

        {/* Import Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              Импорт проекта из JSON
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Загружает ранее сохраненный файл проекта, полностью восстанавливая данные школы.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />

          <Button
            variant="outline"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-sm font-semibold"
          >
            <Upload className="w-4 h-4 mr-2 text-emerald-600" />
            Выбрать файл для загрузки
          </Button>
        </div>

        {/* Status indicator */}
        {importStatus && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
              importStatus.success
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="primary" size="md" onClick={onClose} className="w-full sm:w-auto font-bold">
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
};
