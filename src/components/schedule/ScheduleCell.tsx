import React from 'react';
import { AlertCircle, Lock, Unlock, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Classroom, SchoolClass, Subject, Teacher } from '../../types';
import { ScheduleEntry } from '../../types/schedule';
import { getContrastTextColor } from '../../utils/colorUtils';

export interface ScheduleCellProps {
  entry?: ScheduleEntry | null;
  subject?: Subject | null;
  teacher?: Teacher | null;
  room?: Classroom | null;
  cls?: SchoolClass | null;
  day: number;
  period: number;
  hasConflict?: boolean;
  conflictMessage?: string;
  isDragging?: boolean;
  showClassName?: boolean;
  onEdit?: (entry: ScheduleEntry) => void;
  onDelete?: (entryId: string) => void;
  onToggleLock?: (entryId: string) => void;
  onAddAtSlot?: (day: number, period: number) => void;
  onDragStart?: (e: React.DragEvent, entry: ScheduleEntry) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, day: number, period: number) => void;
}

export const ScheduleCell: React.FC<ScheduleCellProps> = ({
  entry,
  subject,
  teacher,
  room,
  cls,
  day,
  period,
  hasConflict = false,
  conflictMessage,
  isDragging = false,
  showClassName = false,
  onEdit,
  onDelete,
  onToggleLock,
  onAddAtSlot,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [dragOverActive, setDragOverActive] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverActive(true);
    if (onDragOver) onDragOver(e);
  };

  const handleDragLeave = () => {
    setDragOverActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverActive(false);
    if (onDrop) onDrop(e, day, period);
  };

  if (!entry) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onAddAtSlot && onAddAtSlot(day, period)}
        className={`min-h-[76px] h-full p-2 rounded-xl border border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group select-none ${
          dragOverActive
            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/50'
            : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/30'
        }`}
      >
        <span className="text-[10px] text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 font-medium transition-colors">
          + Урок
        </span>
      </div>
    );
  }

  const isKelajak =
    entry.subjectId === 'kelajak-darsi' ||
    entry.subjectId.toLowerCase().includes('kelajak') ||
    subject?.id === 'kelajak-darsi' ||
    subject?.name.toLowerCase().includes('kelajak');

  const bgColor = subject?.color || '#3b82f6';
  const textColor = getContrastTextColor(bgColor);

  return (
    <div
      draggable={!isKelajak}
      onDragStart={(e) => !isKelajak && onDragStart && onDragStart(e, entry)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-[76px] h-full p-2.5 rounded-xl transition-all relative flex flex-col justify-between select-none group shadow-xs ${
        isKelajak ? 'cursor-default ring-1 ring-white/20' : 'cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.01]'
      } ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${
        hasConflict
          ? 'ring-2 ring-rose-500 ring-offset-1 bg-rose-500 text-white'
          : dragOverActive
          ? 'ring-2 ring-blue-500'
          : ''
      }`}
      style={!hasConflict ? { backgroundColor: bgColor, color: textColor } : undefined}
      title={
        hasConflict
          ? `КОНФЛИКТ: ${conflictMessage}`
          : isKelajak
          ? `🔒 Kelajak darsi: зафиксирован каждый понедельник на 1-м уроке • ${teacher?.fullName || 'Учитель'}`
          : `${subject?.name || 'Предмет'} • ${teacher?.fullName || 'Учитель'} • ${room?.name || 'Кабинет'}`
      }
    >
      {/* Top row: Subject & Lock indicator */}
      <div className="flex items-start justify-between gap-1">
        <div className="overflow-hidden">
          {showClassName && cls && (
            <span className="inline-block font-black text-[10px] uppercase tracking-wider opacity-90 leading-tight">
              {cls.name}
            </span>
          )}
          <h4 className="font-bold text-xs leading-tight truncate flex items-center gap-1">
            {isKelajak && <span>🔒</span>}
            <span>{subject?.name || 'Урок'}</span>
          </h4>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasConflict && (
            <span className="p-0.5 rounded bg-rose-700 text-white animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          )}
          {isKelajak ? (
            <span className="p-0.5 rounded bg-black/20 text-white" title="Зафиксирован: ПН 1-й урок">
              <Lock className="w-3 h-3 text-amber-300" />
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock && onToggleLock(entry.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/20 cursor-pointer"
                title={entry.isLocked ? 'Разблокировать урок' : 'Зафиксировать урок (запретить авто-перенос)'}
              >
                {entry.isLocked ? (
                  <Lock className="w-3 h-3 text-amber-300 opacity-100" />
                ) : (
                  <Unlock className="w-3 h-3 opacity-70" />
                )}
              </button>
              {entry.isLocked && (
                <Lock className="w-3 h-3 text-amber-300 group-hover:hidden" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom row: Teacher & Room */}
      <div className="pt-1 flex items-end justify-between text-[11px] opacity-90 leading-tight">
        <span className="truncate max-w-[110px]" title={teacher?.fullName}>
          {teacher?.shortName || teacher?.fullName || 'Преподаватель'}
        </span>
        <span className="font-semibold shrink-0 ml-1 text-[10px] bg-black/15 px-1.5 py-0.5 rounded">
          {room?.roomNumber ? `к. ${room.roomNumber}` : '—'}
        </span>
      </div>

      {/* Hover action menu trigger */}
      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-black/40 rounded-lg p-0.5 backdrop-blur-xs">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit && onEdit(entry);
          }}
          className="p-1 hover:bg-white/20 rounded cursor-pointer"
          title="Редактировать урок"
        >
          <Edit2 className="w-2.5 h-2.5 text-white" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete && onDelete(entry.id);
          }}
          className="p-1 hover:bg-rose-500/80 rounded cursor-pointer"
          title="Удалить урок"
        >
          <Trash2 className="w-2.5 h-2.5 text-white" />
        </button>
      </div>
    </div>
  );
};
