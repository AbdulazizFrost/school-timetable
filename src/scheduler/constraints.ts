import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { ScheduleConflict } from '../types/constraints';
import { ScheduleEntry } from '../types/schedule';
import { formatSlotKey } from '../utils/timeUtils';

export interface HardConstraintsCheckResult {
  hasConflicts: boolean;
  conflicts: ScheduleConflict[];
}

/**
 * Validates strictly that Kelajak darsi is scheduled on Monday, Period 1 for each class having it in curriculum.
 */
export const validateKelajakDarsiPlacement = (
  entries: ScheduleEntry[],
  classes: SchoolClass[],
  subjects: Subject[]
): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  classes.forEach((cls) => {
    const hasKelajakInCurriculum = cls.curriculum.some(
      (r) =>
        r.subjectId === 'kelajak-darsi' ||
        r.subjectId.toLowerCase().includes('kelajak') ||
        subjectMap.get(r.subjectId)?.name.toLowerCase().includes('kelajak')
    );

    if (hasKelajakInCurriculum) {
      const classKelajakEntries = entries.filter(
        (e) =>
          e.classId === cls.id &&
          (e.subjectId === 'kelajak-darsi' ||
            e.subjectId.toLowerCase().includes('kelajak') ||
            subjectMap.get(e.subjectId)?.name.toLowerCase().includes('kelajak'))
      );

      // Check 1: Missing on Monday period 1
      if (classKelajakEntries.length === 0) {
        conflicts.push({
          id: `conf_kelajak_missing_${cls.id}`,
          type: 'class_clash',
          severity: 'ERROR',
          day: 1,
          period: 1,
          message: `ERROR: Kelajak darsi must be scheduled on Monday, period 1 for class ${cls.name}.`,
          affectedEntries: [],
          affectedEntityIds: { classIds: [cls.id] },
          suggestion: 'Зафиксируйте Kelajak darsi на Понедельник, 1-й урок.',
        });
      } else {
        // Check 2: Misplaced (not Monday or not Period 1)
        classKelajakEntries.forEach((entry) => {
          if (entry.day !== 1 || entry.period !== 1) {
            conflicts.push({
              id: `conf_kelajak_misplaced_${entry.id}`,
              type: 'class_clash',
              severity: 'ERROR',
              day: entry.day,
              period: entry.period,
              message: `ERROR: Kelajak darsi must be scheduled on Monday, period 1.`,
              affectedEntries: [entry.id],
              affectedEntityIds: { classIds: [cls.id] },
              suggestion: 'Переместите Kelajak darsi на Понедельник, 1-й урок.',
            });
          }
        });
      }

      // Check 3: Another subject displacing Monday Period 1
      const otherMon1 = entries.filter(
        (e) =>
          e.classId === cls.id &&
          e.day === 1 &&
          e.period === 1 &&
          e.subjectId !== 'kelajak-darsi' &&
          !e.subjectId.toLowerCase().includes('kelajak') &&
          !subjectMap.get(e.subjectId)?.name.toLowerCase().includes('kelajak')
      );
      if (otherMon1.length > 0) {
        conflicts.push({
          id: `conf_kelajak_displaced_${cls.id}`,
          type: 'class_clash',
          severity: 'ERROR',
          day: 1,
          period: 1,
          message: `ERROR: Kelajak darsi must be scheduled on Monday, period 1. Slot is occupied by another subject.`,
          affectedEntries: otherMon1.map((e) => e.id),
          affectedEntityIds: { classIds: [cls.id] },
          suggestion: 'Освободите Понедельник 1-й урок для Kelajak darsi.',
        });
      }
    }
  });

  return conflicts;
};

/**
 * Checks all hard constraints for a full schedule or partial assignments.
 */
