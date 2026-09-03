import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  RotateCcw,
  Save,
  School,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { WorkingDaysConfig } from './WorkingDaysConfig';
import { BellScheduleConfig } from './BellScheduleConfig';
import { BackupRestoreModal } from './BackupRestoreModal';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, loadDemoData, clearAllData } = useSchoolStore();
  const { clearSchedule } = useScheduleStore();

  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [defaultLessonDuration, setDefaultLessonDuration] = useState(
    settings.defaultLessonDurationMinutes || 45
  );
  const [defaultBreakDuration, setDefaultBreakDuration] = useState(
    settings.defaultBreakDurationMinutes || 10
  );
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      schoolName: schoolName.trim() || 'Школа',
      academicYear: academicYear.trim() || '2026-2027',
      defaultLessonDurationMinutes: Number(defaultLessonDuration),
      defaultBreakDurationMinutes: Number(defaultBreakDuration),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleConfirmReset = () => {
    clearAllData();
    clearSchedule();
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Настройки системы
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Профиль школы, звонки, рабочие дни и управление данными проекта
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsBackupOpen(true)}>
            <Download className="w-4 h-4 mr-1.5" />
            Резервная копия
          </Button>
          <Button variant="outline" size="sm" onClick={loadDemoData}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Загрузить демо
          </Button>
        </div>
      </div>

      {/* School Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Профиль школы
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Общая информация для печатных форм и расписания.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Название учебного заведения *"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Гимназия №1"
              />
              <Input
                label="Учебный год *"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Длительность урока (мин)"
                type="number"
                min={30}
                max={90}
                value={defaultLessonDuration}
                onChange={(e) => setDefaultLessonDuration(Number(e.target.value))}
              />
              <Input
                label="Стандартная перемена (мин)"
                type="number"
                min={5}
                max={40}
                value={defaultBreakDuration}
                onChange={(e) => setDefaultBreakDuration(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {savedSuccess ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
                  ✓ Изменения сохранены
                </span>
              ) : <span />}

              <Button type="submit" variant="primary" size="sm">
                <Save className="w-4 h-4 mr-1.5" />
                Сохранить профиль
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Working Days Config */}
      <WorkingDaysConfig />

      {/* Bell Schedule Config */}
      <BellScheduleConfig />

      {/* Danger Zone */}
      <Card className="border-rose-200 dark:border-rose-950/60 bg-rose-50/20 dark:bg-rose-950/10">
        <CardHeader>
          <CardTitle className="text-base text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Сброс данных
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Очистить всех учителей, классы, предметы и расписание для создания нового учебного заведения с нуля.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-xs font-semibold"
          >
            Очистить все данные школы
          </Button>
        </CardContent>
      </Card>

      {/* Backup Modal */}
      <BackupRestoreModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />

      {/* Reset confirmation */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Очистить все данные?"
        message="Это действие удалит всех учителей, классы, предметы, кабинеты и текущее расписание. Рекомендуем сначала экспортировать резервную копию проекта в JSON."
        confirmText="Очистить всё"
      />
    </div>
  );
};
