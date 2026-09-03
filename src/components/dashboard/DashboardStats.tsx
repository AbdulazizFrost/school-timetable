import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  DoorOpen,
  GraduationCap,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Card, CardContent } from '../common/Card';
import { getScoreRatingText, pluralizeRu } from '../../utils/formatters';

export const DashboardStats: React.FC = () => {
  const { teachers, classes, subjects, rooms, language, t } = useSchoolStore();
  const { schedule } = useScheduleStore();

  const totalStudents = classes.reduce((sum, cls) => sum + (Number(cls.studentCount) || 8), 0);

  const totalCurriculumLessons = classes.reduce((sum, cls) => {
    return sum + (cls.curriculum?.reduce((cSum, req) => cSum + (Number(req.lessonsPerWeek) || 0), 0) || 0);
  }, 0);

  const totalAssignedLessons = schedule ? schedule.entries.length : 0;
  const conflictsCount = schedule ? schedule.conflicts.length : 0;
  const score = schedule?.score?.totalScore;

  const scoreMeta = score !== undefined ? getScoreRatingText(score) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
      {/* 1. Classes */}
      <Card hoverEffect className="relative overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'uz' ? 'Sinflar' : 'Классы'}
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {classes.length}
            </h3>
            <p className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {language === 'uz' ? `${classes.length} ta sinf` : pluralizeRu(classes.length, 'класс', 'класса', 'классов')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Students */}
      <Card hoverEffect className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'uz' ? "O'quvchilar" : 'Ученики'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalStudents}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'uz' ? `${totalStudents} nafar o'quvchi` : pluralizeRu(totalStudents, 'ученик', 'ученика', 'учеников')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Teachers */}
      <Card hoverEffect className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'uz' ? "O'qituvchilar" : 'Учителя'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {teachers.length}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'uz' ? `${teachers.length} ta ustoz` : pluralizeRu(teachers.length, 'учитель', 'учителя', 'учителей')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Subjects */}
      <Card hoverEffect className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'uz' ? 'Fanlar' : 'Предметы'}
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {subjects.length}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'uz' ? `${subjects.length} ta fan` : pluralizeRu(subjects.length, 'предмет', 'предмета', 'предметов')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Rooms */}
      <Card hoverEffect className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'uz' ? 'Xonalar' : 'Кабинеты'}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {rooms.length}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'uz' ? `${rooms.length} ta xona` : pluralizeRu(rooms.length, 'кабинет', 'кабинета', 'кабинетов')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. Score & Conflicts */}
      <Card
        hoverEffect
        className={`relative overflow-hidden ${
          conflictsCount > 0
            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20'
            : score !== undefined
            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20'
            : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {conflictsCount > 0 ? (language === 'uz' ? 'Ziddiyatlar' : 'Конфликты') : (language === 'uz' ? 'Sifat bahosi' : 'Оценка')}
            </span>
            <div
              className={`p-2 rounded-xl ${
                conflictsCount > 0
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {conflictsCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-2">
            {conflictsCount > 0 ? (
              <>
                <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {conflictsCount}
                </h3>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                  {language === 'uz' ? 'eʼtibor talab' : 'требуют внимания'}
                </p>
              </>
            ) : score !== undefined ? (
              <>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {score}<span className="text-xs text-slate-400 font-normal">/100</span>
                </h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  {scoreMeta?.label.split(' ')[0]}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-400">—</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{language === 'uz' ? 'Tuzilmagan' : 'Не составлено'}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