export const checkHardConstraints = (
  entries: ScheduleEntry[],
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): HardConstraintsCheckResult => {
  const conflicts: ScheduleConflict[] = [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // Index entries by slot keys
  const classSlotMap = new Map<string, ScheduleEntry[]>();
  const teacherSlotMap = new Map<string, ScheduleEntry[]>();
  const roomSlotMap = new Map<string, ScheduleEntry[]>();

  // Teacher daily lesson counts: teacherId_day -> count
  const teacherDailyCount = new Map<string, number>();

  for (const entry of entries) {
    const slotKey = `${entry.day}-${entry.period}`;
    const classKey = `${entry.classId}_${slotKey}`;
    const teacherKey = `${entry.teacherId}_${slotKey}`;
    const roomKey = `${entry.classroomId}_${slotKey}`;
    const teacherDayKey = `${entry.teacherId}_${entry.day}`;

    // 1. Class Collision (a class has 2 lessons at the same time)
    if (!classSlotMap.has(classKey)) {
      classSlotMap.set(classKey, []);
    }
    classSlotMap.get(classKey)!.push(entry);

    // 2. Teacher Collision (a teacher teaches 2 classes at the same time)
    if (!teacherSlotMap.has(teacherKey)) {
      teacherSlotMap.set(teacherKey, []);
    }
    teacherSlotMap.get(teacherKey)!.push(entry);

    // 3. Room Collision (a room is occupied by 2 classes at the same time)
    if (entry.classroomId) {
      if (!roomSlotMap.has(roomKey)) {
        roomSlotMap.set(roomKey, []);
      }
      roomSlotMap.get(roomKey)!.push(entry);
    }

    // 4. Teacher Daily Count
    teacherDailyCount.set(teacherDayKey, (teacherDailyCount.get(teacherDayKey) || 0) + 1);

    // 5. Teacher Availability
    const teacher = teacherMap.get(entry.teacherId);
    if (teacher) {
      if (teacher.availability && teacher.availability[slotKey] === false) {
        conflicts.push({
          id: `conf_tch_unavail_${entry.id}`,
          type: 'teacher_unavailable',
          severity: 'ERROR',
          day: entry.day,
          period: entry.period,
          message: `Преподаватель ${teacher.fullName} недоступен в ${entry.day}-й день на ${entry.period}-м уроке.`,
          affectedEntries: [entry.id],
          affectedEntityIds: { teacherIds: [teacher.id], classIds: [entry.classId] },
          suggestion: 'Переместите урок на доступное для учителя время.',
        });
      }
    }

    // 6. Room Type & Capacity
    const subject = subjectMap.get(entry.subjectId);
    const room = roomMap.get(entry.classroomId);
    const cls = classMap.get(entry.classId);

    if (subject && subject.requiredRoomType && room) {
      if (room.type !== subject.requiredRoomType && room.type !== 'general' && subject.requiredRoomType !== 'general') {
        conflicts.push({
          id: `conf_room_type_${entry.id}`,
          type: 'room_type_mismatch',
          severity: 'WARNING',
          day: entry.day,
          period: entry.period,
          message: `Предмет «${subject.name}» требует кабинет типа «${subject.requiredRoomType}», но назначен «${room.name}» (${room.type}).`,
          affectedEntries: [entry.id],
          affectedEntityIds: { roomIds: [room.id], subjectIds: [subject.id], classIds: [entry.classId] },
        });
      }
    }

    if (cls && room && cls.studentCount > room.capacity) {
      conflicts.push({
        id: `conf_room_cap_${entry.id}`,
        type: 'room_capacity',
        severity: 'WARNING',
        day: entry.day,
        period: entry.period,
        message: `В классе ${cls.name} ${cls.studentCount} учеников, а вместимость кабинета «${room.name}» составляет ${room.capacity} мест.`,
        affectedEntries: [entry.id],
        affectedEntityIds: { roomIds: [room.id], classIds: [cls.id] },
      });
    }
  }

  // Check Class Clashes
  classSlotMap.forEach((entryList) => {
    if (entryList.length > 1) {
      const first = entryList[0];
      const cls = classMap.get(first.classId);
      const subNames = entryList.map((e) => subjectMap.get(e.subjectId)?.name || 'Урок').join(' и ');
      conflicts.push({
        id: `conf_cls_clash_${first.classId}_${first.day}_${first.period}`,
        type: 'class_clash',
        severity: 'FATAL',
        day: first.day,
        period: first.period,
        message: `Конфликт класса: у ${cls?.name || 'класса'} одновременно назначено несколько предметов: ${subNames}.`,
        affectedEntries: entryList.map((e) => e.id),
        affectedEntityIds: { classIds: [first.classId] },
        suggestion: 'Перенесите один из предметов на другой свободный урок.',
      });
    }
  });

  // Check Teacher Clashes
  teacherSlotMap.forEach((entryList) => {
    if (entryList.length > 1) {
      const first = entryList[0];
      const tch = teacherMap.get(first.teacherId);
      const classNames = entryList.map((e) => classMap.get(e.classId)?.name || 'Класс').join(', ');
      conflicts.push({
        id: `conf_tch_clash_${first.teacherId}_${first.day}_${first.period}`,
        type: 'teacher_clash',
        severity: 'FATAL',
        day: first.day,
        period: first.period,
        message: `Конфликт учителя: ${tch?.fullName || 'Преподаватель'} назначен одновременно в классы: ${classNames}.`,
        affectedEntries: entryList.map((e) => e.id),
        affectedEntityIds: { teacherIds: [first.teacherId], classIds: entryList.map((e) => e.classId) },
        suggestion: 'Разведите уроки этих классов по разным временным слотам.',
      });
    }
  });

  // Check Room Clashes
  roomSlotMap.forEach((entryList) => {
    if (entryList.length > 1) {
      const first = entryList[0];
      const rm = roomMap.get(first.classroomId);
      const classNames = entryList.map((e) => classMap.get(e.classId)?.name || 'Класс').join(' и ');
      conflicts.push({
        id: `conf_room_clash_${first.classroomId}_${first.day}_${first.period}`,
        type: 'room_clash',
        severity: 'FATAL',
        day: first.day,
        period: first.period,
        message: `Конфликт кабинета: «${rm?.name || 'Кабинет'}» занят одновременно классами: ${classNames}.`,
        affectedEntries: entryList.map((e) => e.id),
        affectedEntityIds: { roomIds: [first.classroomId], classIds: entryList.map((e) => e.classId) },
        suggestion: 'Назначьте одному из классов другой свободный кабинет.',
      });
    }
  });

  // Check Teacher Max Daily Lessons
  teacherDailyCount.forEach((count, key) => {
    const [teacherId, dayStr] = key.split('_');
    const day = Number(dayStr);
    const tch = teacherMap.get(teacherId);
    if (tch && count > tch.maxLessonsPerDay) {
      conflicts.push({
        id: `conf_tch_daily_max_${teacherId}_${day}`,
        type: 'teacher_daily_max',
        severity: 'ERROR',
        day,
        period: 1,
        message: `Преподаватель ${tch.fullName} ведет ${count} уроков в день при максимуме ${tch.maxLessonsPerDay}.`,
        affectedEntries: entries.filter((e) => e.teacherId === teacherId && e.day === day).map((e) => e.id),
        affectedEntityIds: { teacherIds: [teacherId] },
        suggestion: `Перенесите часть уроков учителя на другой день.`,
      });
    }
  });

  // Check Kelajak darsi hard constraints
  const kelajakConflicts = validateKelajakDarsiPlacement(entries, classes, subjects);
  conflicts.push(...kelajakConflicts);

  // Check No repeat subject on same day
  const repeatSubjectConflicts = validateNoRepeatSubjectInSameDay(entries, classes, subjects);
  conflicts.push(...repeatSubjectConflicts);

  // Check Class Compactness (no gaps, must start at period 1)
  const classCompactnessConflicts = validateClassCompactness(entries, classes, settings);
  conflicts.push(...classCompactnessConflicts);

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
};

/**
 * Validates that no class has more than 1 lesson of the same subject on any day.
 */
export const validateNoRepeatSubjectInSameDay = (
  entries: ScheduleEntry[],
  classes: SchoolClass[],
  subjects: Subject[]
): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const classDaySubjectMap = new Map<string, ScheduleEntry[]>();
  entries.forEach((entry) => {
    const key = `${entry.classId}_${entry.day}_${entry.subjectId}`;
    if (!classDaySubjectMap.has(key)) {
      classDaySubjectMap.set(key, []);
    }
    classDaySubjectMap.get(key)!.push(entry);
  });

  classDaySubjectMap.forEach((entryList) => {
    if (entryList.length > 1) {
      const first = entryList[0];
      const cls = classMap.get(first.classId);
      const sub = subjectMap.get(first.subjectId);
      conflicts.push({
        id: `conf_dup_sub_${first.classId}_${first.day}_${first.subjectId}`,
        type: 'class_clash',
        severity: 'ERROR',
        day: first.day,
        period: first.period,
        message: `В классе ${cls?.name || 'Класс'} в ${first.day}-й день недели повторяется предмет «${sub?.name || 'Предмет'}» (${entryList.length} раза). Повторение одного предмета в один день запрещено!`,
        affectedEntries: entryList.map((e) => e.id),
        affectedEntityIds: { classIds: [first.classId], subjectIds: [first.subjectId] },
        suggestion: `Перенесите один из уроков предмета «${sub?.name || 'Предмет'}» на другой день.`,
      });
    }
  });

  return conflicts;
};

