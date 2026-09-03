import {
  Classroom,
  ScheduleSettings,
  SchoolClass,
  Subject,
  Teacher,
} from '../types';
import { ValidationError, ValidationResult } from '../types/constraints';
import { formatSlotKey } from '../utils/timeUtils';

export const validateSchoolData = (
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // Calculate total school time slots in week
  let totalTimeSlotsPerWeek = 0;
  settings.workingDays.forEach((day) => {
    totalTimeSlotsPerWeek += settings.periodsPerDay[day] || 0;
  });

  if (totalTimeSlotsPerWeek === 0) {
    errors.push({
      id: 'err_no_slots',
      code: 'NO_TIME_SLOTS',
      severity: 'FATAL',
      title: 'Не настроены временные слоты',
      message: 'В настройках не указаны рабочие дни или количество уроков в день.',
      suggestion: 'Перейдите в «Настройки» и укажите рабочие дни и количество уроков.',
    });
  }

  // Check 1: Empty lists
  if (classes.length === 0) {
    errors.push({
      id: 'err_no_classes',
      code: 'NO_CLASSES',
      severity: 'FATAL',
      title: 'Классы не добавлены',
      message: 'В системе нет ни одного класса.',
      suggestion: 'Добавьте хотя бы один класс с учебным планом в разделе «Классы».',
    });
  }

  if (teachers.length === 0) {
    errors.push({
      id: 'err_no_teachers',
      code: 'NO_TEACHERS',
      severity: 'FATAL',
      title: 'Учителя не добавлены',
      message: 'В системе нет ни одного учителя.',
      suggestion: 'Добавьте преподавателей в разделе «Учителя».',
    });
  }

  if (subjects.length === 0) {
    errors.push({
      id: 'err_no_subjects',
      code: 'NO_SUBJECTS',
      severity: 'FATAL',
      title: 'Предметы не добавлены',
      message: 'В системе нет предметов.',
      suggestion: 'Добавьте предметы в разделе «Предметы».',
    });
  }

  // Accumulate loads
  let totalRequiredLessons = 0;
  const teacherAssignedLessons: Record<string, number> = {};
  const requiredRoomTypeHours: Record<string, number> = {};

  teachers.forEach((t) => {
    teacherAssignedLessons[t.id] = 0;
  });

  // Check 2: Classes curriculum
  classes.forEach((cls) => {
    let classWeeklyLessons = 0;

    if (!cls.curriculum || cls.curriculum.length === 0) {
      warnings.push({
        id: `warn_empty_curr_${cls.id}`,
        code: 'CLASS_NO_CURRICULUM',
        severity: 'WARNING',
        title: `Пустой учебный план у класса ${cls.name}`,
        message: `Для класса ${cls.name} не задан список предметов.`,
        affectedEntityIds: { classIds: [cls.id] },
        suggestion: `Перейдите в карточку класса ${cls.name} и добавьте предметы и часы.`,
      });
      return;
    }

    cls.curriculum.forEach((req) => {
      const subject = subjectMap.get(req.subjectId);
      if (!subject) {
        errors.push({
          id: `err_sub_not_found_${cls.id}_${req.subjectId}`,
          code: 'SUBJECT_NOT_FOUND',
          severity: 'FATAL',
          title: `Несуществующий предмет в классе ${cls.name}`,
          message: `В учебном плане класса ${cls.name} указан предмет с ID ${req.subjectId}, которого нет в списке предметов.`,
          affectedEntityIds: { classIds: [cls.id], subjectIds: [req.subjectId] },
          suggestion: 'Удалите или переназначьте предмет в учебном плане класса.',
        });
        return;
      }

      if (req.lessonsPerWeek <= 0) {
        return;
      }

      classWeeklyLessons += req.lessonsPerWeek;
      totalRequiredLessons += req.lessonsPerWeek;

      // Track room requirements
      const roomType = subject.requiredRoomType || 'general';
      if (roomType !== 'general') {
        requiredRoomTypeHours[roomType] = (requiredRoomTypeHours[roomType] || 0) + req.lessonsPerWeek;
      }

      // Check teacher assignment
      let assignedTeacher = req.teacherId ? teacherMap.get(req.teacherId) : undefined;
      
      if (!assignedTeacher) {
        // Try to auto-resolve by subject match
        const eligible = teachers.filter((t) => t.subjectIds.includes(req.subjectId));
        if (eligible.length > 0) {
          assignedTeacher = eligible[0];
          teacherAssignedLessons[assignedTeacher.id] = (teacherAssignedLessons[assignedTeacher.id] || 0) + req.lessonsPerWeek;
        } else {
          errors.push({
            id: `err_no_eligible_teacher_${cls.id}_${subject.id}`,
            code: 'NO_ELIGIBLE_TEACHER',
            severity: 'FATAL',
            title: `Нет учителя по предмету «${subject.name}» (${cls.name})`,
            message: `Для класса ${cls.name} требуется ${req.lessonsPerWeek} уроков «${subject.name}», но ни один учитель не ведет этот предмет.`,
            affectedEntityIds: { classIds: [cls.id], subjectIds: [subject.id] },
            suggestion: `В разделе «Учителя» выберите учителя и отметьте галочкой предмет «${subject.name}».`,
          });
        }
      } else {
        teacherAssignedLessons[assignedTeacher.id] = (teacherAssignedLessons[assignedTeacher.id] || 0) + req.lessonsPerWeek;
      }
    });

    // Check if class weekly lessons exceed available weekly slots
    if (classWeeklyLessons > totalTimeSlotsPerWeek) {
      errors.push({
        id: `err_class_overload_${cls.id}`,
        code: 'CLASS_SLOTS_EXCEEDED',
        severity: 'FATAL',
        title: `Превышена недельная сетка у класса ${cls.name}`,
        message: `Классу ${cls.name} требуется ${classWeeklyLessons} уроков в неделю, однако в расписании доступно только ${totalTimeSlotsPerWeek} слотов.`,
        affectedEntityIds: { classIds: [cls.id] },
        suggestion: `Уменьшите количество часов в учебном плане класса или увеличьте количество уроков в день в настройках.`,
      });
    }
  });

  // Check 3: Teacher capacities and availability
  let totalAvailableTeacherCapacity = 0;

  teachers.forEach((t) => {
    totalAvailableTeacherCapacity += t.weeklyLoad || 0;
    const assigned = teacherAssignedLessons[t.id] || 0;

    // Check weekly load vs assigned
    if (assigned > t.weeklyLoad) {
      warnings.push({
        id: `warn_tch_overload_${t.id}`,
        code: 'TEACHER_LOAD_EXCEEDED',
        severity: 'WARNING',
        title: `Превышение базовой ставки у ${t.fullName}`,
        message: `Учителю назначено ${assigned} уроков в неделю при базовой ставке ${t.weeklyLoad} уроков. Алгоритм учтет фактическую нагрузку (${assigned} уроков).`,
        affectedEntityIds: { teacherIds: [t.id] },
        suggestion: `В карточке учителя можно обновить недельную нагрузку до ${assigned} уроков.`,
      });
    }

    // Count available slots for teacher in availability matrix
    let availableSlotCount = 0;
    settings.workingDays.forEach((day) => {
      const maxP = settings.periodsPerDay[day] || 0;
      for (let p = 1; p <= maxP; p++) {
        const key = formatSlotKey(day, p);
        if (t.availability[key] !== false) {
          availableSlotCount++;
        }
      }
    });

    if (availableSlotCount < assigned) {
      errors.push({
        id: `err_tch_not_enough_avail_${t.id}`,
        code: 'TEACHER_INSUFFICIENT_AVAILABILITY',
        severity: 'FATAL',
        title: `Недостаточно доступных часов у ${t.fullName}`,
        message: `Учителю назначено ${assigned} уроков, но в матрице доступности отмечено только ${availableSlotCount} доступных слотов. Не хватает ${assigned - availableSlotCount} слотов.`,
        affectedEntityIds: { teacherIds: [t.id] },
        suggestion: `Откройте карточку учителя ${t.fullName} и разрешите дополнительные дни/часы в матрице доступности.`,
      });
    }

    // Check max lessons per day vs assigned
    const maxPossibleLessons = (t.maxLessonsPerDay || 5) * settings.workingDays.length;
    if (assigned > maxPossibleLessons) {
      errors.push({
        id: `err_tch_daily_max_insufficient_${t.id}`,
        code: 'TEACHER_DAILY_LIMIT_TOO_LOW',
        severity: 'FATAL',
        title: `Низкий дневной лимит у ${t.fullName}`,
        message: `При ограничении в ${t.maxLessonsPerDay} уроков в день за ${settings.workingDays.length} дней учитель может провести максимум ${maxPossibleLessons} уроков, а назначено ${assigned}.`,
        affectedEntityIds: { teacherIds: [t.id] },
        suggestion: `Увеличьте параметр «Максимум уроков в день» у преподавателя ${t.fullName}.`,
      });
    }
  });

  // Check 4: Specialized rooms sufficiency
  let totalAvailableClassroomSlots = 0;
  const roomCountByType: Record<string, number> = {};
  rooms.forEach((r) => {
    roomCountByType[r.type] = (roomCountByType[r.type] || 0) + 1;
    totalAvailableClassroomSlots += totalTimeSlotsPerWeek;
  });

  Object.entries(requiredRoomTypeHours).forEach(([rType, requiredHours]) => {
    const availableRooms = roomCountByType[rType] || 0;
    const maxCapacity = availableRooms * totalTimeSlotsPerWeek;

    if (availableRooms === 0) {
      warnings.push({
        id: `warn_no_room_type_${rType}`,
        code: 'NO_ROOM_OF_TYPE',
        severity: 'WARNING',
        title: `Отсутствуют кабинеты типа «${rType}»`,
        message: `Предметы запрашивают ${requiredHours} ч. в кабинетах типа «${rType}», но в школе нет таких специализированных кабинетов. Алгоритм автоматически использует обычные учебные кабинеты.`,
        affectedEntityIds: { roomIds: [] },
        suggestion: `В разделе «Предметы» можно переключить тип кабинета на «Любой общий кабинет».`,
      });
    } else if (requiredHours > maxCapacity) {
      errors.push({
        id: `err_room_type_capacity_${rType}`,
        code: 'ROOM_CAPACITY_EXCEEDED',
        severity: 'FATAL',
        title: `Дефицит кабинетов типа «${rType}»`,
        message: `Требуется ${requiredHours} часов в кабинетах «${rType}», но доступно максимум ${maxCapacity} часов (${availableRooms} каб. × ${totalTimeSlotsPerWeek} слотов).`,
        suggestion: `Добавьте еще один кабинет данного типа или сократите часы предметов, требующих этот кабинет.`,
      });
    }
  });

  // Check 5: General warnings
  if (rooms.length > 0 && rooms.length < classes.length) {
    warnings.push({
      id: 'warn_room_deficit',
      code: 'ROOM_DEFICIT',
      severity: 'WARNING',
      title: 'Количество кабинетов меньше количества классов',
      message: `В школе ${classes.length} классов, но всего ${rooms.length} кабинетов. Если все классы учатся в одну смену, могут возникнуть сложности с размещением.`,
      suggestion: 'Рекомендуется добавить дополнительные кабинеты.',
    });
  }

  // Informational metrics
  info.push({
    id: 'info_summary',
    code: 'SUMMARY',
    severity: 'INFO',
    title: 'Сводка нагрузки',
    message: `Всего уроков: ${totalRequiredLessons}. Доступная ставка учителей: ${totalAvailableTeacherCapacity} ч. Кабинетный фонд: ${rooms.length} каб.`,
  });

  const hasFatal = errors.some((e) => e.severity === 'FATAL');

  return {
    isValid: errors.length === 0,
    canProceed: !hasFatal,
    errors,
    warnings,
    info,
    summary: {
      totalClasses: classes.length,
      totalTeachers: teachers.length,
      totalRooms: rooms.length,
      totalRequiredLessons,
      totalAvailableTeacherCapacity,
      totalAvailableClassroomSlots,
      totalTimeSlotsPerWeek,
    },
  };
};
