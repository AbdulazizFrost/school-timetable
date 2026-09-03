import React from 'react';
import { ArrowLeftRight, HelpCircle } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DAY_NAMES } from '../../types';

export const SwapModal: React.FC = () => {
  const { swapModalOpen, setSwapModalOpen, swapPair, swapEntries } = useScheduleStore();
  const { subjects, teachers, rooms, classes } = useSchoolStore();

  if (!swapModalOpen || !swapPair) return null;

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  const { source, target } = swapPair;
  const cls = classMap.get(source.classId);

  const sub1 = subjectMap.get(source.subjectId);
  const tch1 = teacherMap.get(source.teacherId);
  const rm1 = roomMap.get(source.classroomId);

  const sub2 = subjectMap.get(target.subjectId);
  const tch2 = teacherMap.get(target.teacherId);
  const rm2 = roomMap.get(target.classroomId);

  const handleConfirmSwap = () => {
    swapEntries(source.id, target.id);
  };

  return (
    <Modal
      isOpen={swapModalOpen}
      onClose={() => setSwapModalOpen(false)}
      maxWidth="md"
      title="Поменять уроки местами?"
      description={`В слоте (${DAY_NAMES[target.day]}, ${target.period} урок) уже назначен другой урок класса ${cls?.name}.`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
          {/* Source lesson */}
          <div className="text-center flex-1">
            <span className="text-[10px] text-slate-400 font-semibold block mb-1">
              {DAY_NAMES[source.day]}, {source.period} ур.
            </span>
            <div
              className="p-2.5 rounded-lg text-white font-bold text-xs"
              style={{ backgroundColor: sub1?.color || '#3b82f6' }}
            >
              {sub1?.name}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{tch1?.shortName}</p>
          </div>

          <div className="px-3 text-slate-400">
            <ArrowLeftRight className="w-5 h-5 text-blue-500 animate-pulse" />
          </div>

          {/* Target lesson */}
          <div className="text-center flex-1">
            <span className="text-[10px] text-slate-400 font-semibold block mb-1">
              {DAY_NAMES[target.day]}, {target.period} ур.
            </span>
            <div
              className="p-2.5 rounded-lg text-white font-bold text-xs"
              style={{ backgroundColor: sub2?.color || '#10b981' }}
            >
              {sub2?.name}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{tch2?.shortName}</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          При обмене система проверит доступность обоих преподавателей в новых временных слотах.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={() => setSwapModalOpen(false)}>
            Отмена
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirmSwap}>
            Обменять местами
          </Button>
        </div>
      </div>
    </Modal>
  );
};