/**
 * Validates that all classes start strictly at Period 1 and have no gaps/windows during the day.
 */
export const validateClassCompactness = (
  entries: ScheduleEntry[],
  classes: SchoolClass[],
  settings: ScheduleSettings
): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];
  const classMap = new Map(classes.map((c) => [c.id, c]));

  classes.forEach((cls) => {
    settings.workingDays.forEach((day) => {
      const dayEntries = entries
        .filter((e) => e.classId === cls.id && e.day === day)
        .sort((a, b) => a.period - b.period);

      if (dayEntries.length > 0) {
        // Check 1: Must start at Period 1
        if (dayEntries[0].period !== 1) {
          conflicts.push({
            id: `conf_cls_late_start_${cls.id}_${day}`,
            type: 'class_clash',
            severity: 'ERROR',
            day,
            period: 1,
            message: `В классе ${cls.name} в ${day}-й день недели отсутствует 1-й урок (ученики начинают со ${dayEntries[0].period}-го урока). Ученики должны начинать с 1-го урока!`,
            affectedEntries: dayEntries.map((e) => e.id),
            affectedEntityIds: { classIds: [cls.id] },
            suggestion: 'Переместите один из уроков на 1-й урок.',
          });
        }

        // Check 2: No gaps/windows in the middle of the school day
        const maxP = dayEntries[dayEntries.length - 1].period;
        const periodsSet = new Set(dayEntries.map((e) => e.period));
        for (let p = 1; p <= maxP; p++) {
          if (!periodsSet.has(p)) {
            conflicts.push({
              id: `conf_cls_gap_${cls.id}_${day}_${p}`,
              type: 'class_clash',
              severity: 'ERROR',
              day,
              period: p,
              message: `В классе ${cls.name} в ${day}-й день недели обнаружено пустое окно на ${p}-м уроке. Ученики не могут иметь окна между уроками!`,
              affectedEntries: dayEntries.map((e) => e.id),
              affectedEntityIds: { classIds: [cls.id] },
              suggestion: `Заполните ${p}-й урок или сдвиньте последующие уроки.`,
            });
          }
        }
      }
    });
  });

  return conflicts;
};

