import React from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { CurriculumRequirement, Subject, Teacher } from '../../types';
import { Button } from '../common/Button';

export interface CurriculumEditorProps {
  curriculum: CurriculumRequirement[];
  onChange: (curriculum: CurriculumRequirement[]) => void;
  subjects: Subject[];
  teachers: Teacher[];
  maxSlotsPerWeek: number;
}

export const CurriculumEditor: React.FC<CurriculumEditorProps> = ({
  curriculum,
  onChange,
  subjects,
  teachers,
  maxSlotsPerWeek,
}) => {
  const totalHours = curriculum.reduce((sum, item) => sum + (Number(item.lessonsPerWeek) || 0), 0);
  const isOverloaded = totalHours > maxSlotsPerWeek;

  const handleAddRow = () => {
    if (subjects.length === 0) return;
    const firstSubject = subjects[0];
    const eligibleTeachers = teachers.filter((t) => t.subjectIds.includes(firstSubject.id));

    const newReq: CurriculumRequirement = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      subjectId: firstSubject.id,
      teacherId: eligibleTeachers.length > 0 ? eligibleTeachers[0].id : undefined,
      lessonsPerWeek: 2,
    };

    onChange([...curriculum, newReq]);
  };

  const handleUpdateRow = (id: string, updates: Partial<CurriculumRequirement>) => {
    const updated = curriculum.map((item) => {
      if (item.id === id) {
        const next = { ...item, ...updates };
        // If subject changed, auto-adjust teacher if current teacher can't teach new subject
        if (updates.subjectId && updates.subjectId !== item.subjectId) {
          const eligible = teachers.filter((t) => t.subjectIds.includes(updates.subjectId!));
          next.teacherId = eligible.length > 0 ? eligible[0].id : undefined;
        }
        return next;
      }
      return item;
    });
    onChange(updated);
  };

  const handleDeleteRow = (id: string) => {
    onChange(curriculum.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Header & summary */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Учебный план класса (предметы и недельные часы)
          </label>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Укажите количество уроков каждого предмета и ответственного преподавателя.
          </p>
        </div>

        <div className="text-right">
          <span
            className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
              isOverloaded
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
            }`}
          >
            Всего: {totalHours} / {maxSlotsPerWeek} ч.
          </span>
        </div>
      </div>

      {isOverloaded && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Сумма часов ({totalHours}) превышает количество слотов в расписании школы ({maxSlotsPerWeek}).</span>
        </div>
      )}

      {/* Curriculum Items List */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <th className="p-2.5 font-semibold">Предмет</th>
              <th className="p-2.5 font-semibold">Преподаватель</th>
              <th className="p-2.5 font-semibold text-center w-24">Уроков/нед.</th>
              <th className="p-2.5 font-semibold text-center w-12">Удалить</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {curriculum.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400">
                  Учебный план пуст. Нажмите «+ Добавить предмет».
                </td>
              </tr>
            ) : (
              curriculum.map((req) => {
                const eligibleTeachers = teachers.filter((t) => t.subjectIds.includes(req.subjectId));

                return (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2">
                      <select
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                        value={req.subjectId}
                        onChange={(e) => handleUpdateRow(req.id, { subjectId: e.target.value })}
                      >
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2">
                      <select
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                        value={req.teacherId || ''}
                        onChange={(e) => handleUpdateRow(req.id, { teacherId: e.target.value || undefined })}
                      >
                        <option value="">(Авто-выбор преподавателя)</option>
                        {eligibleTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName} ({t.weeklyLoad}ч)
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={15}
                        className="w-16 mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center font-bold font-mono text-slate-900 dark:text-slate-100"
                        value={req.lessonsPerWeek}
                        onChange={(e) => handleUpdateRow(req.id, { lessonsPerWeek: Math.max(1, Number(e.target.value)) })}
                      />
                    </td>

                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(req.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Удалить предмет"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="w-full text-xs font-semibold"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Добавить предмет в учебный план
      </Button>
    </div>
  );
};
