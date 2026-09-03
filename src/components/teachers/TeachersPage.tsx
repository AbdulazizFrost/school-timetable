import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Edit2,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users,
  History,
  Check,
} from 'lucide-react';
import { Teacher } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { TeacherModal } from './TeacherModal';
import { BatchTeacherModal } from './BatchTeacherModal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Card, CardContent } from '../common/Card';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';

export const TeachersPage: React.FC = () => {
  const { teachers, classes, subjects, settings, deleteTeacher, language, t, recoverTeachersFromAudit } =
    useSchoolStore();

  const [restoreMsg, setRestoreMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.shortName && t.shortName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubject =
      selectedSubjectFilter === 'all' || t.subjectIds.includes(selectedSubjectFilter);

    return matchesSearch && matchesSubject;
  });

  const totalLoad = teachers.reduce((acc, t) => acc + (t.weeklyLoad || 0), 0);

  const handleAdd = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingTeacherId) {
      deleteTeacher(deletingTeacherId);
      setDeletingTeacherId(null);
    }
  };

  const handleRecover = () => {
    const count = recoverTeachersFromAudit();
    if (count > 0) {
      setRestoreMsg(
        language === 'uz'
          ? `✓ Audit jurnalidan ${count} nafar o'qituvchi muvaffaqiyatli tiklandi!`
          : `✓ Успешно восстановлено ${count} учителей из журнала действий!`
      );
    } else {
      setRestoreMsg(
        language === 'uz'
          ? "Audit jurnalida yangi qo'shilgan o'qituvchilar topilmadi."
          : 'Все добавленные ранее учителя уже присутствуют в списке.'
      );
    }
    setTimeout(() => setRestoreMsg(''), 7000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t('teachers_title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'uz' ? 'Jami' : 'Всего'}: {teachers.length} {language === 'uz' ? "nafar o'qituvchi" : 'учителей'} •{' '}
            {language === 'uz' ? 'Umumiy yuklama' : 'Суммарная нагрузка'}: {totalLoad} {t('hours')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecover}
            title={language === 'uz' ? "Audit jurnalidan o'qituvchilarni tiklash" : "Восстановить ранее добавленных учителей из журнала аудита"}
            className="text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 font-bold"
          >
            <History className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400" />
            <span>{language === 'uz' ? "O'qituvchilarni tiklash" : "Восстановить учителей"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsBatchOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            {t('import_teachers')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('add_teacher')}
          </Button>
        </div>
      </div>

      {restoreMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{restoreMsg}</span>
        </div>
      )}

      {/* Filters bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder={language === 'uz' ? "O'qituvchi F.I.Sh. bo'yicha qidirish..." : 'Поиск по ФИО преподавателя...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="w-full sm:w-64">
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              >
                <option value="all">
                  {language === 'uz' ? `Barcha fanlar (${subjects.length})` : `Все предметы (${subjects.length})`}
                </option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table / Grid */}
      {filteredTeachers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery || selectedSubjectFilter !== 'all'
              ? (language === 'uz' ? 'Hech narsa topilmadi' : 'Ничего не найдено')
              : (language === 'uz' ? "O'qituvchilar hali kiritilmagan" : 'Учителей пока нет')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedSubjectFilter !== 'all'
              ? (language === 'uz' ? "Qidiruv parametrlarini o'zgartiring yoki filtrni tozalang." : 'Попробуйте изменить параметры поиска или сбросить фильтр.')
              : (language === 'uz' ? "Birinchi o'qituvchini qo'shing yoki tayyor namunani yuklang." : 'Добавьте первого преподавателя или загрузите демо-данные для быстрого старта.')}
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              {t('add_teacher')}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="p-3.5 font-semibold">{t('teacher_name')}</th>
                  <th className="p-3.5 font-semibold">{t('teacher_subjects')} (soatlari bilan)</th>
                  <th className="p-3.5 font-semibold text-center">{language === 'uz' ? 'Umumiy yuklama' : 'Нагрузка'}</th>
                  <th className="p-3.5 font-semibold text-center">{language === 'uz' ? 'Maks/kun' : 'Макс/день'}</th>
                  <th className="p-3.5 font-semibold text-center">{language === 'uz' ? 'Mavjudlik' : 'Доступность'}</th>
                  <th className="p-3.5 font-semibold text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeachers.map((teacher) => {
                  const teacherSubjects = teacher.subjectIds
                    .map((id) => subjectMap.get(id))
                    .filter(Boolean);

                  // Calculate availability percentage
                  let totalPossible = 0;
                  let availableCount = 0;
                  settings.workingDays.forEach((d) => {
                    const maxP = settings.periodsPerDay[d] || 7;
                    for (let p = 1; p <= maxP; p++) {
                      totalPossible++;
                      if (teacher.availability[`${d}-${p}`] !== false) {
                        availableCount++;
                      }
                    }
                  });

                  const availPercent = totalPossible > 0 ? Math.round((availableCount / totalPossible) * 100) : 100;

                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                            style={{ backgroundColor: teacher.color || '#3b82f6' }}
                          >
                            {teacher.fullName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {teacher.fullName}
                            </p>
                            {teacher.shortName && (
                              <p className="text-[11px] text-slate-400">
                                {teacher.shortName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1.5 max-w-sm">
                          {/* Subjects */}
                          <div className="flex flex-wrap gap-1">
                            {teacherSubjects.map((sub) => {
                              const hours = teacher.subjectHours?.[sub!.id];
                              return (
                                <span
                                  key={sub!.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                                  style={{
                                    backgroundColor: `${sub!.color}20`,
                                    color: sub!.color,
                                  }}
                                >
                                  <span>{sub!.name}</span>
                                  {hours !== undefined && (
                                    <span className="font-bold opacity-90">
                                      • {hours} {t('hours')}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>

                          {/* Class Allocations */}
                          {teacher.classAllocations && teacher.classAllocations.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                              {teacher.classAllocations.map((alloc) => {
                                const targetClass = classes.find((c) => c.id === alloc.classId);
                                const targetSub = subjectMap.get(alloc.subjectId);
                                return (
                                  <span
                                    key={alloc.id}
                                    className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono"
                                  >
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                      {targetClass?.name || alloc.classId}:
                                    </span>
                                    <span>{targetSub?.shortName || targetSub?.name}</span>
                                    <span className="font-bold">({alloc.lessonsPerWeek}ч)</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {teacher.weeklyLoad} {t('hours')}
                      </td>

                      <td className="p-3.5 text-center font-mono text-slate-600 dark:text-slate-400">
                        {teacher.maxLessonsPerDay} {t('lesson')}
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            availPercent >= 90
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : availPercent >= 70
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {availPercent}%
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                          title={t('edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTeacherId(teacher.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teacherToEdit={editingTeacher}
      />

      <BatchTeacherModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!deletingTeacherId}
        onClose={() => setDeletingTeacherId(null)}
        onConfirm={confirmDelete}
        title={language === 'uz' ? "O'qituvchini o'chirish" : 'Удалить преподавателя?'}
        message={language === 'uz' ? "Ushbu o'qituvchi o'chiriladi va sinflar o'quv rejasidan bo'shatiladi." : 'Преподаватель будет удален и снят с закрепленных уроков в учебных планах классов.'}
        confirmText={t('delete')}
      />
    </div>
  );
};