/**
 * Checks single slot candidate viability quickly against current assigned schedule.
 */
export const isSlotValid = (
  classId: string,
  teacherId: string,
  roomId: string,
  day: number,
  period: number,
  existingEntries: ScheduleEntry[],
  teacher: Teacher | undefined,
  maxDailyLessons = 5,
  subjectId?: string
): boolean => {
  const slotKey = formatSlotKey(day, period);

  // 1. Teacher availability check
  if (teacher?.availability && teacher.availability[slotKey] === false) {
    return false;
  }

  // 2. Strictly forbid repeating the same subject in the same class on the same day
  if (subjectId) {
    const hasSameSubjectToday = existingEntries.some(
      (e) => e.classId === classId && e.day === day && e.subjectId === subjectId
    );
    if (hasSameSubjectToday) {
      return false;
    }
  }

  // 3. Scan existing entries
  let teacherLessonsToday = 0;

  for (const entry of existingEntries) {
    if (entry.day === day) {
      if (entry.teacherId === teacherId) {
        teacherLessonsToday++;
      }
      if (entry.period === period) {
        // Clash: Class already has lesson
        if (entry.classId === classId) return false;
        // Clash: Teacher already busy
        if (entry.teacherId === teacherId) return false;
        // Clash: Room already occupied
        if (roomId && entry.classroomId === roomId) return false;
      }
    }
  }

  // Teacher daily limit check
  if (teacherLessonsToday >= maxDailyLessons) {
    return false;
  }

  return true;
};

export interface PreflightValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates school data before schedule generation begins.
 */
