import React, { useEffect, useState } from 'react';
import { CurriculumRequirement, SchoolClass } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Input';
import { Button } from '../common/Button';
import { CurriculumEditor } from './CurriculumEditor';

export interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classToEdit?: SchoolClass | null;
}

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  classToEdit,
}) => {
  const { classes, rooms, subjects, teachers, settings, addClass, updateClass, language, t } = useSchoolStore();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(1);
  const [letter, setLetter] = useState('A');
  const [studentCount, setStudentCount] = useState<number>(8);
  const [homeRoomId, setHomeRoomId] = useState<string>('');
  const [shift, setShift] = useState<number>(1);
  const [curriculum, setCurriculum] = useState<CurriculumRequirement[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSlotsPerWeek = settings.workingDays.reduce(
    (sum, d) => sum + (settings.periodsPerDay[d] || 7),
    0
  );

  useEffect(() => {
    if (classToEdit) {
      setName(classToEdit.name || '');
      setGrade(classToEdit.grade || 1);
      setLetter(classToEdit.letter || 'A');
      setStudentCount(classToEdit.studentCount || 8);
      setHomeRoomId(classToEdit.homeRoomId || '');
      setShift(classToEdit.shift || 1);
      setCurriculum(classToEdit.curriculum || []);
    } else {
      setName('1-A');
      setGrade(1);
      setLetter('A');
      setStudentCount(8);
      setHomeRoomId(rooms.length > 0 ? rooms[0].id : '');
      setShift(1);
      setCurriculum([]);
    }
    setErrors({});
  }, [classToEdit, isOpen]);

  const handleGradeOrLetterChange = (g: number, l: string) => {
    setGrade(g);
    setLetter(l);
    setName(`${g}-${l}`);
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = language === 'uz' ? 'Sinf nomini kiriting' : 'Введите название класса';
    } else {
      // Duplicate protection
      const isDuplicate = classes.some(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== classToEdit?.id
      );
      if (isDuplicate) {
        newErrors.name = language === 'uz' ? `«${name.trim()}» sinfi allaqachon mavjud.` : `Класс ${name.trim()} уже существует.`;
      }
    }

    if (studentCount <= 0) {
      newErrors.studentCount = language === 'uz' ? "O'quvchilar soni kamida 1 bo'lishi kerak" : 'Количество учеников должно быть больше 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const classData = {
      name: name.trim(),
      grade: Number(grade),
      letter: letter.trim(),
      studentCount: Number(studentCount) || 8,
      homeRoomId: homeRoomId || undefined,
      shift: Number(shift),
      curriculum,
    };

    if (classToEdit) {
      updateClass(classToEdit.id, classData);
    } else {
      addClass(classData);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={classToEdit ? (language === 'uz' ? 'Sinfni tahrirlash' : 'Редактировать класс') : (language === 'uz' ? "Sinf qo'shish" : 'Добавить класс')}
      description={
        language === 'uz'
          ? "Parallelni tanlang, o'quvchilar sonini (8 nafar), biriktirilgan xonani va o'quv rejasini sozlang."
          : 'Укажите параллель (1-4), количество учеников (8), домашний кабинет и сформируйте учебный план.'
      }
    >
      <div className="space-y-5">
        {/* Class details */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Input
              label={language === 'uz' ? 'Parallel (1-11)' : 'Параллель (1-11)'}
              type="number"
              min={1}
              max={11}
              value={grade}
              onChange={(e) => handleGradeOrLetterChange(Number(e.target.value), letter)}
            />
          </div>
          <div>
            <Input
              label={language === 'uz' ? 'Harf (A, B, D...)' : 'Литера (A, B, D...)'}
              value={letter}
              onChange={(e) => handleGradeOrLetterChange(grade, e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <Input
              label={language === 'uz' ? 'Sinf nomi *' : 'Имя класса *'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
          </div>
          <div>
            <Input
              label={language === 'uz' ? "O'quvchilar soni *" : 'Количество учеников *'}
              type="number"
              min={1}
              max={100}
              value={studentCount}
              onChange={(e) => setStudentCount(Number(e.target.value))}
              error={errors.studentCount}
            />
          </div>
        </div>

        {/* Room & Shift */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label={language === 'uz' ? 'Biriktirilgan xona' : 'Закрепленный кабинет (Homeroom)'}
            value={homeRoomId}
            onChange={(e) => setHomeRoomId(e.target.value)}
          >
            <option value="">{language === 'uz' ? '(Biriktirilmagan)' : '(Не закреплять)'}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.capacity} o‘rin, {r.floor}-qavat)
              </option>
            ))}
          </Select>
          <Select
            label={language === 'uz' ? 'Smena' : 'Смена обучения'}
            value={String(shift)}
            onChange={(e) => setShift(Number(e.target.value))}
          >
            <option value="1">{language === 'uz' ? '1-smena (Ertalabki)' : '1-я смена (Утренняя)'}</option>
            <option value="2">{language === 'uz' ? '2-smena (Tushdan keyin)' : '2-я смена (Дневная)'}</option>
          </Select>
        </div>

        {/* Curriculum Editor */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <CurriculumEditor
            curriculum={curriculum}
            onChange={setCurriculum}
            subjects={subjects}
            teachers={teachers}
            maxSlotsPerWeek={totalSlotsPerWeek}
          />
          {errors.curriculum && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.curriculum}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="md" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} className="font-bold">
            {classToEdit ? t('save') : (language === 'uz' ? 'Sinfni yaratish' : 'Создать класс')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
