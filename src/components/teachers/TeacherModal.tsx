import React, { useEffect, useState } from 'react';
import { Subject, Teacher, TeacherClassAllocation } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { AvailabilityMatrix } from './AvailabilityMatrix';
import { SUBJECT_PRESET_COLORS } from '../../utils/colorUtils';
import { Calculator, Clock, GraduationCap, Plus, Trash2 } from 'lucide-react';

export interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherToEdit?: Teacher | null;
}

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  teacherToEdit,
}) => {
  const { subjects, classes, settings, addTeacher, updateTeacher, language, t } = useSchoolStore();

  const [fullName, setFullName] = useState('');
  const [shortName, setShortName] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectHours, setSubjectHours] = useState<Record<string, number>>({});
  const [classAllocations, setClassAllocations] = useState<TeacherClassAllocation[]>([]);
  const [weeklyLoad, setWeeklyLoad] = useState<number>(20);
  const [maxLessonsPerDay, setMaxLessonsPerDay] = useState<number>(5);
  const [color, setColor] = useState('#3b82f6');
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (teacherToEdit) {
      setFullName(teacherToEdit.fullName || '');
      setShortName(teacherToEdit.shortName || '');
      setSelectedSubjectIds(teacherToEdit.subjectIds || []);
      setSubjectHours(teacherToEdit.subjectHours || {});
      
      // Load allocations from teacher or populate from classes where this teacher is assigned
      if (teacherToEdit.classAllocations && teacherToEdit.classAllocations.length > 0) {
        setClassAllocations(teacherToEdit.classAllocations);
      } else {
        const fromClasses: TeacherClassAllocation[] = [];
        classes.forEach((cls) => {
          cls.curriculum
            .filter((req) => req.teacherId === teacherToEdit.id)
            .forEach((req) => {
              fromClasses.push({
                id: `alloc_${cls.id}_${req.subjectId}`,
                classId: cls.id,
                subjectId: req.subjectId,
                lessonsPerWeek: req.lessonsPerWeek,
              });
            });
        });
        setClassAllocations(fromClasses);
      }

      setWeeklyLoad(teacherToEdit.weeklyLoad || 20);
      setMaxLessonsPerDay(teacherToEdit.maxLessonsPerDay || 5);
      setColor(teacherToEdit.color || '#3b82f6');
      setAvailability(teacherToEdit.availability || {});
    } else {
      setFullName('');
      setShortName('');
      setSelectedSubjectIds([]);
      setSubjectHours({});
      setClassAllocations([]);
      setWeeklyLoad(20);
      setMaxLessonsPerDay(5);
      setColor(SUBJECT_PRESET_COLORS[Math.floor(Math.random() * SUBJECT_PRESET_COLORS.length)]);
      setAvailability({});
    }
    setErrors({});
  }, [teacherToEdit, isOpen, classes]);

  const handleFullNameChange = (name: string) => {
    setFullName(name);
    if (!shortName || shortName === generateShort(fullName)) {
      setShortName(generateShort(name));
    }
  };

  const generateShort = (full: string) => {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
    if (parts.length >= 3) return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
    return full;
  };

  const toggleSubject = (subId: string) => {
    if (selectedSubjectIds.includes(subId)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subId));
      const nextHours = { ...subjectHours };
      delete nextHours[subId];
      setSubjectHours(nextHours);
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subId]);
      if (!subjectHours[subId]) {
        setSubjectHours({ ...subjectHours, [subId]: 5 });
      }
    }
  };

  const handleSubjectHoursChange = (subId: string, hours: number) => {
    const safeHours = Math.max(1, Math.min(40, hours));
    const nextHours = { ...subjectHours, [subId]: safeHours };
    setSubjectHours(nextHours);
  };

  // Class allocation helpers
  const handleAddClassAllocation = () => {
    const firstClass = classes[0];
    const firstSubject = selectedSubjectIds.length > 0
      ? subjects.find((s) => s.id === selectedSubjectIds[0])
      : subjects[0];

    if (!firstClass || !firstSubject) return;

    const newAlloc: TeacherClassAllocation = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classId: firstClass.id,
      subjectId: firstSubject.id,
      lessonsPerWeek: 5,
    };

    // Ensure this subject is also in selectedSubjectIds
    if (!selectedSubjectIds.includes(firstSubject.id)) {
      setSelectedSubjectIds([...selectedSubjectIds, firstSubject.id]);
    }

    const nextAllocations = [...classAllocations, newAlloc];
    setClassAllocations(nextAllocations);

    const sum = nextAllocations.reduce((acc, a) => acc + a.lessonsPerWeek, 0);
    if (sum > weeklyLoad) {
      setWeeklyLoad(sum);
    }
  };

  const handleUpdateAllocation = (id: string, field: keyof TeacherClassAllocation, value: any) => {
    const next = classAllocations.map((a) => {
      if (a.id === id) {
        const updated = { ...a, [field]: value };
        // If subject is updated, ensure it's included in teacher's subjectIds
        if (field === 'subjectId' && !selectedSubjectIds.includes(value)) {
          setSelectedSubjectIds([...selectedSubjectIds, value]);
        }
        return updated;
      }
      return a;
    });
    setClassAllocations(next);

    const sum = next.reduce((acc, a) => acc + a.lessonsPerWeek, 0);
    if (sum > weeklyLoad) {
      setWeeklyLoad(sum);
    }
  };

  const handleDeleteAllocation = (id: string) => {
    setClassAllocations(classAllocations.filter((a) => a.id !== id));
  };

  const totalClassAllocationsSum = classAllocations.reduce((acc, a) => acc + (a.lessonsPerWeek || 0), 0);
  const totalSubjectHoursSum = Object.values(subjectHours).reduce((acc, h) => acc + h, 0);

  const syncWeeklyLoadFromAllocations = () => {
    if (totalClassAllocationsSum > 0) {
      setWeeklyLoad(totalClassAllocationsSum);
    } else if (totalSubjectHoursSum > 0) {
      setWeeklyLoad(totalSubjectHoursSum);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) {
      newErrors.fullName = language === 'uz' ? "O'qituvchi F.I.Sh.ni kiriting" : 'Введите ФИО преподавателя';
    }
    if (selectedSubjectIds.length === 0 && classAllocations.length === 0) {
      newErrors.subjects = language === 'uz' ? 'Kamida bitta fan tanlang' : 'Выберите хотя бы один предмет';
    }
    if (weeklyLoad <= 0) {
      newErrors.weeklyLoad = language === 'uz' ? 'Haftalik yuklama 0 dan katta boʻlishi kerak' : 'Нагрузка должна быть больше 0';
    }
    if (maxLessonsPerDay <= 0) {
      newErrors.maxLessonsPerDay = language === 'uz' ? 'Kunlik dars limiti 0 dan katta boʻlishi kerak' : 'Дневной лимит должен быть больше 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Merge any subjects from classAllocations into selectedSubjectIds
    const finalSubjectIds = Array.from(
      new Set([...selectedSubjectIds, ...classAllocations.map((a) => a.subjectId)])
    );

    const teacherData = {
      fullName: fullName.trim(),
      shortName: shortName.trim() || generateShort(fullName),
      subjectIds: finalSubjectIds,
      subjectHours,
      classAllocations,
      weeklyLoad: Number(weeklyLoad),
      maxLessonsPerDay: Number(maxLessonsPerDay),
      availability,
      color,
    };

    if (teacherToEdit) {
      updateTeacher(teacherToEdit.id, teacherData);
    } else {
      addTeacher(teacherData);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={teacherToEdit ? (language === 'uz' ? "O'qituvchini tahrirlash" : 'Редактировать учителя') : (language === 'uz' ? "O'qituvchi qo'shish" : 'Добавить учителя')}
      description={
        language === 'uz'
          ? "Fanlar, sinflar bo'yicha berilgan soatlar (masalan: 2-A Matematika 5 soat) va bandlik matritsasini sozlang."
          : 'Укажите предметы, нагрузку по конкретным классам (например: 2-А Математика 5 ч.) и настройте доступность.'
      }
    >
      <div className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('teacher_name') + ' *'}
            placeholder={language === 'uz' ? 'Masalan: Karimova Nargiza Anvarovna' : 'Например: Ахмедов Алишер Рустамович'}
            value={fullName}
            onChange={(e) => handleFullNameChange(e.target.value)}
            error={errors.fullName}
          />
          <Input
            label={t('teacher_short_name')}
            placeholder={language === 'uz' ? 'Masalan: Karimova N.A.' : 'Например: Ахмедов А.Р.'}
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
          />
        </div>

        {/* SECTION: Class-by-Class Subject Hours Distribution (Tarifikatsiya) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {language === 'uz' ? 'Sinflar bo‘yicha dars soatlari (Tarifikatsiya):' : 'Распределение нагрузки по классам (Тарификация):'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'uz'
                  ? "O'qituvchiga qaysi sinfga qaysi fandan necha soat berilganligini ko'rsating (Masalan: 2-A ➔ Matematika 5 soat)."
                  : 'Укажите, в каком классе какой предмет и сколько часов ведет учитель (Например: 2-А ➔ Математика 5 ч., Физика 2 ч.).'}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddClassAllocation}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-blue-600" />
              {language === 'uz' ? "Sinf qo'shish" : 'Добавить класс'}
            </Button>
          </div>

          {classAllocations.length === 0 ? (
            <div className="p-3 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-400">
              {language === 'uz'
                ? "Hali sinflar biriktirilmagan. «Sinf qo'shish» tugmasini bosing."
                : 'Нагрузка по классам еще не добавлена. Нажмите «Добавить класс» для распределения часов.'}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 px-2">
                <span className="col-span-4">{language === 'uz' ? 'Sinf' : 'Класс'}</span>
                <span className="col-span-5">{language === 'uz' ? 'Fan' : 'Предмет'}</span>
                <span className="col-span-2 text-center">{language === 'uz' ? 'Haftalik soat' : 'Часов/нед'}</span>
                <span className="col-span-1 text-right"></span>
              </div>

              {classAllocations.map((alloc, idx) => (
                <div
                  key={alloc.id || `alloc_${idx}`}
                  className="grid grid-cols-12 gap-2 items-center p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                >
                  {/* Class selector */}
                  <div className="col-span-4">
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 dark:text-slate-100"
                      value={alloc.classId}
                      onChange={(e) => handleUpdateAllocation(alloc.id || `alloc_${idx}`, 'classId', e.target.value)}
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {language === 'uz' ? 'sinfi' : 'класс'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject selector */}
                  <div className="col-span-5">
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium"
                      value={alloc.subjectId}
                      onChange={(e) => handleUpdateAllocation(alloc.id || `alloc_${idx}`, 'subjectId', e.target.value)}
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hours input */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      max={35}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center font-bold text-xs text-slate-900 dark:text-slate-100"
                      value={alloc.lessonsPerWeek}
                      onChange={(e) => handleUpdateAllocation(alloc.id || `alloc_${idx}`, 'lessonsPerWeek', Number(e.target.value))}
                    />
                  </div>

                  {/* Delete row */}
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteAllocation(alloc.id || `alloc_${idx}`)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Total Summary & Sync */}
              <div className="flex items-center justify-between pt-2 px-1 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {language === 'uz' ? 'Sinflar bo‘yicha jami yuklama:' : 'Суммарно по всем классам:'}{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-black">{totalClassAllocationsSum} {t('hours')}</span>
                </span>
                <button
                  type="button"
                  onClick={syncWeeklyLoadFromAllocations}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Calculator className="w-3 h-3" />
                  {language === 'uz' ? 'Umumiy yuklamaga o‘tkazish' : 'Перенести в недельную нагрузку'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Subjects selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('teacher_subjects')} *
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[50px]">
            {subjects.map((sub) => {
              const isSelected = selectedSubjectIds.includes(sub.id);
              return (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => toggleSubject(sub.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: sub.color || '#3b82f6' }}
                  />
                  {sub.name}
                </button>
              );
            })}
          </div>
          {errors.subjects && <p className="text-xs text-rose-500 mt-1">{errors.subjects}</p>}
        </div>

        {/* Load & Daily limit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            min={1}
            max={45}
            label={t('teacher_weekly_load') + ' *'}
            value={weeklyLoad}
            onChange={(e) => setWeeklyLoad(Number(e.target.value))}
            error={errors.weeklyLoad}
            helperText={language === 'uz' ? "O'qituvchining haftalik umumiy dars soati (stavkasi)" : 'Максимальное суммарное количество уроков у преподавателя за неделю'}
          />
          <Input
            type="number"
            min={1}
            max={8}
            label={t('teacher_daily_max') + ' *'}
            value={maxLessonsPerDay}
            onChange={(e) => setMaxLessonsPerDay(Number(e.target.value))}
            error={errors.maxLessonsPerDay}
            helperText={language === 'uz' ? "O'qituvchining bir kunda dars o'tishi mumkin bo'lgan maksimal darslari soni" : 'Защита от перегрузки преподавателя в один день'}
          />
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {language === 'uz' ? "O'qituvchi rang belgisi" : 'Цветовая метка преподавателя'}
          </label>
          <div className="flex items-center gap-2">
            {SUBJECT_PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                  color === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Availability Matrix */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <AvailabilityMatrix
            availability={availability}
            onChange={setAvailability}
            settings={settings}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="md" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} className="font-bold">
            {teacherToEdit ? t('save') : t('add_teacher')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
