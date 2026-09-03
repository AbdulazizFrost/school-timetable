import React, { useState } from 'react';
import { Classroom, SchoolClass, Subject, Teacher } from '../../types';
import { Schedule, ScheduleEntry } from '../../types/schedule';
import { ScheduleCell } from './ScheduleCell';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { getDayName, getDayShortName } from '../../utils/timeUtils';

export interface ClassScheduleViewProps {
  schedule: Schedule;
  selectedClassId?: string;
  showAll?: boolean;
  filterDay?: number;
}

export const ClassScheduleView: React.FC<ClassScheduleViewProps> = ({
  schedule,
  selectedClassId,
  showAll = false,
  filterDay,
}) => {
  const { classes, subjects, teachers, rooms, settings, language, t } = useSchoolStore();
  const { moveEntry, deleteEntry, toggleEntryLock, setEditModalOpen } = useScheduleStore();

  const [draggedEntry, setDraggedEntry] = useState<ScheduleEntry | null>(null);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const displayClasses = showAll
    ? classes
    : classes.filter((c) => (selectedClassId ? c.id === selectedClassId : true));

  const displayDays = filterDay !== undefined ? [filterDay] : settings.workingDays;
  const maxPeriod = Math.max(...displayDays.map((d) => settings.periodsPerDay[d] || 7));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const handleDragStart = (e: React.DragEvent, entry: ScheduleEntry) => {
    setDraggedEntry(entry);
    e.dataTransfer.setData('text/plain', entry.id);
  };

  const handleDrop = (e: React.DragEvent, targetClassId: string, day: number, period: number) => {
    if (!draggedEntry) return;
    if (draggedEntry.classId !== targetClassId) return;

    moveEntry(draggedEntry.id, day, period);
    setDraggedEntry(null);
  };

  return (
    <div className="space-y-8">
      {displayClasses.map((cls) => {
        const classEntries = schedule.entries.filter((e) => e.classId === cls.id);
        const homeRoom = cls.homeRoomId ? roomMap.get(cls.homeRoomId) : null;

        return (
          <div
            key={cls.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs overflow-hidden print-card"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {cls.name}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {language === 'uz' ? `${cls.name} sinfi` : `Класс ${cls.name}`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {cls.studentCount} {t('class_students').toLowerCase()} • {homeRoom ? `${t('room_name')} ${homeRoom.roomNumber}` : (language === 'uz' ? 'Biriktirilgan xonasiz' : 'Без кабинета')} •{' '}
                    {classEntries.length} {t('lessons')}
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
                        {/* Time column */}
                        <td className="p-3 text-slate-500 dark:text-slate-400 align-middle">
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {period} {t('lesson')}
                          </div>
                          {timeStr && <div className="text-[10px] text-slate-400 font-mono">{timeStr}</div>}
                        </td>

                        {/* Day Columns */}
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

                          const entry = classEntries.find((e) => e.day === day && e.period === period);
                          const subject = entry ? subjectMap.get(entry.subjectId) : null;
                          const teacher = entry ? teacherMap.get(entry.teacherId) : null;
                          const room = entry ? roomMap.get(entry.classroomId) : null;

                          const conflict = schedule.conflicts.find(
                            (c) =>
                              c.day === day &&
                              c.period === period &&
                              c.affectedEntityIds.classIds?.includes(cls.id)
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
                                hasConflict={!!conflict}
                                conflictMessage={conflict?.message}
                                isDragging={draggedEntry?.id === entry?.id}
                                onDragStart={handleDragStart}
                                onDrop={(e, d, p) => handleDrop(e, cls.id, d, p)}
                                onEdit={(ent) => setEditModalOpen(true, ent)}
                                onDelete={deleteEntry}
                                onToggleLock={toggleEntryLock}
                                onAddAtSlot={(d, p) => setEditModalOpen(true, null, { classId: cls.id, day: d, period: p })}
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
