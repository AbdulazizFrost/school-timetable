import React, { useState } from 'react';
import {
  BookOpen,
  Edit2,
  Plus,
  Search,
  Trash2,
  Sparkles,
  DoorOpen,
} from 'lucide-react';
import { ROOM_TYPE_LABELS, Subject } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Card, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { SubjectModal } from './SubjectModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { pluralizeRu } from '../../utils/formatters';

export const SubjectsPage: React.FC = () => {
  const { subjects, teachers, deleteSubject } = useSchoolStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  const normalizeStr = (str: string) =>
    str.toLowerCase().replace(/[‘'`ʼ’]/g, "'").trim();

  const filteredSubjects = subjects.filter((sub) => {
    const q = normalizeStr(searchQuery);
    const matchesSearch =
      !q ||
      normalizeStr(sub.name).includes(q) ||
      normalizeStr(sub.shortName).includes(q) ||
      normalizeStr(sub.id).includes(q);
    const matchesDiff =
      selectedDifficultyFilter === 'all' || sub.difficulty === selectedDifficultyFilter;
    return matchesSearch && matchesDiff;
  });

  const handleEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingSubjectId) {
      deleteSubject(deletingSubjectId);
      setDeletingSubjectId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Учебные предметы
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Всего: {pluralizeRu(subjects.length, 'предмет', 'предмета', 'предметов')} • Настройка
            сложности и требований к кабинетам
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Добавить предмет
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Поиск по названию или краткому коду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDifficultyFilter}
                onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
              >
                <option value="all">Любая сложность</option>
                <option value="high">Высокая (Матем/Физ)</option>
                <option value="medium">Средняя (Гуманитарные)</option>
                <option value="low">Низкая (Физ-ра/ИЗО)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery || selectedDifficultyFilter !== 'all' ? 'Предметы не найдены' : 'Предметы еще не добавлены'}
          </h3>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              Добавить предмет
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => {
            const assignedTeachers = teachers.filter((t) => t.subjectIds.includes(sub.id));

            return (
              <Card key={sub.id} hoverEffect className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: sub.color || '#3b82f6' }}
                      >
                        {sub.shortName}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {sub.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Код: {sub.shortName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(sub)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingSubjectId(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Сложность:</span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium text-[10px] ${
                          sub.difficulty === 'high'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : sub.difficulty === 'medium'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {sub.difficulty === 'high' ? 'Высокая (2-4 ур)' : sub.difficulty === 'medium' ? 'Средняя' : 'Низкая'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Кабинет:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {sub.requiredRoomType
                          ? ROOM_TYPE_LABELS[sub.requiredRoomType] || sub.requiredRoomType
                          : 'Любой общий'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Сдвоенные уроки:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {sub.allowDoubleLesson ? 'Разрешены' : 'Запрещены'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Teachers count footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Преподаватели:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {assignedTeachers.length > 0
                      ? `${assignedTeachers.length} чел.`
                      : 'Нет преподавателей!'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subjectToEdit={editingSubject}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingSubjectId}
        onClose={() => setDeletingSubjectId(null)}
        onConfirm={confirmDelete}
        title="Удалить предмет?"
        message="Предмет будет удален из базы. Убедитесь, что он не используется в активных учебных планах классов."
        confirmText="Удалить"
      />
    </div>
  );
};
