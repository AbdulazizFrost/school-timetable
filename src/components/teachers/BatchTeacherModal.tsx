import React, { useState } from 'react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SUBJECT_PRESET_COLORS } from '../../utils/colorUtils';

export interface BatchTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchTeacherModal: React.FC<BatchTeacherModalProps> = ({ isOpen, onClose }) => {
  const { subjects, settings, batchAddTeachers } = useSchoolStore();
  const [textData, setTextData] = useState('');
  const [defaultWeeklyLoad, setDefaultWeeklyLoad] = useState(20);
  const [defaultMaxDaily, setDefaultMaxDaily] = useState(5);

  const sampleTemplate = `Ахмедов Алишер, Математика, 20
Иванова Елена, Математика, 24
Смирнов Дмитрий, Русский язык, 18
Кузнецов Валерий, История, 16
Попов Григорий, Физика, 18`;

  const handleImport = () => {
    if (!textData.trim()) return;

    const lines = textData.split('\n').filter((l) => l.trim().length > 0);
    const newTeachers: any[] = [];

    lines.forEach((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const fullName = parts[0];
      const subjectName = parts[1];
      const load = Number(parts[2]) || defaultWeeklyLoad;

      if (!fullName) return;

      // Find matching subject
      const matchingSubject = subjects.find(
        (s) =>
          s.name.toLowerCase().includes(subjectName?.toLowerCase() || '') ||
          s.shortName.toLowerCase() === subjectName?.toLowerCase()
      );

      const subjectIds = matchingSubject ? [matchingSubject.id] : subjects.slice(0, 1).map((s) => s.id);

      const color = SUBJECT_PRESET_COLORS[Math.floor(Math.random() * SUBJECT_PRESET_COLORS.length)];

      newTeachers.push({
        fullName,
        shortName: fullName.split(' ')[0],
        subjectIds,
        weeklyLoad: load,
        maxLessonsPerDay: defaultMaxDaily,
        availability: {},
        color,
      });
    });

    if (newTeachers.length > 0) {
      batchAddTeachers(newTeachers);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Массовое добавление учителей"
      description="Вставьте список преподавателей в формате: ФИО, Предмет, Нагрузка"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Список (по одной строке на учителя):
          </label>
          <textarea
            rows={8}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder={sampleTemplate}
            value={textData}
            onChange={(e) => setTextData(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTextData(sampleTemplate)}
            className="text-xs self-start"
          >
            Вставить пример
          </Button>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" variant="primary" size="md" onClick={handleImport} className="font-bold">
              Добавить преподавателей
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
