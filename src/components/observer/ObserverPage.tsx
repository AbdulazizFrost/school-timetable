import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Clock,
  Users,
  GraduationCap,
  DoorOpen,
  Calendar,
  Maximize2,
  Minimize2,
  Search,
  CheckCircle2,
  Coffee,
  Sparkles,
  ArrowRight,
  Tv,
  Filter,
  Eye,
  AlertCircle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { DAY_NAMES, DAY_SHORT_NAMES, Teacher, SchoolClass, Classroom, Subject } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Button, cn } from '../common/Button';
import { NavSection } from '../layout/Sidebar';

export const UZ_DAY_NAMES: Record<number, string> = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
};

export const UZ_DAY_SHORT_NAMES: Record<number, string> = {
  1: 'DU',
  2: 'SE',
  3: 'CH',
  4: 'PA',
  5: 'JU',
  6: 'SH',
};

export interface ObserverPageProps {
  onNavigate?: (section: NavSection) => void;
}

type ObserverTab = 'teachers' | 'classes' | 'rooms' | 'board';
type TeacherStatusFilter = 'all' | 'teaching' | 'window' | 'off';
type RoomStatusFilter = 'all' | 'occupied' | 'vacant';

export const ObserverPage: React.FC<ObserverPageProps> = ({ onNavigate }) => {
  const { teachers, classes, subjects, rooms, settings, language, t } = useSchoolStore();
  const { schedule, generateSchedule, isGenerating } = useScheduleStore();

  const isUz = language === 'uz';
  const dayLabels = isUz ? UZ_DAY_NAMES : DAY_NAMES;
  const dayShortLabels = isUz ? UZ_DAY_SHORT_NAMES : DAY_SHORT_NAMES;

  // Real-time clock state
  const [now, setNow] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute current real-world day & period
  const liveSlot = useMemo(() => {
    const jsDay = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const schoolDay = jsDay === 0 ? 1 : jsDay; // map Sunday to Mon if testing
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let activePeriod = 1;
    let isExactLesson = false;
    let statusDesc = '';

    const periodTimes = settings.periodTimes || [];
    const sorted = [...periodTimes].sort((a, b) => a.period - b.period);

    for (let i = 0; i < sorted.length; i++) {
      const pt = sorted[i];
      const [sh, sm] = (pt.startTime || '08:00').split(':').map(Number);
      const [eh, em] = (pt.endTime || '08:45').split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (currentMinutes >= startMin && currentMinutes <= endMin) {
        activePeriod = pt.period;
        isExactLesson = true;
        statusDesc = isUz ? `${pt.period}-dars davom etmoqda` : `Идёт ${pt.period}-й урок`;
        break;
      }

      // Check if during break before this lesson
      if (i > 0) {
        const prevPt = sorted[i - 1];
        const [prevEh, prevEm] = (prevPt.endTime || '08:45').split(':').map(Number);
        const prevEndMin = prevEh * 60 + prevEm;
        if (currentMinutes > prevEndMin && currentMinutes < startMin) {
          activePeriod = pt.period;
          isExactLesson = false;
          statusDesc = isUz ? `Tanaffus (${pt.period}-dars oldidan)` : `Перемена перед ${pt.period}-м уроком`;
          break;
        }
      }
    }

    if (!statusDesc) {
      if (sorted.length > 0) {
        const [firstH, firstM] = sorted[0].startTime.split(':').map(Number);
        if (currentMinutes < firstH * 60 + firstM) {
          activePeriod = 1;
          statusDesc = isUz ? "Darslar hali boshlanmadi" : "Уроки ещё не начались";
        } else {
          activePeriod = sorted[sorted.length - 1].period;
          statusDesc = isUz ? "O'quv kuni yakunlandi" : "Учебный день завершён";
        }
      } else {
        activePeriod = 1;
        statusDesc = isUz ? "1-dars" : "1-й урок";
      }
    }

    return {
      day: schoolDay,
      period: activePeriod,
      isExactLesson,
      statusDesc,
      isWeekend: jsDay === 0 || jsDay === 6,
    };
  }, [now, settings.periodTimes, isUz]);

  // User interactive slot selection (can follow live or manual)
  const [isLiveAuto, setIsLiveAuto] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<number>(liveSlot.day);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(liveSlot.period);

  // Sync with live when auto-mode is enabled
  useEffect(() => {
    if (isLiveAuto) {
      setSelectedDay(liveSlot.day);
      setSelectedPeriod(liveSlot.period);
    }
  }, [liveSlot.day, liveSlot.period, isLiveAuto]);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<ObserverTab>('teachers');
  const [teacherFilter, setTeacherFilter] = useState<TeacherStatusFilter>('all');
  const [roomFilter, setRoomFilter] = useState<RoomStatusFilter>('all');
  const [classShiftFilter, setClassShiftFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lookup Maps
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Filter current slot entries
  const currentSlotEntries = useMemo(() => {
    if (!schedule) return [];
    return schedule.entries.filter((e) => e.day === selectedDay && e.period === selectedPeriod);
  }, [schedule, selectedDay, selectedPeriod]);

  // All entries for selected day (for detecting next lessons / windows)
  const todayEntries = useMemo(() => {
    if (!schedule) return [];
    return schedule.entries.filter((e) => e.day === selectedDay);
  }, [schedule, selectedDay]);

  // Max period count for selected day
  const maxPeriod = settings.periodsPerDay[selectedDay] || 7;

  // Time label for selected period
  const selectedPeriodTime = useMemo(() => {
    const pt = settings.periodTimes.find((p) => p.period === selectedPeriod);
    return pt ? `${pt.startTime} - ${pt.endTime}` : '';
  }, [settings.periodTimes, selectedPeriod]);

  // Format Room helper
  const formatRoomLabel = (roomId?: string) => {
    if (!roomId) return '';
    const rm = roomMap.get(roomId);
    if (!rm) return '';
    const num = (rm.roomNumber || rm.name || '').trim();
    if (rm.type === 'gym' || num.toLowerCase().includes('sport') || rm.name.toLowerCase().includes('zal')) {
      return isUz ? 'x.Sportzal' : 'Спортзал';
    }
    return `x.${num}`;
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const teachingTeacherIds = new Set(currentSlotEntries.map((e) => e.teacherId));
    const activeTeachersCount = teachingTeacherIds.size;

    // Teachers who have lessons today but NOT in this period => "On Window"
    const todayTeacherIds = new Set(todayEntries.map((e) => e.teacherId));
    let windowTeachersCount = 0;
    todayTeacherIds.forEach((tId) => {
      if (!teachingTeacherIds.has(tId)) {
        windowTeachersCount++;
      }
    });

    const offTeachersCount = Math.max(0, teachers.length - todayTeacherIds.size);

    const activeClassIds = new Set(currentSlotEntries.map((e) => e.classId));
    const activeClassesCount = activeClassIds.size;

    const occupiedRoomIds = new Set(currentSlotEntries.map((e) => e.classroomId).filter(Boolean));
    const occupiedRoomsCount = occupiedRoomIds.size;
    const vacantRoomsCount = Math.max(0, rooms.length - occupiedRoomsCount);

    return {
      activeTeachersCount,
      windowTeachersCount,
      offTeachersCount,
      activeClassesCount,
      totalClasses: classes.length,
      occupiedRoomsCount,
      vacantRoomsCount,
      totalRooms: rooms.length,
    };
  }, [currentSlotEntries, todayEntries, teachers, classes, rooms]);

  // --- TEACHER VIEW DATA ---
  const teacherRows = useMemo(() => {
    return teachers
      .map((t) => {
        const slotEntries = currentSlotEntries.filter((e) => e.teacherId === t.id);
        const dayLessons = todayEntries.filter((e) => e.teacherId === t.id);

        let status: 'teaching' | 'window' | 'off' = 'off';
        if (slotEntries.length > 0) {
          status = 'teaching';
        } else if (dayLessons.length > 0) {
          status = 'window';
        }

        // Find next lesson today if on window
        const nextLesson = dayLessons
          .filter((e) => e.period > selectedPeriod)
          .sort((a, b) => a.period - b.period)[0];

        return {
          teacher: t,
          status,
          currentEntries: slotEntries,
          dayLessonCount: dayLessons.length,
          nextLesson,
        };
      })
      .filter((row) => {
        if (teacherFilter !== 'all' && row.status !== teacherFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const name = row.teacher.fullName.toLowerCase();
          const subj = row.teacher.subjectIds.some((sid) =>
            subjectMap.get(sid)?.name.toLowerCase().includes(q)
          );
          return name.includes(q) || subj;
        }
        return true;
      });
  }, [teachers, currentSlotEntries, todayEntries, teacherFilter, searchQuery, selectedPeriod, subjectMap]);

  // --- CLASS VIEW DATA ---
  const classRows = useMemo(() => {
    return classes
      .filter((c) => {
        if (classShiftFilter !== 'all' && c.shift !== classShiftFilter) return false;
        if (searchQuery.trim()) {
          return c.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      })
      .map((cls) => {
        const slotEntries = currentSlotEntries.filter((e) => e.classId === cls.id);
        const dayLessons = todayEntries.filter((e) => e.classId === cls.id);
        const hasLesson = slotEntries.length > 0;

        return {
          cls,
          hasLesson,
          entries: slotEntries,
          dayLessonCount: dayLessons.length,
        };
      });
  }, [classes, currentSlotEntries, todayEntries, classShiftFilter, searchQuery]);

  // --- ROOM VIEW DATA ---
  const roomRows = useMemo(() => {
    return rooms
      .map((rm) => {
        const slotEntries = currentSlotEntries.filter((e) => e.classroomId === rm.id);
        const isOccupied = slotEntries.length > 0;
        return {
          room: rm,
          isOccupied,
          entries: slotEntries,
        };
      })
      .filter((row) => {
        if (roomFilter === 'occupied' && !row.isOccupied) return false;
        if (roomFilter === 'vacant' && row.isOccupied) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (row.room.roomNumber && row.room.roomNumber.toLowerCase().includes(q)) ||
            row.room.name.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [rooms, currentSlotEntries, roomFilter, searchQuery]);

  // If no schedule generated yet
  if (!schedule) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <Card className="border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-slate-900 dark:to-blue-950/20 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {isUz ? "Kuzatuvchi rejimi (Jonli efir)" : "Режим наблюдателя (Прямой эфир)"}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            {isUz
              ? "Maktabda kim qayerda dars o'tayotgani, qaysi xonalar bo'sh yoki bandligi va qaysi o'qituvchilar erkinligini real vaqtda kuzatish uchun avval dars jadvalini tuzing."
              : "Чтобы отслеживать в реальном времени, кто из учителей сейчас ведёт урок, где находятся классы и какие кабинеты свободны, сначала составьте расписание."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              size="lg"
              onClick={() => generateSchedule()}
              isLoading={isGenerating}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 px-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isUz ? "Jadvalni avtomatik tuzish" : "Составить расписание"}
            </Button>
            {onNavigate && (
              <Button variant="outline" size="lg" onClick={() => onNavigate('dashboard')}>
                {isUz ? "Boshqaruv paneliga qaytish" : "На дашборд"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & LIVE CLOCK BAR */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Title & live badge */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 mt-0.5">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {isUz ? "Kuzatuvchi rejimi" : "Режим наблюдателя"}
                </h1>
                {isLiveAuto ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {isUz ? "JONLI EFIR" : "ПРЯМОЙ ЭФИР"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Clock className="w-3 h-3" />
                    {isUz ? "INSPEKTOR REJIMI" : "ИНСПЕКТОР СЛОТА"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isUz
                  ? "Maktab faoliyatining onlayn monitoringi: kim qayerda va nima bilan band"
                  : "Мониторинг школы в реальном времени: кто, где и какой урок ведёт"}
              </p>
            </div>
          </div>

          {/* Right: Digital clock & controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            {/* Realtime clock display */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-sm font-bold shadow-inner">
              <Clock className="w-4 h-4 text-emerald-500 animate-spin-slow" />
              <span>{now.toLocaleTimeString(language === 'uz' ? 'uz-UZ' : 'ru-RU')}</span>
            </div>

            {/* Jump to Live Button */}
            {!isLiveAuto && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLiveAuto(true)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100"
              >
                <Radio className="w-3.5 h-3.5 mr-1 text-emerald-500 animate-pulse" />
                <span>{isUz ? "Jonli vaqtga qaytish" : "Вернуться к прямому эфиру"}</span>
              </Button>
            )}

            {/* Fullscreen TV mode */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              title={isUz ? "To'liq ekran (Tablo)" : "Полноэкранный режим (Табло)"}
              className="text-xs font-semibold px-2.5"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline ml-1.5">{isUz ? "Tablo" : "На весь экран"}</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TIME SLOT SELECTOR: DAYS & PERIODS */}
        {/* ========================================================================= */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Day selection pills */}
          <div className="lg:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 touch-scroll">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              {isUz ? "Kun:" : "День:"}
            </span>
            {settings.workingDays.map((d) => {
              const isSelected = selectedDay === d;
              const isToday = liveSlot.day === d;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDay(d);
                    setIsLiveAuto(false);
                  }}
                  className={cn(
                    'relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1',
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  <span>{dayShortLabels[d]}</span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Period selector */}
          <div className="lg:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 touch-scroll justify-start lg:justify-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              {isUz ? "Dars:" : "Урок:"}
            </span>
            {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => {
              const isSelected = selectedPeriod === p;
              const isLivePeriod = liveSlot.period === p && liveSlot.day === selectedDay;
              const pt = settings.periodTimes.find((t) => t.period === p);
              return (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedPeriod(p);
                    setIsLiveAuto(false);
                  }}
                  title={pt ? `${pt.startTime} - ${pt.endTime}` : `${p}-${isUz ? 'dars' : 'й урок'}`}
                  className={cn(
                    'relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  <span>{p}</span>
                  {isLivePeriod && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Slot Description Banner */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {dayLabels[selectedDay]}, {selectedPeriod}-{isUz ? "dars" : "й урок"}
            </span>
            {selectedPeriodTime && (
              <span className="text-slate-400 dark:text-slate-500 font-mono">
                ({selectedPeriodTime})
              </span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {liveSlot.statusDesc}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE METRIC COUNTERS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Teaching */}
        <Card
          onClick={() => {
            setActiveTab('teachers');
            setTeacherFilter('teaching');
          }}
          className="cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-800 transition-all active:scale-98"
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isUz ? "Dars o'tayotganlar" : "Ведут урок"}
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {stats.activeTeachersCount}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                🟢 {isUz ? "sinflarda band" : "на уроках сейчас"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Window / Free */}
        <Card
          onClick={() => {
            setActiveTab('teachers');
            setTeacherFilter('window');
          }}
          className="cursor-pointer hover:border-amber-300 dark:hover:border-amber-800 transition-all active:scale-98"
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isUz ? "Darchadagi (erkin)" : "Свободны / Окно"}
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {stats.windowTeachersCount}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                🟡 {isUz ? "almashtirishga tayyor" : "резерв на замену"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Active Classes */}
        <Card
          onClick={() => setActiveTab('classes')}
          className="cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-all active:scale-98"
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isUz ? "Band sinflar" : "Классы на уроке"}
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {stats.activeClassesCount} <span className="text-sm font-semibold text-slate-400">/ {stats.totalClasses}</span>
              </h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                {Math.round((stats.activeClassesCount / Math.max(1, stats.totalClasses)) * 100)}% {isUz ? "sinflar band" : "занятость"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Rooms */}
        <Card
          onClick={() => setActiveTab('rooms')}
          className="cursor-pointer hover:border-purple-300 dark:hover:border-purple-800 transition-all active:scale-98"
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isUz ? "Xonalar holati" : "Кабинеты"}
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {stats.occupiedRoomsCount} <span className="text-sm font-semibold text-slate-400">/ {stats.totalRooms}</span>
              </h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                {stats.vacantRoomsCount} {isUz ? "bo'sh xona" : "свободных каб."}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <DoorOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN VIEW TABS & FILTERS */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Main 4 tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll">
            <button
              onClick={() => setActiveTab('teachers')}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all',
                activeTab === 'teachers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Users className="w-4 h-4" />
              <span>{isUz ? "O'qituvchilar" : "Учителя"}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {teachers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all',
                activeTab === 'classes'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              <span>{isUz ? "Sinflar" : "Классы"}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {classes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all',
                activeTab === 'rooms'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <DoorOpen className="w-4 h-4" />
              <span>{isUz ? "Xonalar" : "Кабинеты"}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {rooms.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('board')}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all',
                activeTab === 'board'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Tv className="w-4 h-4" />
              <span>{isUz ? "Maktab tablosi" : "Табло школы"}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isUz ? "Qidirish..." : "Быстрый поиск..."}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sub-Filters per tab */}
        {activeTab === 'teachers' && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-bold mr-1">{isUz ? "Holati:" : "Статус:"}</span>
            <button
              onClick={() => setTeacherFilter('all')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                teacherFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {isUz ? "Barchasi" : "Все"} ({teachers.length})
            </button>
            <button
              onClick={() => setTeacherFilter('teaching')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                teacherFilter === 'teaching'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {isUz ? "Dars o'tayotganlar" : "Ведут урок"} ({stats.activeTeachersCount})
            </button>
            <button
              onClick={() => setTeacherFilter('window')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                teacherFilter === 'window'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {isUz ? "Darchada (bo'sh)" : "Свободны / Окно"} ({stats.windowTeachersCount})
            </button>
            <button
              onClick={() => setTeacherFilter('off')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                teacherFilter === 'off'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              <span>{isUz ? "Bugun darsi yo'q" : "Сегодня нет уроков"} ({stats.offTeachersCount})</span>
            </button>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-bold mr-1">{isUz ? "Smena:" : "Смена:"}</span>
            <button
              onClick={() => setClassShiftFilter('all')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                classShiftFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {isUz ? "Barcha sinflar" : "Все классы"}
            </button>
            <button
              onClick={() => setClassShiftFilter(1)}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                classShiftFilter === 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              1-{isUz ? 'smena' : 'я смена'}
            </button>
            <button
              onClick={() => setClassShiftFilter(2)}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                classShiftFilter === 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              2-{isUz ? 'smena' : 'я смена'}
            </button>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-bold mr-1">{isUz ? "Xona holati:" : "Кабинеты:"}</span>
            <button
              onClick={() => setRoomFilter('all')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                roomFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {isUz ? "Barcha xonalar" : "Все кабинеты"} ({rooms.length})
            </button>
            <button
              onClick={() => setRoomFilter('occupied')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                roomFilter === 'occupied'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              {isUz ? "Band xonalar" : "Заняты"} ({stats.occupiedRoomsCount})
            </button>
            <button
              onClick={() => setRoomFilter('vacant')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                roomFilter === 'vacant'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {isUz ? "Bo'sh xonalar" : "Свободны"} ({stats.vacantRoomsCount})
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. TAB CONTENT RENDERERS */}
        {/* ========================================================================= */}

        {/* --- TAB 1: TEACHERS VIEW --- */}
        {activeTab === 'teachers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 pt-2">
            {teacherRows.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                {isUz ? "O'qituvchilar topilmadi" : "Учителя по заданным критериям не найдены"}
              </div>
            ) : (
              teacherRows.map(({ teacher: tch, status, currentEntries, dayLessonCount, nextLesson }) => {
                return (
                  <div
                    key={tch.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all',
                      status === 'teaching'
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : status === 'window'
                        ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-75'
                    )}
                  >
                    {/* Header: Teacher Name + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {tch.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {tch.subjectIds
                            .map((sid) => subjectMap.get(sid)?.shortName || subjectMap.get(sid)?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {status === 'teaching' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {isUz ? "Darsda" : "ВЕДЁТ УРОК"}
                        </span>
                      )}
                      {status === 'window' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                          <Coffee className="w-3 h-3" />
                          {isUz ? "Darcha" : "ОКНО (СВОБОДЕН)"}
                        </span>
                      )}
                      {status === 'off' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 shrink-0">
                          {isUz ? "Dars yo'q" : "НЕТ УРОКОВ"}
                        </span>
                      )}
                    </div>

                    {/* Lesson Details */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {status === 'teaching' ? (
                        <div className="space-y-2">
                          {currentEntries.map((ent) => {
                            const sub = subjectMap.get(ent.subjectId);
                            const cls = classMap.get(ent.classId);
                            const rmLabel = formatRoomLabel(ent.classroomId);
                            const isBoys = ent.subgroup === 'boys';
                            const isGirls = ent.subgroup === 'girls';

                            return (
                              <div
                                key={ent.id}
                                className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-emerald-100 dark:border-emerald-900/40 shadow-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                    {sub?.name || 'Dars'}
                                  </span>
                                  {rmLabel && (
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                      {rmLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] border border-blue-200 dark:border-blue-900">
                                    {cls?.name} {isUz ? "sinf" : "класс"}
                                  </span>
                                  {isBoys && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                                      ♂ {isUz ? "O'g'illar" : "Мальчики"}
                                    </span>
                                  )}
                                  {isGirls && (
                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-50 dark:bg-pink-950 px-1.5 py-0.5 rounded">
                                      ♀ {isUz ? "Qizlar" : "Девочки"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : status === 'window' ? (
                        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                          <p className="font-semibold text-amber-700 dark:text-amber-400">
                            {isUz
                              ? "O'qituvchi maktabda erkin (almashtirish mumkin)"
                              : "Учитель в школе свободен (готов к замене)"}
                          </p>
                          {nextLesson ? (
                            <p className="text-[11px] text-slate-500 mt-1">
                              {isUz ? "Navbatdagi darsi:" : "Следующий урок:"}{' '}
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {nextLesson.period}-{isUz ? "dars" : "й урок"} (
                                {classMap.get(nextLesson.classId)?.name}
                                {formatRoomLabel(nextLesson.classroomId) ? `, ${formatRoomLabel(nextLesson.classroomId)}` : ''})
                              </span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500">
                              {isUz ? "Bugungi barcha darslari yakunlangan" : "Все уроки на сегодня завершены"}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 pt-0.5">
                            {isUz ? "Bugungi yuklama:" : "Всего уроков сегодня:"} {dayLessonCount} {isUz ? "soat" : "ч."}
                          </p>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          {isUz ? "Bu kunda darsi rejalashtirilmagan" : "В этот день занятий нет"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 2: CLASSES VIEW --- */}
        {activeTab === 'classes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pt-2">
            {classRows.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                {isUz ? "Sinflar topilmadi" : "Классы не найдены"}
              </div>
            ) : (
              classRows.map(({ cls, hasLesson, entries }) => {
                return (
                  <div
                    key={cls.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all',
                      hasLesson
                        ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                    )}
                  >
                    {/* Class header badge */}
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold text-sm">
                        <span>{cls.name}</span>
                        <span className="text-[10px] font-normal opacity-80">
                          ({cls.studentCount || 0} {isUz ? "o'quvchi" : "уч."})
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {cls.shift || 1}-{isUz ? "smena" : "я смена"}
                      </span>
                    </div>

                    {/* Lesson inside class */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {hasLesson ? (
                        <div className="space-y-2">
                          {entries.map((ent) => {
                            const sub = subjectMap.get(ent.subjectId);
                            const tch = teacherMap.get(ent.teacherId);
                            const rmLabel = formatRoomLabel(ent.classroomId);
                            const isBoys = ent.subgroup === 'boys';
                            const isGirls = ent.subgroup === 'girls';

                            return (
                              <div
                                key={ent.id}
                                className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 shadow-xs"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                                    {sub?.name || 'Dars'}
                                  </span>
                                  {rmLabel && (
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                      {rmLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                                  <span className="font-medium truncate">
                                    {tch?.shortName || tch?.fullName || ''}
                                  </span>
                                  {isBoys && (
                                    <span className="text-[9.5px] font-extrabold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                      ♂ O'g'illar
                                    </span>
                                  )}
                                  {isGirls && (
                                    <span className="text-[9.5px] font-extrabold text-pink-600 bg-pink-50 px-1 py-0.5 rounded">
                                      ♀ Qizlar
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-2 text-center text-xs text-slate-400 font-medium">
                          {isUz ? "Hozir dars yo'q" : "Сейчас нет урока"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 3: ROOMS VIEW --- */}
        {activeTab === 'rooms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pt-2">
            {roomRows.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                {isUz ? "Xonalar topilmadi" : "Кабинеты не найдены"}
              </div>
            ) : (
              roomRows.map(({ room: rm, isOccupied, entries }) => {
                return (
                  <div
                    key={rm.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all',
                      isOccupied
                        ? 'border-purple-200 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/10'
                        : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    )}
                  >
                    {/* Room title & capacity */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <DoorOpen className="w-4 h-4 text-slate-500" />
                          <span>{rm.roomNumber || rm.name}</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {rm.name !== rm.roomNumber ? rm.name : ''} {rm.capacity ? `(${rm.capacity} o'rin)` : ''}
                        </p>
                      </div>

                      {isOccupied ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                          {isUz ? "BAND" : "ЗАНЯТ"}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                          {isUz ? "BO'SH" : "СВОБОДЕН"}
                        </span>
                      )}
                    </div>

                    {/* Room details */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {isOccupied ? (
                        <div className="space-y-1.5">
                          {entries.map((ent) => {
                            const sub = subjectMap.get(ent.subjectId);
                            const cls = classMap.get(ent.classId);
                            const tch = teacherMap.get(ent.teacherId);
                            return (
                              <div key={ent.id} className="text-xs">
                                <div className="font-extrabold text-slate-900 dark:text-white">
                                  {cls?.name} • {sub?.name}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {isUz ? "O'qituvchi:" : "Преподаватель:"} {tch?.shortName || tch?.fullName}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          ✓ {isUz ? "Dars o'tish uchun ochiq" : "Кабинет свободен для занятий"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- TAB 4: LIVE SUMMARY BOARD (KIOSK / TV MODE) --- */}
        {activeTab === 'board' && (
          <div className="pt-2">
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs">
                      <th className="py-3 px-4 font-bold">{isUz ? "Sinf" : "Класс"}</th>
                      <th className="py-3 px-4 font-bold">{isUz ? "Fan" : "Предмет"}</th>
                      <th className="py-3 px-4 font-bold">{isUz ? "O'qituvchi" : "Преподаватель"}</th>
                      <th className="py-3 px-4 font-bold">{isUz ? "Xona" : "Кабинет"}</th>
                      <th className="py-3 px-4 font-bold text-right">{isUz ? "Holati" : "Статус"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {classes.map((cls) => {
                      const slotEntries = currentSlotEntries.filter((e) => e.classId === cls.id);
                      if (slotEntries.length === 0) {
                        return (
                          <tr key={cls.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 opacity-50">
                            <td className="py-2.5 px-4 font-extrabold text-slate-900 dark:text-white">
                              {cls.name}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">—</td>
                            <td className="py-2.5 px-4 text-slate-400">—</td>
                            <td className="py-2.5 px-4 text-slate-400">—</td>
                            <td className="py-2.5 px-4 text-right text-slate-400 font-medium">
                              {isUz ? "Bo'sh" : "Свободен"}
                            </td>
                          </tr>
                        );
                      }

                      return slotEntries.map((ent, eIdx) => {
                        const sub = subjectMap.get(ent.subjectId);
                        const tch = teacherMap.get(ent.teacherId);
                        const rm = roomMap.get(ent.classroomId);
                        return (
                          <tr
                            key={`${cls.id}-${ent.id}-${eIdx}`}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                          >
                            <td className="py-2.5 px-4 font-black text-slate-900 dark:text-white">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold">
                                {cls.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-extrabold text-slate-900 dark:text-white">
                              {sub?.name || 'Dars'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              {tch?.fullName || ''}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800">
                                {formatRoomLabel(ent.classroomId) || rm?.name || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {isUz ? "Darsda" : "Идёт урок"}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