export const preflightValidate = (
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): PreflightValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  const maxTotalSlots = settings.workingDays.reduce(
    (acc, day) => acc + (settings.periodsPerDay[day] || 7),
    0
  );

  // 1. Classes check
  if (classes.length === 0) {
    errors.push('Ошибка: в школе не добавлено ни одного класса.');
  }

  const classNames = new Set<string>();
  classes.forEach((cls) => {
    if (classNames.has(cls.name)) {
      errors.push(`Ошибка: обнаружен дубликат названия класса «${cls.name}».`);
    }
    classNames.add(cls.name);

    // Curriculum load check
    const totalHours = cls.curriculum.reduce((sum, r) => sum + (Number(r.lessonsPerWeek) || 0), 0);
    if (totalHours > maxTotalSlots) {
      errors.push(
        `Невозможно составить расписание: класс «${cls.name}» имеет ${totalHours} уроков в неделю, но доступно максимум ${maxTotalSlots} слотов.`
      );
    }
    if (totalHours === 0) {
      warnings.push(`Предупреждение: у класса «${cls.name}» нет назначенных предметов в учебном плане.`);
    }

    // Check individual curriculum rows
    cls.curriculum.forEach((req) => {
      const sub = subjectMap.get(req.subjectId);
      if (!sub) {
        errors.push(`Ошибка в классе «${cls.name}»: предмет с ID «${req.subjectId}» не существует.`);
      }
      if (!req.teacherId || !teacherMap.has(req.teacherId)) {
        errors.push(
          `Ошибка в классе «${cls.name}»: для предмета «${sub?.name || req.subjectId}» не назначен или не найден преподаватель.`
        );
      }
      if (!req.lessonsPerWeek || req.lessonsPerWeek <= 0) {
        errors.push(
          `Ошибка в классе «${cls.name}»: количество часов для «${sub?.name || req.subjectId}» должно быть больше 0.`
        );
      }
    });
  });

  // 2. Teachers check
  if (teachers.length === 0) {
    errors.push('Ошибка: в школе не добавлено ни одного учителя.');
  }

  const teacherLoadMap = new Map<string, number>();
  classes.forEach((cls) => {
    cls.curriculum.forEach((req) => {
      if (req.teacherId) {
        teacherLoadMap.set(
          req.teacherId,
          (teacherLoadMap.get(req.teacherId) || 0) + (Number(req.lessonsPerWeek) || 0)
        );
      }
    });
  });

  teachers.forEach((t) => {
    const assignedHours = teacherLoadMap.get(t.id) || 0;
    if (assignedHours > maxTotalSlots) {
      errors.push(
        `Невозможно составить расписание: суммарная нагрузка учителя «${t.fullName}» составляет ${assignedHours} ч., что превышает лимит недели (${maxTotalSlots} слотов).`
      );
    }
  });

  // 3. Kelajak darsi teacher clash check
  // Since Kelajak darsi is strictly on Monday Period 1 for ALL classes, one teacher cannot be in 2 classes at once!
  const kelajakTeacherClasses = new Map<string, string[]>();
  classes.forEach((cls) => {
    const kelajakReq = cls.curriculum.find(
      (r) =>
        r.subjectId === 'kelajak-darsi' ||
        r.subjectId.toLowerCase().includes('kelajak') ||
        subjectMap.get(r.subjectId)?.name.toLowerCase().includes('kelajak')
    );
    if (kelajakReq && kelajakReq.teacherId) {
      const list = kelajakTeacherClasses.get(kelajakReq.teacherId) || [];
      list.push(cls.name);
      kelajakTeacherClasses.set(kelajakReq.teacherId, list);
    }
  });

  kelajakTeacherClasses.forEach((classList, teacherId) => {
    if (classList.length > 1) {
      const tch = teacherMap.get(teacherId);
      errors.push(
        `Невозможно составить расписание.\nПричина: Учитель ${tch?.fullName || teacherId} назначен на Kelajak darsi одновременно в нескольких классах:\n` +
          `Понедельник, 1-й урок:\n` +
          classList.map((c) => `• ${c} — Kelajak darsi`).join('\n') +
          `\nОдин учитель не может находиться одновременно в ${classList.length} классах. Назначьте разных учителей на Kelajak darsi.`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export interface ScheduleValidationReport {
  status: 'VALID' | 'INVALID';
  classConflicts: number;
  teacherConflicts: number;
  roomConflicts: number;
  missingLessons: number;
  extraLessons: number;
  wrongWeeklyHours: number;
  kelajakDarsiErrors: number;
  sameDayDuplicateErrors: number;
  teacherAvailabilityErrors: number;
  summaryText: string;
  details: string[];
}

/**
 * Performs strict post-generation verification of the entire schedule.
 */
export const validateSchedule = (
  entries: ScheduleEntry[],
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): ScheduleValidationReport => {
  const details: string[] = [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // 1. Class conflicts (more than 1 lesson per slot for a class)
  const classSlotMap = new Map<string, ScheduleEntry[]>();
  // 2. Teacher conflicts (more than 1 lesson per slot for a teacher)
  const teacherSlotMap = new Map<string, ScheduleEntry[]>();
  // 3. Room conflicts
  const roomSlotMap = new Map<string, ScheduleEntry[]>();
  // 4. Same-day duplicate subjects
  const classDaySubMap = new Map<string, ScheduleEntry[]>();
  // 5. Teacher availability check
  let teacherAvailabilityErrors = 0;

  for (const entry of entries) {
    const slotKey = `${entry.day}-${entry.period}`;
    const clsKey = `${entry.classId}_${slotKey}`;
    const tchKey = `${entry.teacherId}_${slotKey}`;
    const rmKey = `${entry.classroomId}_${slotKey}`;
    const daySubKey = `${entry.classId}_${entry.day}_${entry.subjectId}`;

    if (!classSlotMap.has(clsKey)) classSlotMap.set(clsKey, []);
    classSlotMap.get(clsKey)!.push(entry);

    if (!teacherSlotMap.has(tchKey)) teacherSlotMap.set(tchKey, []);
    teacherSlotMap.get(tchKey)!.push(entry);

    if (entry.classroomId) {
      if (!roomSlotMap.has(rmKey)) roomSlotMap.set(rmKey, []);
      roomSlotMap.get(rmKey)!.push(entry);
    }

    if (!classDaySubMap.has(daySubKey)) classDaySubMap.set(daySubKey, []);
    classDaySubMap.get(daySubKey)!.push(entry);

    const tch = teacherMap.get(entry.teacherId);
    if (tch?.availability && tch.availability[slotKey] === false) {
      teacherAvailabilityErrors++;
      details.push(
        `Преподаватель ${tch.fullName} назначен на недоступный слот (День ${entry.day}, Урок ${entry.period}).`
      );
    }
  }

  let classConflicts = 0;
  classSlotMap.forEach((list, key) => {
    if (list.length > 1) {
      classConflicts++;
      const cls = classMap.get(list[0].classId);
      details.push(
        `Конфликт класса: у ${cls?.name || 'класса'} одновременно ${list.length} уроков (День ${list[0].day}, Урок ${list[0].period}).`
      );
    }
  });

  let teacherConflicts = 0;
  teacherSlotMap.forEach((list, key) => {
    if (list.length > 1) {
      teacherConflicts++;
      const tch = teacherMap.get(list[0].teacherId);
      details.push(
        `Конфликт учителя: ${tch?.fullName || 'Преподаватель'} назначен одновременно в ${list.length} классах (День ${list[0].day}, Урок ${list[0].period}).`
      );
    }
  });

  let roomConflicts = 0;
  roomSlotMap.forEach((list, key) => {
    if (list.length > 1) {
      roomConflicts++;
      const rm = roomMap.get(list[0].classroomId);
      details.push(
        `Конфликт кабинета: «${rm?.name || 'Кабинет'}» занят одновременно ${list.length} классами (День ${list[0].day}, Урок ${list[0].period}).`
      );
    }
  });

  let sameDayDuplicateErrors = 0;
  classDaySubMap.forEach((list) => {
    if (list.length > 1) {
      sameDayDuplicateErrors++;
      const cls = classMap.get(list[0].classId);
      const sub = subjectMap.get(list[0].subjectId);
      details.push(
        `Повтор предмета: класс «${cls?.name || ''}» имеет ${list.length} урока предмета «${sub?.name || ''}» в ${list[0].day}-й день недели.`
      );
    }
  });

  // 6. Kelajak darsi check (Strictly Monday Period 1)
  let kelajakDarsiErrors = 0;
  classes.forEach((cls) => {
    const hasKelajak = cls.curriculum.some(
      (r) =>
        r.subjectId === 'kelajak-darsi' ||
        r.subjectId.toLowerCase().includes('kelajak') ||
        subjectMap.get(r.subjectId)?.name.toLowerCase().includes('kelajak')
    );
    if (hasKelajak) {
      const mon1Entry = entries.find(
        (e) =>
          e.classId === cls.id &&
          e.day === 1 &&
          e.period === 1 &&
          (e.subjectId === 'kelajak-darsi' ||
            e.subjectId.toLowerCase().includes('kelajak') ||
            subjectMap.get(e.subjectId)?.name.toLowerCase().includes('kelajak'))
      );
      if (!mon1Entry) {
        kelajakDarsiErrors++;
        details.push(`Kelajak darsi: класс «${cls.name}» не имеет Kelajak darsi в Понедельник 1-м уроком.`);
      }
    }
  });

  // 7. Curriculum hours exact matching check
  let wrongWeeklyHours = 0;
  let missingLessons = 0;
  let extraLessons = 0;

  classes.forEach((cls) => {
    const actualSubjectCounts = new Map<string, number>();
    entries
      .filter((e) => e.classId === cls.id)
      .forEach((e) => {
        actualSubjectCounts.set(e.subjectId, (actualSubjectCounts.get(e.subjectId) || 0) + 1);
      });

    const expectedSubjectCounts = new Map<string, number>();
    cls.curriculum.forEach((r) => {
      expectedSubjectCounts.set(
        r.subjectId,
        (expectedSubjectCounts.get(r.subjectId) || 0) + (Number(r.lessonsPerWeek) || 0)
      );
    });

    // Check missing or mismatch in expected
    expectedSubjectCounts.forEach((expected, subId) => {
      const actual = actualSubjectCounts.get(subId) || 0;
      const sub = subjectMap.get(subId);
      if (actual !== expected) {
        wrongWeeklyHours++;
        if (actual < expected) {
          missingLessons += expected - actual;
          details.push(
            `Недостаток часов: класс «${cls.name}», предмет «${sub?.name || subId}» — требуется ${expected} ч., а назначено ${actual} ч.`
          );
        } else {
          extraLessons += actual - expected;
          details.push(
            `Избыток часов: класс «${cls.name}», предмет «${sub?.name || subId}» — требуется ${expected} ч., а назначено ${actual} ч.`
          );
        }
      }
    });

    // Check extra subjects not in curriculum
    actualSubjectCounts.forEach((actual, subId) => {
      if (!expectedSubjectCounts.has(subId)) {
        extraLessons += actual;
        wrongWeeklyHours++;
        const sub = subjectMap.get(subId);
        details.push(
          `Лишний предмет: класс «${cls.name}» имеет ${actual} ч. предмета «${sub?.name || subId}», которого нет в учебном плане.`
        );
      }
    });
  });

  // 8. Class Compactness check (Starts at Period 1, no gaps/windows for students)
  const compactnessConflicts = validateClassCompactness(entries, classes, settings);
  const classCompactnessErrors = compactnessConflicts.length;
  compactnessConflicts.forEach((c) => details.push(c.message));

  const isInvalid =
    classConflicts > 0 ||
    teacherConflicts > 0 ||
    roomConflicts > 0 ||
    missingLessons > 0 ||
    extraLessons > 0 ||
    wrongWeeklyHours > 0 ||
    kelajakDarsiErrors > 0 ||
    sameDayDuplicateErrors > 0 ||
    teacherAvailabilityErrors > 0 ||
    classCompactnessErrors > 0;

  const status: 'VALID' | 'INVALID' = isInvalid ? 'INVALID' : 'VALID';

  const summaryText = [
    '====================================',
    '📋 SCHEDULE VALIDATION REPORT',
    '====================================',
    `Classes conflicts: ${classConflicts}`,
    `Teacher conflicts: ${teacherConflicts}`,
    `Room conflicts: ${roomConflicts}`,
    `Missing lessons: ${missingLessons}`,
    `Extra lessons: ${extraLessons}`,
    `Wrong weekly hours: ${wrongWeeklyHours}`,
    `Kelajak darsi errors: ${kelajakDarsiErrors}`,
    `Same-day duplicate errors: ${sameDayDuplicateErrors}`,
    `Teacher availability errors: ${teacherAvailabilityErrors}`,
    `Class gaps / late start errors: ${classCompactnessErrors}`,
    '',
    `STATUS: ${status}`,
    '====================================',
  ].join('\n');

  return {
    status,
    classConflicts,
    teacherConflicts,
    roomConflicts,
    missingLessons,
    extraLessons,
    wrongWeeklyHours,
    kelajakDarsiErrors,
    sameDayDuplicateErrors,
    teacherAvailabilityErrors,
    summaryText,
    details,
  };
};
