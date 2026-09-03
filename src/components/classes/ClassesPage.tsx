import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  DoorOpen,
  Edit2,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { SchoolClass } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Card, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ClassModal } from './ClassModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { pluralizeRu } from '../../utils/formatters';

export const ClassesPage: React.FC = () => {
  const { classes, rooms, subjects, teachers, deleteClass, settings, language, t } = useSchoolStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const totalSlotsPerWeek = settings.workingDays.reduce(
    (sum, d) => sum + (settings.periodsPerDay[d] || 7),
    0
  );

  const totalStudents = classes.reduce((sum, c) => sum + (Number(c.studentCount) || 8), 0);

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = selectedGradeFilter === 'all' || String(cls.grade) === selectedGradeFilter;
    return matchesSearch && matchesGrade;
  });

  // Logical sorting: Grade ascending -> Letter/Name ascending (1-A, 2-A, 3-A, 3-B, 3-D, 4-A, 4-B)
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  const handleEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingClassId) {
      deleteClass(deletingClassId);
      setDeletingClassId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {language === 'uz' ? 'Sinflar va o‘quv rejalari' : 'Классы и учебные планы'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'uz'
              ? `Jami: ${classes.length} ta sinf • ${totalStudents} nafar o'quvchi • Haftalik setka: ${totalSlotsPerWeek} soat`
              : `Всего: ${classes.length} классов • ${totalStudents} учеников • Сетка недели: ${totalSlotsPerWeek} слотов`}
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          {language === 'uz' ? 'Sinf qo‘shish' : 'Добавить класс'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder={language === 'uz' ? 'Sinfni qidirish (masalan: 3-A)...' : 'Поиск класса (например: 3-А)...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
              >
                <option value="all">{language === 'uz' ? 'Barcha parallellar' : 'Все параллели'}</option>
                {Array.from(new Set(classes.map((c) => c.grade)))
                  .sort((a, b) => a - b)
                  .map((g) => (
                    <option key={g} value={String(g)}>
                      {language === 'uz' ? `${g}-sinf` : `${g} класс`}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid */}
      {sortedClasses.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery || selectedGradeFilter !== 'all'
              ? (language === 'uz' ? 'Sinflar topilmadi' : 'Классы не найдены')
              : (language === 'uz' ? 'Sinflar hali qo‘shilmagan' : 'Классы пока не добавлены')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedGradeFilter !== 'all'
              ? (language === 'uz' ? 'Qidiruv so‘zini o‘zgartirib ko‘ring.' : 'Попробуйте изменить поисковый запрос.')
              : (language === 'uz' ? 'Birinchi sinfni yarating va unga o‘quv rejasini kiriting.' : 'Создайте первый класс и задайте для него учебный план.')}
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              {language === 'uz' ? 'Sinf qo‘shish' : 'Добавить класс'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClasses.map((cls) => {
            const totalHours = cls.curriculum.reduce(
              (sum, req) => sum + (Number(req.lessonsPerWeek) || 0),
              0
            );
            const isExceeded = totalHours > totalSlotsPerWeek;
            const utilizationPercent = Math.min(
              100,
              Math.round((totalHours / (totalSlotsPerWeek || 1)) * 100)
            );
            const homeRoom = cls.homeRoomId ? roomMap.get(cls.homeRoomId) : null;

            return (
              <Card key={cls.id} hoverEffect className={`flex flex-col justify-between ${isExceeded ? 'border-rose-300 dark:border-rose-800' : ''}`}>
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs shadow-blue-500/20">
                        {cls.name}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{cls.name}</span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Grade {cls.grade}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {cls.studentCount || 8} {language === 'uz' ? 'o‘quvchi' : 'students'} • {cls.shift}-я смена
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(cls)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title={language === 'uz' ? 'Tahrirlash' : 'Редактировать учебный план'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingClassId(cls.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title={language === 'uz' ? 'O‘chirish' : 'Удалить класс'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    {/* Homeroom info */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5" /> {language === 'uz' ? 'Biriktirilgan xona:' : 'Кабинет:'}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {homeRoom ? `${homeRoom.name} (${homeRoom.capacity}м)` : (language === 'uz' ? 'Biriktirilmagan' : 'Не закреплен')}
                      </span>
                    </div>

                    {/* Lessons / week & Curriculum Status */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {totalHours} lessons/week
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          Curriculum {utilizationPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isExceeded
                              ? 'bg-rose-500'
                              : utilizationPercent > 80
                              ? 'bg-blue-600'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${utilizationPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Exceeded Warning */}
                    {isExceeded && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>❌ Curriculum exceeds available weekly slots ({totalHours} &gt; {totalSlotsPerWeek}).</span>
                      </div>
                    )}

                    {/* Subjects mini badges */}
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        {language === 'uz' ? 'Rejadagi fanlar' : 'Предметы в плане'} ({cls.curriculum.length}):
                      </p>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {cls.curriculum.map((req) => {
                          const sub = subjectMap.get(req.subjectId);
                          return (
                            <span
                              key={req.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {sub?.shortName || sub?.name || 'Fan'}: {req.lessonsPerWeek}ч
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer button */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 rounded-b-2xl">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(cls)}
                    className="w-full text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    {language === 'uz' ? 'O‘quv rejasini sozlash →' : 'Настроить учебный план →'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Class Modal */}
      <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        classToEdit={editingClass}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingClassId}
        onClose={() => setDeletingClassId(null)}
        onConfirm={confirmDelete}
        title={language === 'uz' ? 'Sinfni o‘chirish?' : 'Удалить класс?'}
        message={
          language === 'uz'
            ? 'Sinf va uning barcha o‘quv rejasi tizimdan o‘chiriladi.'
            : 'Класс и весь его учебный план будут удалены из системы.'
        }
        confirmText={language === 'uz' ? 'O‘chirish' : 'Удалить'}
      />
    </div>
  );
};
