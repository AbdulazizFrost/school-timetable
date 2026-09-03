import React, { useEffect, useState } from 'react';
import { ROOM_TYPE_LABELS, Subject } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Input';
import { Button } from '../common/Button';
import { SUBJECT_PRESET_COLORS } from '../../utils/colorUtils';
import { Clock, Sparkles } from 'lucide-react';

export interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectToEdit?: Subject | null;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  subjectToEdit,
}) => {
  const { subjects, addSubject, updateSubject, language, t } = useSchoolStore();

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [difficulty, setDifficulty] = useState<'high' | 'medium' | 'low'>('medium');
  const [difficultyScore, setDifficultyScore] = useState<number>(3);
  const [maxConsecutiveLessons, setMaxConsecutiveLessons] = useState<number>(2);
  const [allowDoubleLesson, setAllowDoubleLesson] = useState<boolean>(false);
  const [canBeFirstPeriod, setCanBeFirstPeriod] = useState<boolean>(true);
  const [preferredPeriods, setPreferredPeriods] = useState<number[]>([1, 2]);
  const [requiredRoomType, setRequiredRoomType] = useState<string>('general');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allAvailablePeriods = [1, 2, 3, 4, 5, 6, 7];

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name || '');
      setShortName(subjectToEdit.shortName || '');
      setColor(subjectToEdit.color || '#3b82f6');
      setDifficulty(subjectToEdit.difficulty || 'medium');
      setDifficultyScore(subjectToEdit.difficultyScore || 3);
      setMaxConsecutiveLessons(subjectToEdit.maxConsecutiveLessons || 2);
      setAllowDoubleLesson(subjectToEdit.allowDoubleLesson || false);
      setCanBeFirstPeriod(subjectToEdit.canBeFirstPeriod ?? true);
      setPreferredPeriods(subjectToEdit.preferredPeriods || (subjectToEdit.name.toLowerCase().includes('mat') || subjectToEdit.name.toLowerCase().includes('nutq') ? [1, 2] : [1, 2, 3, 4, 5]));
      setRequiredRoomType(subjectToEdit.requiredRoomType || 'general');
    } else {
      setName('');
      setShortName('');
      setColor(SUBJECT_PRESET_COLORS[Math.floor(Math.random() * SUBJECT_PRESET_COLORS.length)]);
      setDifficulty('medium');
      setDifficultyScore(3);
      setMaxConsecutiveLessons(2);
      setAllowDoubleLesson(false);
      setCanBeFirstPeriod(true);
      setPreferredPeriods([1, 2]);
      setRequiredRoomType('general');
    }
    setErrors({});
  }, [subjectToEdit, isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!shortName || shortName === name.slice(0, 4)) {
      setShortName(val.slice(0, 4));
    }
    // Auto-suggest periods 1-2 for math and speech development
    const lower = val.toLowerCase();
    if (lower.includes('mat') || lower.includes('nutq')) {
      setPreferredPeriods([1, 2]);
    }
  };

  const togglePeriod = (p: number) => {
    if (preferredPeriods.includes(p)) {
      if (preferredPeriods.length > 1) {
        setPreferredPeriods(preferredPeriods.filter((item) => item !== p));
      }
    } else {
      setPreferredPeriods([...preferredPeriods, p].sort());
    }
  };

  const handleDifficultyChange = (diff: 'high' | 'medium' | 'low') => {
    setDifficulty(diff);
    if (diff === 'high') {
      setDifficultyScore(5);
    } else if (diff === 'medium') {
      setDifficultyScore(3);
    } else {
      setDifficultyScore(1);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = language === 'uz' ? 'Fan nomini kiriting' : 'Введите название предмета';
    } else {
      const isDuplicate = subjects.some(
        (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase() && s.id !== subjectToEdit?.id
      );
      if (isDuplicate) {
        newErrors.name = language === 'uz' ? `«${name.trim()}» fani allaqachon mavjud.` : `Предмет ${name.trim()} уже существует.`;
      }
    }
    if (!shortName.trim()) newErrors.shortName = language === 'uz' ? 'Qisqa nomini kiriting' : 'Введите краткое название';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const subjectData = {
      name: name.trim(),
      shortName: shortName.trim(),
      color,
      difficulty,
      difficultyScore: Number(difficultyScore),
      maxConsecutiveLessons: Number(maxConsecutiveLessons),
      allowDoubleLesson,
      preferredPeriods: preferredPeriods.length > 0 ? preferredPeriods : [1, 2],
      requiredRoomType: requiredRoomType === 'general' ? undefined : requiredRoomType,
      canBeFirstPeriod: true,
    };

    if (subjectToEdit) {
      updateSubject(subjectToEdit.id, subjectData);
    } else {
      addSubject(subjectData);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={subjectToEdit ? (language === 'uz' ? 'Fanni tahrirlash' : 'Редактировать предмет') : (language === 'uz' ? "Fan qo'shish" : 'Добавить предмет')}
      description={
        language === 'uz'
          ? "Fan murakkabligi va dars qaysi soatlarga qo'yilishi kerakligini sozlang (Masalan: 1-2 darslar)."
          : 'Настройте желаемые часы для предмета (например: строго 1-й или 2-й уроки).'
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('subject_name') + ' *'}
            placeholder={language === 'uz' ? 'Masalan: Matematika' : 'Например: Математика'}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            error={errors.name}
          />
          <Input
            label={language === 'uz' ? 'Qisqa nomi (jadval uchun) *' : 'Краткое название (в сетку) *'}
            placeholder={language === 'uz' ? 'Masalan: Mat' : 'Например: Мат'}
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            error={errors.shortName}
          />
        </div>

        {/* Preferred Periods Selector (e.g. 1st or 2nd period for Math & Nutq) */}
        <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {language === 'uz' ? "Dars qo'yiladigan afzal soatlar:" : 'Желаемые уроки в расписании:'}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreferredPeriods([1, 2])}
                className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-semibold hover:bg-blue-700 cursor-pointer"
              >
                {language === 'uz' ? '1–2 darslar (Matem / Nutq)' : '1–2 уроки (Мат / Nutq)'}
              </button>
              <button
                type="button"
                onClick={() => setPreferredPeriods([1, 2, 3, 4, 5, 6, 7])}
                className="text-[10px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-medium hover:bg-slate-100 cursor-pointer"
              >
                {language === 'uz' ? 'Barcha soatlar (1–7)' : 'Любые (1–7)'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {allAvailablePeriods.map((p) => {
              const isSelected = preferredPeriods.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {p} {language === 'uz' ? 'soat' : 'ур.'}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
            {language === 'uz'
              ? 'Matematika va Nutq o‘stirish uchun 1 va 2-darslarni tanlash tavsiya etiladi.'
              : 'Для Математики и Nutq o‘stirish рекомендуется выбрать 1 и 2 уроки.'}
          </p>
        </div>

        {/* Difficulty level */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('subject_difficulty')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'high', label: language === 'uz' ? 'Yuqori (Asosiy)' : 'Высокая', desc: language === 'uz' ? 'Matematika, Nutq' : 'Мат, Физика' },
              { id: 'medium', label: language === 'uz' ? "O'rta" : 'Средняя', desc: language === 'uz' ? 'Ona tili, Tarix' : 'Языки, Био' },
              { id: 'low', label: language === 'uz' ? 'Yengil' : 'Легкая', desc: language === 'uz' ? 'Jismoniy, Rasm' : 'Физ-ра, Музыка' },
            ].map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => handleDifficultyChange(d.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  difficulty === d.id
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <p className="font-semibold text-xs">{d.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {language === 'uz' ? 'Rang belgisi' : 'Цветовая метка'}
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            {subjectToEdit ? t('save') : t('add_subject')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
