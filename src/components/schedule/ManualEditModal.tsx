import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { DAY_NAMES, DAY_SHORT_NAMES } from '../../types';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { isSlotValid } from '../../scheduler/constraints';

export const ManualEditModal: React.FC = () => {
  const { editModalOpen, setEditModalOpen, editingEntry, newEntrySlot, addOrUpdateEntry, schedule } =
    useScheduleStore();
  const { classes, subjects, teachers, rooms, settings } = useSchoolStore();

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [day, setDay] = useState<number>(1);
  const [period, setPeriod] = useState<number>(1);

  useEffect(() => {
    if (editingEntry) {
      setClassId(editingEntry.classId);
      setSubjectId(editingEntry.subjectId);
      setTeacherId(editingEntry.teacherId);
      setClassroomId(editingEntry.classroomId);
      setDay(editingEntry.day);
      setPeriod(editingEntry.period);
    } else if (newEntrySlot) {
      setClassId(newEntrySlot.classId || (classes[0]?.id ?? ''));
      setDay(newEntrySlot.day || 1);
      setPeriod(newEntrySlot.period || 1);
      if (subjects.length > 0) setSubjectId(subjects[0].id);
      if (teachers.length > 0) setTeacherId(teachers[0].id);
      if (rooms.length > 0) setClassroomId(rooms[0].id);
    } else {
      if (classes.length > 0) setClassId(classes[0].id);
      if (subjects.length > 0) setSubjectId(subjects[0].id);
      if (teachers.length > 0) setTeacherId(teachers[0].id);
      if (rooms.length > 0) setClassroomId(rooms[0].id);
      setDay(1);
      setPeriod(1);
    }
  }, [editingEntry, newEntrySlot, editModalOpen, classes, subjects, teachers, rooms]);

  if (!editModalOpen) return null;

  // When subject changes, pick first eligible teacher & suitable room
  const handleSubjectChange = (newSubId: string) => {
    setSubjectId(newSubId);
    const sub = subjects.find((s) => s.id === newSubId);
    const eligible = teachers.filter((t) => t.subjectIds.includes(newSubId));
    if (eligible.length > 0) {
      setTeacherId(eligible[0].id);
    }
    if (sub?.requiredRoomType) {
      const matchingRoom = rooms.find((r) => r.type === sub.requiredRoomType);
      if (matchingRoom) setClassroomId(matchingRoom.id);
    }
  };

  // Live Collision Check
  const otherEntries = (schedule?.entries || []).filter((e) => !editingEntry || e.id !== editingEntry.id);
  const selectedTeacher = teachers.find((t) => t.id === teacherId);
  const isCandidateValid = isSlotValid(
    classId,
    teacherId,
    classroomId,
    day,
    period,
    otherEntries,
    selectedTeacher,
    selectedTeacher?.maxLessonsPerDay || 6
  );

  const eligibleTeachers = teachers.filter((t) => t.subjectIds.includes(subjectId));

  const handleSave = () => {
    if (!classId || !subjectId || !teacherId) return;

    addOrUpdateEntry({
      id: editingEntry ? editingEntry.id : undefined,
      classId,
      subjectId,
      teacherId,
      classroomId: classroomId || rooms[0]?.id || '',
      day,
      period,
    });
  };

  const maxPeriod = settings.periodsPerDay[day] || 7;

  return (
    <Modal
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      maxWidth="md"
      title={editingEntry ? 'Редактировать урок' : 'Добавить урок в расписание'}
      description="Укажите класс, предмет, преподавателя, кабинет и временной слот."
    >
      <div className="space-y-4">
        {/* Day & Period */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              День недели
            </label>
            <select
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            >
              {settings.workingDays.map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Номер урока
            </label>
            <select
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  {p} урок
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Class */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Класс
          </label>
          <select
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Класс {c.name} ({c.studentCount} уч.)
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Предмет
          </label>
          <select
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
            value={subjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.shortName})
              </option>
            ))}
          </select>
        </div>

        {/* Teacher */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Преподаватель
          </label>
          <select
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            {eligibleTeachers.length > 0 ? (
              eligibleTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.weeklyLoad}ч/нед)
                </option>
              ))
            ) : (
              teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Classroom */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Кабинет
          </label>
          <select
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (каб. {r.roomNumber}, {r.capacity} мест)
              </option>
            ))}
          </select>
        </div>

        {/* Live Validation Alert */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
            isCandidateValid
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          {isCandidateValid ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Слот свободен. Накладок и конфликтов нет.</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Внимание: преподаватель, класс или кабинет уже заняты в этот слот!</span>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
            Отмена
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            {editingEntry ? 'Сохранить изменения' : 'Добавить в расписание'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
