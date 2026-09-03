import React, { useState, useMemo, useEffect } from 'react';
import {
  Monitor,
  Smartphone,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Undo2,
  Copy,
  ExternalLink,
  X,
  Split,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ScheduleEntry } from '../../types/schedule';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { auditService } from '../../services/auditService';
import { realtimeSyncService } from '../../services/realtimeSyncService';
import { Button, cn } from '../common/Button';
import { getDayName, getDayShortName } from '../../utils/timeUtils';

export const ScreenMirrorView: React.FC = () => {
  const { schedule, pushHistory } = useScheduleStore();
  const { classes, subjects, teachers, rooms, settings, language } = useSchoolStore();

  const isUz = language === 'uz';

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [viewMode, setViewMode] = useState<'current' | 'diff' | 'initial'>('diff');
  const [inspectedEntry, setInspectedEntry] = useState<ScheduleEntry | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [remoteEntries, setRemoteEntries] = useState<ScheduleEntry[] | null>(null);

  // Subscribe to live broadcast from remote editor
  useEffect(() => {
    const unsub = realtimeSyncService.subscribe((_peers, latestSchedule) => {
      if (latestSchedule && latestSchedule.length > 0) {
        setRemoteEntries(latestSchedule);
      }
    });
    return () => unsub();
  }, []);

  // Maps for quick lookup
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Initial snapshot before editor changes
  const initialEntries = useMemo(() => auditService.getInitialSnapshot(), [schedule]);
  const currentEntries = useMemo(() => remoteEntries || schedule?.entries || [], [remoteEntries, schedule]);

  // Modified entry IDs
  const modifiedEntryIds = useMemo(
    () => auditService.getModifiedEntryIds(currentEntries),
    [currentEntries]
  );

  // Active entries to display based on viewMode
  const activeEntries = useMemo(() => {
    if (viewMode === 'initial' && initialEntries && initialEntries.length > 0) {
      return initialEntries;
    }
    return currentEntries;
  }, [viewMode, initialEntries, currentEntries]);

  // Days and periods
  const days = settings.workingDays;
  const maxPeriod = Math.max(...days.map((d) => settings.periodsPerDay[d] || 7));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  // Filter entries for selected class
  const classEntries = useMemo(
    () => activeEntries.filter((e) => e.classId === selectedClassId),
    [activeEntries, selectedClassId]
  );

  // Count modifications for each class to show dots on selector pills
  const classModCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentEntries.forEach((e) => {
      if (modifiedEntryIds.has(e.id)) {
        counts[e.classId] = (counts[e.classId] || 0) + 1;
      }
    });
    return counts;
  }, [currentEntries, modifiedEntryIds]);

  // Revert a single inspected entry to its initial slot
  const handleRevertSingleEntry = (entry: ScheduleEntry) => {
    if (!initialEntries || !schedule) return;
    const initialMatch = initialEntries.find((e) => e.id === entry.id);

    let updatedEntries: ScheduleEntry[];
    if (initialMatch) {
      // Restore initial slot
      updatedEntries = schedule.entries.map((e) => (e.id === entry.id ? initialMatch : e));
    } else {
      // Was added manually by editor: remove it
      updatedEntries = schedule.entries.filter((e) => e.id !== entry.id);
    }

    pushHistory(updatedEntries);
    auditService.logAction({
      actionType: 'schedule_move',
      title: 'Директор вернул урок на место',
      description: `Урок возвращён в исходный слот директором из пульта аудита`,
    });
    setInspectedEntry(null);
  };

  // Copy phone link
  const secretPhoneUrl = `${window.location.origin}${window.location.pathname}?audit=true`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(secretPhoneUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isUz ? "TUZUVCHI EKRANI KO'ZGUSI (LIVE)" : "ЖИВОЕ ЗЕРКАЛО ЭКРАНА СОСТАВИТЕЛЯ"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isUz
                ? "Tuzuvchi o'z kompyuterida dars jadvalini qanday ko'rayotganini real vaqtda kuzating"
                : "Вы видите расписание в точности так, как сейчас видит составитель на своём мониторе"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('diff')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1',
                viewMode === 'diff'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUz ? "O'zgarishlarni belgilash" : "Подсветить правки"}</span>
              {modifiedEntryIds.size > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40 font-extrabold">
                  {modifiedEntryIds.size}
                </span>
              )}
            </button>

            <button
              onClick={() => setViewMode('current')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1',
                viewMode === 'current'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isUz ? "Hozirgi holat" : "Как сейчас"}</span>
            </button>

            {initialEntries && (
              <button
                onClick={() => setViewMode('initial')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1',
                  viewMode === 'initial'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isUz ? "Dastlabki holat" : "Как было до правок"}</span>
              </button>
            )}
          </div>

          {/* Watch on phone button */}
          <button
            onClick={() => setShowPhoneModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>{isUz ? "Telefonda kuzatish" : "Смотреть с телефона"}</span>
          </button>
        </div>
      </div>

      {/* Class Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll">
        {classes.map((cls) => {
          const modCount = classModCounts[cls.id] || 0;
          const isSelected = cls.id === selectedClassId;

          return (
            <button
              key={cls.id}
              onClick={() => {
                setSelectedClassId(cls.id);
                setInspectedEntry(null);
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <span>{cls.name}</span>
              {modCount > 0 && (
                <span
                  title={isUz ? `${modCount} ta o'zgarish kiritilgan` : `Внесено ${modCount} правок`}
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isSelected ? 'bg-amber-300 animate-pulse' : 'bg-amber-500'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Mode Notice */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            {isUz ? "Ko'rsatilmoqda: " : "Класс: "}
            <strong className="text-slate-900 dark:text-white font-extrabold">
              {selectedClass?.name}
            </strong>
          </span>
          {viewMode === 'diff' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
              ⚡ Золотистая рамка — уроки, которые переместил или изменил составитель
            </span>
          )}
          {viewMode === 'initial' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900">
              ⏪ Отображается исходное состояние ДО правок составителя
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {isUz ? "Batafsil tekshirish uchun istalgan dars ustiga bosing" : "Нажмите на любой урок для подробной проверки"}
        </span>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-16 text-center">№</th>
              {days.map((day) => (
                <th key={day} className="py-2.5 px-3 font-extrabold">
                  {getDayShortName(day, language)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {periods.map((period) => {
              const timeSlot = settings.periodTimes?.[period - 1];
              const timeLabel = timeSlot ? `${timeSlot.startTime} - ${timeSlot.endTime}` : '';

              return (
                <tr key={period} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {/* Period number & bell time */}
                  <td className="py-3 px-2 text-center align-top bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800/60 font-mono">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {period}
                    </span>
                    {timeLabel && (
                      <span className="block text-[9.5px] text-slate-400 leading-tight mt-0.5 whitespace-nowrap">
                        {timeSlot.startTime}
                      </span>
                    )}
                  </td>

                  {/* Days */}
                  {days.map((day) => {
                    const slotEntries = classEntries.filter(
                      (e) => e.day === day && e.period === period
                    );

                    if (slotEntries.length === 0) {
                      return (
                        <td
                          key={day}
                          className="py-2 px-2 align-top text-slate-300 dark:text-slate-700 text-center font-mono text-[11px]"
                        >
                          —
                        </td>
                      );
                    }

                    return (
                      <td key={day} className="py-1.5 px-2 align-top min-w-[120px] max-w-[160px]">
                        <div className="space-y-1">
                          {slotEntries.map((entry) => {
                            const subject = subjectMap.get(entry.subjectId);
                            const teacher = teacherMap.get(entry.teacherId);
                            const room = roomMap.get(entry.classroomId);

                            const isModified = modifiedEntryIds.has(entry.id);
                            const hasConflict = schedule?.conflicts.some((c) =>
                              c.affectedEntries.includes(entry.id)
                            );
                            const isInspected = inspectedEntry?.id === entry.id;

                            return (
                              <div
                                key={entry.id}
                                onClick={() => setInspectedEntry(entry)}
                                className={cn(
                                  'p-2 rounded-xl text-left transition-all cursor-pointer relative overflow-hidden',
                                  hasConflict
                                    ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 shadow-sm shadow-rose-500/10'
                                    : isModified && viewMode === 'diff'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 shadow-md shadow-amber-500/15'
                                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400',
                                  isInspected && 'ring-2 ring-blue-500'
                                )}
                              >
                                {/* Editor Modification Indicator Pill */}
                                {isModified && viewMode === 'diff' && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-black bg-amber-500 text-white">
                                      ⚡ {isUz ? "TUZUVCHI O'ZGARTIRGAN" : "ПРАВКА"}
                                    </span>
                                  </div>
                                )}

                                {/* Conflict Indicator */}
                                {hasConflict && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-black bg-rose-600 text-white">
                                      ⚠ {isUz ? "TO'QNASHUV" : "ОШИБКА"}
                                    </span>
                                  </div>
                                )}

                                {/* Subject Name */}
                                <p className="font-extrabold text-[11.5px] text-slate-900 dark:text-white leading-tight truncate">
                                  {subject?.name || entry.subjectId}
                                </p>

                                {/* Teacher & Room */}
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {teacher ? teacher.fullName.split(' ')[0] : '—'}
                                  {room ? ` • x.${room.roomNumber || room.name}` : ''}
                                </p>

                                {/* Subgroup badge if split */}
                                {entry.subgroup && entry.subgroup !== 'all' && (
                                  <div className="mt-1">
                                    <span
                                      className={cn(
                                        'px-1.5 py-0.2 rounded text-[8.5px] font-extrabold',
                                        entry.subgroup === 'boys' || entry.subgroup === 'group1'
                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                          : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                                      )}
                                    >
                                      {entry.subgroup === 'boys'
                                        ? isUz ? "O'g'il bolalar" : "Мальчики"
                                        : entry.subgroup === 'girls'
                                        ? isUz ? "Qiz bolalar" : "Девочки"
                                        : entry.subgroup === 'group1'
                                        ? isUz ? "1-guruh" : "1 гр."
                                        : isUz ? "2-guruh" : "2 гр."}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inspected Entry Detail Drawer */}
      {inspectedEntry && (
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/80 animate-in fade-in flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {getDayShortName(inspectedEntry.day, language)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {subjectMap.get(inspectedEntry.subjectId)?.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">
                  {inspectedEntry.period}-й урок
                </span>
                {modifiedEntryIds.has(inspectedEntry.id) ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-black">
                    ⚡ Изменено составителем
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    Без изменений
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Преподаватель: <strong>{teacherMap.get(inspectedEntry.teacherId)?.fullName}</strong> • Кабинет:{' '}
                <strong>{roomMap.get(inspectedEntry.classroomId)?.roomNumber || roomMap.get(inspectedEntry.classroomId)?.name || '—'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {modifiedEntryIds.has(inspectedEntry.id) && (
              <Button
                size="sm"
                onClick={() => handleRevertSingleEntry(inspectedEntry)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>{isUz ? "Ushbu darsni qaytarish" : "Откатить этот урок"}</span>
              </Button>
            )}
            <button
              onClick={() => setInspectedEntry(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: How to watch on phone */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto border border-blue-500/20">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isUz ? "Telefondan jonli kuzatish" : "Как смотреть с телефона онлайн"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isUz
                  ? "Siz o'z telefoningizdan dars jadvali qanday tuzilayotganini istalgan joydan tekshirishingiz mumkin."
                  : "Вы можете открыть скрытый пульт на своём телефоне и видеть экран составителя в реальном времени из кабинета или дома."}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">
                  {isUz ? "Maxfiy havola" : "Секретная ссылка для входа:"}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedLink ? (isUz ? "Nusxalandi!" : "Скопировано!") : (isUz ? "Nusxalash" : "Копировать")}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-blue-600 dark:text-blue-400 break-all select-all font-semibold">
                {secretPhoneUrl}
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                <span className="text-slate-500">{isUz ? "PIN-kod:" : "PIN-код доступа:"}</span>
                <span className="font-mono font-black text-amber-500 text-sm">
                  {auditService.getPin()}
                </span>
              </div>
            </div>

            <div className="text-left text-xs text-slate-500 space-y-1.5 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60">
              <p className="font-bold text-amber-800 dark:text-amber-300">
                💡 {isUz ? "Qanday ochiladi:" : "Инструкция:"}
              </p>
              <p>1. Откройте эту ссылку в браузере своего телефона.</p>
              <p>2. Введите PIN-код <strong>{auditService.getPin()}</strong>.</p>
              <p>3. Вы сразу увидите точную сетку и все действия составителя!</p>
            </div>

            <Button
              onClick={() => setShowPhoneModal(false)}
              className="w-full text-xs font-bold py-2.5"
            >
              {isUz ? "Tushundim" : "Понятно"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
