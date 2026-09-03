import React from 'react';
import { Classroom, SchoolClass, Subject, Teacher } from '../../types';
import { Schedule, ScheduleEntry } from '../../types/schedule';
import { ScheduleCell } from './ScheduleCell';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { getDayName, getDayShortName } from '../../utils/timeUtils';

export interface TeacherScheduleViewProps {
  schedule: Schedule;
  selectedTeacherId?: string;
  showAll?: boolean;
  filterDay?: number;
}

export const TeacherScheduleView: React.FC<TeacherScheduleViewProps> = ({
  schedule,
  selectedTeacherId,
  showAll = false,
  filterDay,
}) => {
  const { teachers, classes, subjects, rooms, settings, language, t } = useSchoolStore();
  const { setEditModalOpen, deleteEntry, toggleEntryLock } = useScheduleStore();

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const displayTeachers = showAll
    ? teachers
    : teachers.filter((t) => (selectedTeacherId ? t.id === selectedTeacherId : true));

  const displayDays = filterDay !== undefined ? [filterDay] : settings.workingDays;
  const maxPeriod = Math.max(...displayDays.map((d) => settings.periodsPerDay[d] || 7));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      {displayTeachers.map((teacher) => {
        const teacherEntries = schedule.entries.filter((e) => e.teacherId === teacher.id);

        let teacherGaps = 0;
        settings.workingDays.forEach((d) => {
          const dayEntries = teacherEntries
            .filter((e) => e.day === d)
            .sort((a, b) => a.period - b.period);
          if (dayEntries.length >= 2) {
            const span = dayEntries[dayEntries.length - 1].period - dayEntries[0].period + 1;
            teacherGaps += span - dayEntries.length;
          }
        });

        return (
          <div
            key={teacher.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs overflow-hidden print-card"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: teacher.color || '#3b82f6' }}
                >
                  {teacher.fullName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {teacher.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'uz' ? 'Haftalik yuklama' : 'Нагрузка'}: {teacherEntries.length} / {teacher.weeklyLoad} {t('hours')} •{' '}
                    {language === 'uz' ? 'Darchalar' : 'Окон'}:{' '}
                    <span className={teacherGaps === 0 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                      {teacherGaps}
                    </span>{' '}
                    • {language === 'uz' ? `Maks. ${teacher.maxLessonsPerDay} dars/kun` : `Макс. ${teacher.maxLessonsPerDay} ур./день`}
                  </p>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <th className="p-3 font-semibold text-left w-24">
                      {language === 'uz' ? 'Dars / Vaqt' : 'Урок / Время'}
                    </th>
                    {displayDays.map((day) => (
                      <th key={day} className="p-3 font-semibold text-center">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {getDayShortName(day, language)}
                        </span>
                        <span className="hidden sm:inline text-[11px] text-slate-400 ml-1">
                          ({getDayName(day, language)})
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periods.map((period) => {
                    const timeConfig = settings.periodTimes.find((pt) => pt.period === period);
                    const timeStr = timeConfig ? `${timeConfig.startTime}–${timeConfig.endTime}` : '';

                    return (
                      <tr key={period} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                        <td className="p-3 text-slate-500 dark:text-slate-400 align-middle">
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {period} {t('lesson')}
                          </div>
                          {timeStr && <div className="text-[10px] text-slate-400 font-mono">{timeStr}</div>}
                        </td>

                        {displayDays.map((day) => {
                          const maxP = settings.periodsPerDay[day] || 7;
                          if (period > maxP) {
                            return (
                              <td
                                key={day}
                                className="p-2 bg-slate-50/50 dark:bg-slate-950/20 text-center text-slate-300 dark:text-slate-700"
                              >
                                —
                              </td>
                            );
                          }

                          const entry = teacherEntries.find((e) => e.day === day && e.period === period);
                          const subject = entry ? subjectMap.get(entry.subjectId) : null;
                          const cls = entry ? classMap.get(entry.classId) : null;
                          const room = entry ? roomMap.get(entry.classroomId) : null;

                          const conflict = schedule.conflicts.find(
                            (c) =>
                              c.day === day &&
                              c.period === period &&
                              c.affectedEntityIds.teacherIds?.includes(teacher.id)
                          );

                          return (
                            <td key={day} className="p-1.5 align-top min-w-[130px] max-w-[200px]">
                              <ScheduleCell
                                entry={entry}
                                subject={subject}
                                teacher={teacher}
                                room={room}
                                cls={cls}
                                day={day}
                                period={period}
                                showClassName={true}
                                hasConflict={!!conflict}
                                conflictMessage={conflict?.message}
                                onEdit={(ent) => setEditModalOpen(true, ent)}
                                onDelete={deleteEntry}
                                onToggleLock={toggleEntryLock}
                                onAddAtSlot={(d, p) =>
                                  setEditModalOpen(true, null, { day: d, period: p })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};
