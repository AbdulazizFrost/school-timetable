import React from 'react';
import { Classroom, SchoolClass, Subject, Teacher } from '../../types';
import { Schedule, ScheduleEntry } from '../../types/schedule';
import { ScheduleCell } from './ScheduleCell';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { getDayName, getDayShortName } from '../../utils/timeUtils';

export interface RoomScheduleViewProps {
  schedule: Schedule;
  selectedRoomId?: string;
  showAll?: boolean;
  filterDay?: number;
}

export const RoomScheduleView: React.FC<RoomScheduleViewProps> = ({
  schedule,
  selectedRoomId,
  showAll = false,
  filterDay,
}) => {
  const { rooms, classes, subjects, teachers, settings, language, t } = useSchoolStore();
  const { setEditModalOpen, deleteEntry, toggleEntryLock } = useScheduleStore();

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const displayRooms = showAll
    ? rooms
    : rooms.filter((r) => (selectedRoomId ? r.id === selectedRoomId : true));

  const displayDays = filterDay !== undefined ? [filterDay] : settings.workingDays;
  const maxPeriod = Math.max(...displayDays.map((d) => settings.periodsPerDay[d] || 7));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      {displayRooms.map((room) => {
        const roomEntries = schedule.entries.filter((e) => e.classroomId === room.id);
        const homeClass = classes.find((c) => c.homeRoomId === room.id);

        return (
          <div
            key={room.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs overflow-hidden print-card"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {room.roomNumber}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {room.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('room_capacity')}: {room.capacity} {language === 'uz' ? 'oʻrin' : 'мест'} • {homeClass ? (language === 'uz' ? `Biriktirilgan sinf: ${homeClass.name}` : `Домашний класс: ${homeClass.name}`) : (language === 'uz' ? 'Umumiy xona' : 'Общий кабинет')} •{' '}
                    {language === 'uz' ? `Band: ${roomEntries.length} dars` : `Занято: ${roomEntries.length} уроков`}
                  </p>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto touch-scroll -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
              <table className={`w-full text-xs border-collapse ${displayDays.length > 1 ? 'min-w-[620px] sm:min-w-[700px]' : 'w-full'}`}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <th className="p-2.5 sm:p-3 font-semibold text-left w-20 sm:w-24 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-800 shadow-xs">
                      {language === 'uz' ? 'Dars / Vaqt' : 'Урок / Время'}
                    </th>
                    {displayDays.map((day) => (
                      <th key={day} className="p-2.5 sm:p-3 font-semibold text-center">
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
                        <td className="p-2 sm:p-3 text-slate-500 dark:text-slate-400 align-middle sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-xs">
                          <div className="font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap">
                            {period} {t('lesson')}
                          </div>
                          {timeStr && <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{timeStr}</div>}
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

                          const slotEntries = roomEntries.filter((e) => e.day === day && e.period === period);
                          const entry = slotEntries[0] || null;
                          const secondEntry = slotEntries[1] || null;

                          const subject = entry ? subjectMap.get(entry.subjectId) : null;
                          const secondSubject = secondEntry ? subjectMap.get(secondEntry.subjectId) : null;
                          const cls = entry ? classMap.get(entry.classId) : null;
                          const teacher = entry ? teacherMap.get(entry.teacherId) : null;
                          const secondTeacher = secondEntry ? teacherMap.get(secondEntry.teacherId) : null;

                          const conflict = schedule.conflicts.find(
                            (c) =>
                              c.day === day &&
                              c.period === period &&
                              c.affectedEntityIds.roomIds?.includes(room.id)
                          );

                          return (
                            <td key={day} className={`p-1 sm:p-1.5 align-top ${displayDays.length > 1 ? 'min-w-[120px] sm:min-w-[130px] max-w-[200px]' : 'w-full'}`}>
                              <ScheduleCell
                                entry={entry}
                                secondEntry={secondEntry}
                                subject={subject}
                                secondSubject={secondSubject}
                                teacher={teacher}
                                secondTeacher={secondTeacher}
                                room={room}
                                secondRoom={room}
                                cls={cls}
                                day={day}
                                period={period}
                                showClassName={true}
                                hasConflict={!!conflict}
                                conflictMessage={conflict?.message}
                                onEdit={(ent) => setEditModalOpen(true, ent)}
                                onDelete={(id) => {
                                  deleteEntry(id);
                                  if (secondEntry && entry && (id === entry.id || id === secondEntry.id)) {
                                    const other = id === entry.id ? secondEntry : entry;
                                    deleteEntry(other.id);
                                  }
                                }}
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
