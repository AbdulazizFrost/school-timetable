import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { ScheduleEntry } from '../types/schedule';
import { checkHardConstraints, preflightValidate, validateSchedule } from './constraints';
import { calculateScheduleScore } from './scoring';
import { CSPProblem, LessonVariable, SlotValue, SolverOptions, SolverResult } from './types';
import { formatSlotKey } from '../utils/timeUtils';

/**
 * Builds all lesson variables from classes curriculum.
 */
export const buildCSPProblem = (
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): CSPProblem => {
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const timeSlots: Array<{ day: number; period: number }> = [];
  settings.workingDays.forEach((day) => {
    const maxPeriod = settings.periodsPerDay[day] || 7;
    for (let p = 1; p <= maxPeriod; p++) {
      timeSlots.push({ day, period: p });
    }
  });

  const variables: LessonVariable[] = [];

  // Check if classes have curricula defined
  const hasClassCurriculum = classes.some((c) => c.curriculum && c.curriculum.length > 0);

  if (hasClassCurriculum) {
    classes.forEach((cls) => {
      cls.curriculum.forEach((req) => {
        const sub = subjectMap.get(req.subjectId);
        if (!sub || req.lessonsPerWeek <= 0) return;

        let teacherId = req.teacherId;
        if (!teacherId || !teacherMap.has(teacherId)) {
          const eligible = teachers.filter((t) => t.subjectIds.includes(req.subjectId));
          if (eligible.length > 0) {
            teacherId = eligible[0].id;
          }
        }

        if (!teacherId) return;

        for (let i = 0; i < req.lessonsPerWeek; i++) {
          variables.push({
            id: `${cls.id}_${req.subjectId}_${teacherId}_${i}`,
            classId: cls.id,
            subjectId: req.subjectId,
            teacherId: teacherId,
            requiredRoomType: sub.requiredRoomType,
            customRoomId: req.customRoomId,
            allowDoubleLesson: req.allowDoubleLesson ?? sub.allowDoubleLesson,
            isDifficult: sub.difficulty === 'high',
            difficultyScore: sub.difficultyScore || 3,
            lessonsPerWeek: req.lessonsPerWeek,
            instanceIndex: i,
            preferredDays: req.preferredDays,
            preferredPeriods: req.preferredPeriods || sub.preferredPeriods,
          });
        }
      });
    });
  } else {
    // Fallback: build from teacher allocations
    teachers.forEach((t) => {
      if (!t.classAllocations) return;
      t.classAllocations.forEach((alloc) => {
        const cls = classMap.get(alloc.classId);
        const sub = subjectMap.get(alloc.subjectId);
        const count = Number(alloc.lessonsPerWeek) || 0;
        if (!cls || !sub || count <= 0) return;

        for (let i = 0; i < count; i++) {
          variables.push({
            id: `${cls.id}_${sub.id}_${t.id}_${i}`,
            classId: cls.id,
            subjectId: sub.id,
            teacherId: t.id,
            requiredRoomType: sub.requiredRoomType,
            customRoomId: undefined,
            allowDoubleLesson: sub.allowDoubleLesson,
            isDifficult: sub.difficulty === 'high',
            difficultyScore: sub.difficultyScore || 3,
            lessonsPerWeek: count,
            instanceIndex: i,
            preferredDays: undefined,
            preferredPeriods: sub.preferredPeriods,
          });
        }
      });
    });
  }

  return {
    variables,
    teachers: teacherMap,
    subjects: subjectMap,
    classes: classMap,
    rooms: roomMap,
    allRooms: rooms,
    workingDays: settings.workingDays,
    periodsPerDay: settings.periodsPerDay,
    timeSlots,
  };
};

/**
 * Computes domain of candidate slot values for a variable.
 */
const getVariableDomain = (
  v: LessonVariable,
  problem: CSPProblem,
  settings: ScheduleSettings,
  allowEmergencySaturday = false
): SlotValue[] => {
  const teacher = problem.teachers.get(v.teacherId);
  const cls = problem.classes.get(v.classId);
  let eligibleRooms: Classroom[] = [];

  if (v.customRoomId && problem.rooms.has(v.customRoomId)) {
    eligibleRooms = [problem.rooms.get(v.customRoomId)!];
  } else if (v.requiredRoomType && v.requiredRoomType !== 'general') {
    eligibleRooms = problem.allRooms.filter((r) => r.type === v.requiredRoomType);
    if (eligibleRooms.length === 0) {
      if (cls?.homeRoomId && problem.rooms.has(cls.homeRoomId)) {
        eligibleRooms = [problem.rooms.get(cls.homeRoomId)!];
      } else {
        const gen = problem.allRooms.filter((r) => r.type === 'general');
        const cIdx = Array.from(problem.classes.keys()).indexOf(v.classId);
        eligibleRooms = gen.length > 0 ? [gen[cIdx % gen.length]] : problem.allRooms.slice(0, 1);
      }
    }
  } else if (cls?.homeRoomId && problem.rooms.has(cls.homeRoomId)) {
    eligibleRooms = [problem.rooms.get(cls.homeRoomId)!];
  } else {
    const gen = problem.allRooms.filter((r) => r.type === 'general');
    const cIdx = Math.max(0, Array.from(problem.classes.keys()).indexOf(v.classId));
    eligibleRooms = gen.length > 0 ? [gen[cIdx % gen.length]] : problem.allRooms.slice(0, 1);
  }

  if (eligibleRooms.length === 0) {
    eligibleRooms = problem.allRooms.slice(0, 1);
  }

  const sub = problem.subjects.get(v.subjectId);
  const isKelajak = sub?.name.toLowerCase().includes('kelajak') || sub?.name.toLowerCase().includes('kela') || v.subjectId.toLowerCase().includes('kela');
  const classHasKelajak = problem.variables.some(
    (vOther) =>
      vOther.classId === v.classId &&
      (problem.subjects.get(vOther.subjectId)?.name.toLowerCase().includes('kela') ||
        vOther.subjectId.toLowerCase().includes('kela'))
  );

  const domain: SlotValue[] = [];

  for (const slot of problem.timeSlots) {
    const slotKey = formatSlotKey(slot.day, slot.period);

    // Rule: Kelajak soati strictly on Monday 1st period (Day 1, Period 1)
    if (isKelajak) {
      if (!(slot.day === 1 && slot.period === 1)) {
        continue;
      }
    } else if (classHasKelajak && slot.day === 1 && slot.period === 1) {
      // Reserve Monday 1st period for Kelajak soati
      continue;
    }

    if (teacher?.availability && teacher.availability[slotKey] === false) {
      if (!(allowEmergencySaturday && slot.day === 6)) {
        continue;
      }
    }

    for (const room of eligibleRooms) {
      if (room.availableSlots && room.availableSlots[slotKey] === false) {
        continue;
      }
      domain.push({
        day: slot.day,
        period: slot.period,
        roomId: room.id,
      });
    }
  }

  return domain;
};

/**
 * Soft score evaluation for candidate slot
 */
const evaluateCandidatePenalty = (
  v: LessonVariable,
  slot: SlotValue,
  classDaySubjectCount: Map<string, number>,
  teacherDayCount: number[][],
  teacherIdx: number,
  sub: Subject | undefined,
  teacherOccupied?: boolean[][][]
): number => {
  let penalty = 0;

  // 1. Teacher Window Minimization / Adjacent Lesson Bonus:
  // Strictly cluster teacher's lessons together on the same day to prevent windows/gaps.
  if (teacherOccupied && teacherOccupied[teacherIdx] && teacherOccupied[teacherIdx][slot.day]) {
    const dayMask = teacherOccupied[teacherIdx][slot.day];
    const assignedPeriods: number[] = [];
    for (let p = 1; p <= 7; p++) {
      if (dayMask[p]) assignedPeriods.push(p);
    }

    if (assignedPeriods.length > 0) {
      const isAdjacent = assignedPeriods.some((p) => Math.abs(p - slot.period) === 1);
      if (isAdjacent) {
        penalty -= 800; // Overwhelming bonus for consecutive lessons without windows
      } else {
        const minP = Math.min(...assignedPeriods);
        const maxP = Math.max(...assignedPeriods);
        const gap = slot.period < minP ? (minP - slot.period - 1) : (slot.period > maxP ? (slot.period - maxP - 1) : 0);
        if (gap > 0) {
          penalty += gap * 500; // Extreme penalty for creating gaps for the teacher
        }
      }
    }
  }

  // 2. Preferred periods priority (Matematika & Nutq o'stirish strictly on 1st or 2nd period)
  const isMatOrNutq = sub?.name.toLowerCase().includes('mat') || sub?.name.toLowerCase().includes('nutq');
  const targetPreferred = v.preferredPeriods || sub?.preferredPeriods || (isMatOrNutq ? [1, 2] : undefined);

  if (targetPreferred && targetPreferred.length > 0) {
    if (targetPreferred.includes(slot.period)) {
      penalty -= 150; // Maximum priority for periods 1 and 2
    } else {
      penalty += (slot.period - 2) * 80; // Heavy penalty for later periods
    }
  } else if (v.isDifficult) {
    if (slot.period >= 5) penalty += 25;
    else if (slot.period >= 1 && slot.period <= 3) penalty -= 15;
  }

  // 3. Spread subject across days for class
  const classDaySubKey = `${v.classId}_${slot.day}_${v.subjectId}`;
  const alreadyInDay = classDaySubjectCount.get(classDaySubKey) || 0;
  if (alreadyInDay > 0) {
    penalty += 15;
  }

  // 4. Teacher daily workload distribution
  const lessonsToday = teacherDayCount[teacherIdx]?.[slot.day] || 0;
  penalty += lessonsToday * 3;

  // 5. Compact schedule from period 1 (strictly minimize windows/gaps)
  penalty += (slot.period - 1) * 2;

  return penalty;
};

/**
 * Compaction post-processor:
 * Re-packs lessons of each class on each day so they strictly start on period 1 and occupy consecutive slots 1..K.
 */
export const compactScheduleEntries = (
  entries: ScheduleEntry[],
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): ScheduleEntry[] => {
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  let currentEntries = [...entries];

  const tryCompactClassDay = (
    classId: string,
    day: number,
    allEntries: ScheduleEntry[]
  ): ScheduleEntry[] | null => {
    const classDayEntries = allEntries
      .filter((e) => e.classId === classId && e.day === day)
      .sort((a, b) => a.period - b.period);

    const N = classDayEntries.length;
    if (N === 0) return allEntries;

    const currentPeriods = classDayEntries.map((e) => e.period);
    const isAlreadySequential = currentPeriods.every((p, idx) => p === idx + 1);
    if (isAlreadySequential) return allEntries;

    const otherEntries = allEntries.filter(
      (e) => !(e.classId === classId && e.day === day)
    );

    const targetPeriods = Array.from({ length: N }, (_, i) => i + 1);

    const result: ScheduleEntry[] = [];
    const usedPeriods = new Set<number>();

    const match = (idx: number): boolean => {
      if (idx === classDayEntries.length) return true;
      const entry = classDayEntries[idx];
      const teacher = teacherMap.get(entry.teacherId);
      const isKelajak = entry.subjectId === 'kelajak-darsi' || entry.subjectId.toLowerCase().includes('kelajak');

      for (const p of targetPeriods) {
        if (usedPeriods.has(p)) continue;
        if (isKelajak && !(day === 1 && p === 1)) continue;

        // Check teacher availability
        if (teacher?.availability && teacher.availability[`${day}-${p}`] === false) {
          continue;
        }

        // Check teacher clash with other classes
        const tchClash = otherEntries.some(
          (o) => o.teacherId === entry.teacherId && o.day === day && o.period === p
        );
        if (tchClash) continue;

        // Check room clash
        if (entry.classroomId) {
          const rmClash = otherEntries.some(
            (o) => o.classroomId === entry.classroomId && o.day === day && o.period === p
          );
          if (rmClash) continue;
        }

        usedPeriods.add(p);
        result.push({ ...entry, period: p });

        if (match(idx + 1)) return true;

        usedPeriods.delete(p);
        result.pop();
      }
      return false;
    };

    if (match(0)) {
      return [...otherEntries, ...result];
    }
    return null;
  };

  // Pass 1: Direct intra-day compaction
  for (const cls of classes) {
    for (const day of settings.workingDays) {
      const compacted = tryCompactClassDay(cls.id, day, currentEntries);
      if (compacted) {
        currentEntries = compacted;
      }
    }
  }

  // Pass 2: Intra-class day swap repair if any day still misses period 1 or has holes
  for (let pass = 0; pass < 3; pass++) {
    for (const cls of classes) {
      for (const day of settings.workingDays) {
        const dayEntries = currentEntries
          .filter((e) => e.classId === cls.id && e.day === day)
          .sort((a, b) => a.period - b.period);

        if (dayEntries.length === 0) continue;

        const isSequential = dayEntries.every((e, idx) => e.period === idx + 1);
        if (!isSequential) {
          // Find a lesson from another day of this class whose teacher is open at (day, 1)
          const otherDayEntries = currentEntries.filter(
            (e) =>
              e.classId === cls.id &&
              e.day !== day &&
              !e.isLocked &&
              e.subjectId !== 'kelajak-darsi' &&
              !e.subjectId.toLowerCase().includes('kelajak')
          );

          for (const otherEntry of otherDayEntries) {
            const tchOther = teacherMap.get(otherEntry.teacherId);
            if (tchOther?.availability && tchOther.availability[`${day}-1`] === false) {
              continue;
            }

            // Check if swapping with a lesson in dayEntries creates duplicate subjects in either day
            for (const dayEntry of dayEntries) {
              if (dayEntry.isLocked || dayEntry.subjectId === 'kelajak-darsi' || dayEntry.subjectId.toLowerCase().includes('kelajak')) {
                continue;
              }

              // Check same-day duplicate constraints
              const hasSubOnTargetDay = currentEntries.some(
                (e) => e.classId === cls.id && e.day === day && e.subjectId === otherEntry.subjectId && e.id !== dayEntry.id
              );
              const hasSubOnSourceDay = currentEntries.some(
                (e) => e.classId === cls.id && e.day === otherEntry.day && e.subjectId === dayEntry.subjectId && e.id !== otherEntry.id
              );
              if (hasSubOnTargetDay || hasSubOnSourceDay) continue;

              // Candidate swap
              const swapped = currentEntries.map((e) => {
                if (e.id === otherEntry.id) return { ...e, day, period: dayEntry.period };
                if (e.id === dayEntry.id) return { ...e, day: otherEntry.day, period: otherEntry.period };
                return e;
              });

              // Try compacting both days
              const res1 = tryCompactClassDay(cls.id, day, swapped);
              if (res1) {
                const res2 = tryCompactClassDay(cls.id, otherEntry.day, res1);
                if (res2) {
                  const check = checkHardConstraints(res2, teachers, classes, subjects, rooms, settings);
                  if (!check.hasConflicts) {
                    currentEntries = res2;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Pass 3: Eliminate Teacher Windows (Gaps) by finding valid intra-class swaps on the same day
  currentEntries = compactTeacherWindows(currentEntries, teachers, classes, subjects, rooms, settings);

  return currentEntries;
};

/**
 * Teacher Window Elimination Post-Processor:
 * Eliminates empty windows/gaps for teachers by finding valid intra-class swaps on the same day.
 * Strictly preserves:
 * 1. Class compactness (every class starts at period 1 with 0 holes).
 * 2. Kelajak darsi on Monday period 1.
 * 3. Teacher availability and 0 teacher/room collisions.
 * 4. Strictly 0 duplicate subjects in any class in a single day.
 */
export const compactTeacherWindows = (
  entries: ScheduleEntry[],
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): ScheduleEntry[] => {
  let current = [...entries];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const calculateTotalTeacherGaps = (allEntries: ScheduleEntry[]): number => {
    let gaps = 0;
    teachers.forEach((tch) => {
      settings.workingDays.forEach((day) => {
        const tchDay = allEntries
          .filter((e) => e.teacherId === tch.id && e.day === day)
          .map((e) => e.period)
          .sort((a, b) => a - b);
        if (tchDay.length >= 2) {
          const span = tchDay[tchDay.length - 1] - tchDay[0] + 1;
          const g = span - tchDay.length;
          if (g > 0) gaps += g;
        }
      });
    });
    return gaps;
  };

  let bestGaps = calculateTotalTeacherGaps(current);
  if (bestGaps === 0) return current;

  for (let cycle = 0; cycle < 2; cycle++) {
    let improvedInCycle = false;

    // 1. Group-level contiguous compaction (permute contiguous blocks of teachers in each class day)
    for (const cls of classes) {
      for (const day of settings.workingDays) {
        const dayLessons = current
          .filter((e) => e.classId === cls.id && e.day === day)
          .sort((a, b) => a.period - b.period);

        const K = dayLessons.length;
        if (K <= 1) continue;

        const otherEntries = current.filter((e) => !(e.classId === cls.id && e.day === day));

        const teacherGroups = new Map<string, ScheduleEntry[]>();
        dayLessons.forEach((e) => {
          if (!teacherGroups.has(e.teacherId)) teacherGroups.set(e.teacherId, []);
          teacherGroups.get(e.teacherId)!.push(e);
        });

        const groupList = Array.from(teacherGroups.values());
        if (groupList.length <= 1) continue;

        const permute = (arr: ScheduleEntry[][]): ScheduleEntry[][][] => {
          if (arr.length <= 1) return [arr];
          const result: ScheduleEntry[][][] = [];
          for (let i = 0; i < arr.length; i++) {
            const currentGroup = arr[i];
            const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
            const subPerms = permute(remaining);
            for (const sp of subPerms) {
              result.push([currentGroup, ...sp]);
              if (result.length >= 24) return result;
            }
          }
          return result;
        };

        const orderings: ScheduleEntry[][][] = permute(groupList);

        for (const grpOrder of orderings) {
          let p = 1;
          const candidateDayLessons: ScheduleEntry[] = [];
          let validOrder = true;

          for (const grp of grpOrder) {
            for (const item of grp) {
              const targetPeriod = p++;
              if (item.subjectId === 'kelajak-darsi' && !(day === 1 && targetPeriod === 1)) {
                validOrder = false;
                break;
              }
              if (day === 1 && targetPeriod === 1 && item.subjectId !== 'kelajak-darsi') {
                validOrder = false;
                break;
              }
              candidateDayLessons.push({ ...item, period: targetPeriod });
            }
            if (!validOrder) break;
          }

          if (!validOrder) continue;

          const candidateAll = [...otherEntries, ...candidateDayLessons];
          const check = checkHardConstraints(candidateAll, teachers, classes, subjects, rooms, settings);
          if (!check.hasConflicts) {
            const newGaps = calculateTotalTeacherGaps(candidateAll);
            if (newGaps < bestGaps) {
              bestGaps = newGaps;
              current = candidateAll;
              improvedInCycle = true;
              if (bestGaps === 0) return current;
            }
          }
        }
      }
    }

    // 2. Intra-class Pairwise Swaps
    for (const cls of classes) {
      for (const day of settings.workingDays) {
        const dayEntries = current
          .filter((e) => e.classId === cls.id && e.day === day)
          .sort((a, b) => a.period - b.period);

        const K = dayEntries.length;
        if (K <= 1) continue;

        for (let i = 0; i < K; i++) {
          for (let j = i + 1; j < K; j++) {
            const e1 = dayEntries[i];
            const e2 = dayEntries[j];

            if (e1.isLocked || e2.isLocked) continue;
            if (e1.subjectId === 'kelajak-darsi' || e2.subjectId === 'kelajak-darsi') continue;
            if (day === 1 && (e1.period === 1 || e2.period === 1)) continue;

            const candidateEntries = current.map((e) => {
              if (e.id === e1.id) return { ...e, period: e2.period };
              if (e.id === e2.id) return { ...e, period: e1.period };
              return e;
            });

            const check = checkHardConstraints(candidateEntries, teachers, classes, subjects, rooms, settings);
            if (!check.hasConflicts) {
              const newGaps = calculateTotalTeacherGaps(candidateEntries);
              if (newGaps < bestGaps) {
                bestGaps = newGaps;
                current = candidateEntries;
                improvedInCycle = true;
                if (bestGaps === 0) return current;
              }
            }
          }
        }
      }
    }

    if (!improvedInCycle) break;
  }

  return current;
};

/**
 * Main CSP Backtracking Solver with MRV, LCV, Forward Checking and Adaptive Restarts
 */
export const solveCSP = (
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings,
  options: SolverOptions = {}
): SolverResult => {
  const startTime = Date.now();
  const maxTimeMs = options.maxTimeMs || 12000;

  // 1. Run strict Pre-flight validation
  const preflight = preflightValidate(teachers, classes, subjects, rooms, settings);
  if (!preflight.isValid) {
    return {
      success: false,
      scheduleEntries: [],
      nodesExplored: 0,
      elapsedMs: Date.now() - startTime,
      score: 0,
      failureReasons: preflight.errors,
    };
  }

  const problem = buildCSPProblem(teachers, classes, subjects, rooms, settings);
  const totalVars = problem.variables.length;

  if (totalVars === 0) {
    return {
      success: true,
      scheduleEntries: [],
      nodesExplored: 0,
      elapsedMs: 0,
      score: 100,
    };
  }

  const classIndexMap = new Map(classes.map((c, i) => [c.id, i]));
  const teacherIndexMap = new Map(teachers.map((t, i) => [t.id, i]));
  const roomIndexMap = new Map(rooms.map((r, i) => [r.id, i]));

  const maxDay = 7;
  const maxPeriod = 10;

  // Count how many lessons each teacher has in this problem
  const teacherTotalLessons = new Map<string, number>();
  problem.variables.forEach((v) => {
    teacherTotalLessons.set(v.teacherId, (teacherTotalLessons.get(v.teacherId) || 0) + 1);
  });

  // Multi-restart loop (adaptive restarts with different variable ordering tie-breakers)
  const maxRestarts = 10;
  let totalNodesExplored = 0;

  for (let restart = 0; restart < maxRestarts; restart++) {
    if (Date.now() - startTime > maxTimeMs) break;

    const allowEmergencySaturday = restart >= 2;

    // Calculate initial domains for all variables
    const initialDomains = new Map<string, SlotValue[]>();
    let hasEmptyDomain = false;

    for (const v of problem.variables) {
      const domain = getVariableDomain(v, problem, settings, allowEmergencySaturday);
      if (domain.length === 0) {
        hasEmptyDomain = true;
        break;
      }
      initialDomains.set(v.id, domain);
    }

    if (hasEmptyDomain) {
      continue;
    }

    // Reset 3D bitmasks [index][day][period]
    const classOccupied: boolean[][][] = Array.from({ length: classes.length }, () =>
      Array.from({ length: maxDay }, () => Array(maxPeriod).fill(false))
    );
    const teacherOccupied: boolean[][][] = Array.from({ length: teachers.length }, () =>
      Array.from({ length: maxDay }, () => Array(maxPeriod).fill(false))
    );
    const roomOccupied: boolean[][][] = Array.from({ length: rooms.length }, () =>
      Array.from({ length: maxDay }, () => Array(maxPeriod).fill(false))
    );
    const teacherDailyLessons: number[][] = Array.from({ length: teachers.length }, () =>
      Array(maxDay).fill(0)
    );

    // Count how many classes each teacher teaches to prioritize shared bottleneck teachers
    const teacherClassSet = new Map<string, Set<string>>();
    problem.variables.forEach((v) => {
      if (!teacherClassSet.has(v.teacherId)) {
        teacherClassSet.set(v.teacherId, new Set());
      }
      teacherClassSet.get(v.teacherId)!.add(v.classId);
    });

    // Count how many lessons each (class, subject) has to prioritize 5-day / 4-day subjects first
    const classSubjectTotalMap = new Map<string, number>();
    problem.variables.forEach((v) => {
      const k = `${v.classId}_${v.subjectId}`;
      classSubjectTotalMap.set(k, (classSubjectTotalMap.get(k) || 0) + 1);
    });

    const restartTieBreaker = new Map(problem.variables.map((v) => [v.id, Math.random()]));

    // Sort variables: Kelajak -> High weekly frequency (5h, 4h) -> Shared Contention -> MRV
    const sortedVariables = [...problem.variables].sort((a, b) => {
      const isKelajakA = a.subjectId === 'kelajak-darsi' ? 1 : 0;
      const isKelajakB = b.subjectId === 'kelajak-darsi' ? 1 : 0;
      if (isKelajakA !== isKelajakB) return isKelajakB - isKelajakA;

      // Prioritize 5h and 4h subjects that must be spread over all days
      const freqA = classSubjectTotalMap.get(`${a.classId}_${a.subjectId}`) || 1;
      const freqB = classSubjectTotalMap.get(`${b.classId}_${b.subjectId}`) || 1;
      if (freqA !== freqB) return freqB - freqA;

      const classesA = teacherClassSet.get(a.teacherId)?.size || 1;
      const classesB = teacherClassSet.get(b.teacherId)?.size || 1;
      if (classesA !== classesB) return classesB - classesA; // shared bottleneck teachers next

      const domA = initialDomains.get(a.id)?.length || 999;
      const domB = initialDomains.get(b.id)?.length || 999;
      if (domA !== domB) return domA - domB; // MRV: tightest domain first!

      const hasSpecialRoomA = a.requiredRoomType && a.requiredRoomType !== 'general' ? 1 : 0;
      const hasSpecialRoomB = b.requiredRoomType && b.requiredRoomType !== 'general' ? 1 : 0;
      if (hasSpecialRoomA !== hasSpecialRoomB) return hasSpecialRoomB - hasSpecialRoomA;

      const tchA = problem.teachers.get(a.teacherId);
      const tchB = problem.teachers.get(b.teacherId);
      const loadA = tchA?.weeklyLoad || 0;
      const loadB = tchB?.weeklyLoad || 0;
      if (loadA !== loadB) return loadB - loadA;

      if (restart > 0) {
        return (restartTieBreaker.get(a.id) || 0) - (restartTieBreaker.get(b.id) || 0);
      }

      return (b.difficultyScore || 0) - (a.difficultyScore || 0);
    });

    const classDaySubjectCount = new Map<string, number>();
    const assignment = new Map<string, SlotValue>();
    let backtrackBudget = restart === 0 ? 100000 : 50000;
    let lastProgressUpdate = Date.now();

    const backtrack = (assignedCountSoFar: number): boolean => {
      totalNodesExplored++;
      backtrackBudget--;

      if (options.shouldCancel && options.shouldCancel()) return false;
      if (Date.now() - startTime > maxTimeMs) return false;
      if (backtrackBudget <= 0) return false; // trigger restart

      const now = Date.now();
      if (now - lastProgressUpdate > 80) {
        lastProgressUpdate = now;
        const progressPercent = Math.min(92, Math.round((assignedCountSoFar / totalVars) * 90));
        options.onProgress?.(progressPercent, 'Распределение уроков и проверка ограничений...', totalNodesExplored);
      }

      if (assignedCountSoFar >= totalVars) {
        return true;
      }

      // Dynamic MRV variable selection with fail-first forward checking
      let bestVar: LessonVariable | null = null;
      let minMetric = Infinity;
      let bestCandidates: Array<{ slot: SlotValue; score: number }> = [];

      for (let i = 0; i < totalVars; i++) {
        const v = problem.variables[i];
        if (assignment.has(v.id)) continue;

        const classIdx = classIndexMap.get(v.classId)!;
        const teacherIdx = teacherIndexMap.get(v.teacherId)!;
        const teacher = problem.teachers.get(v.teacherId);
        const sub = problem.subjects.get(v.subjectId);

        const assignedCount = teacherTotalLessons.get(v.teacherId) || 0;
        const minDailyNeeded = Math.ceil(assignedCount / Math.max(1, settings.workingDays.length));
        const baseDailyMax = teacher?.maxLessonsPerDay || 5;
        const maxTeacherDaily = Math.max(baseDailyMax, minDailyNeeded, restart >= 2 ? 6 : 5);

        const domain = initialDomains.get(v.id) || [];
        const valid: Array<{ slot: SlotValue; score: number }> = [];

        for (const slot of domain) {
          const roomIdx = roomIndexMap.get(slot.roomId);

          // Hard checks
          if (classOccupied[classIdx][slot.day][slot.period]) continue;
          if (teacherOccupied[teacherIdx][slot.day][slot.period]) continue;
          if (roomIdx !== undefined && roomOccupied[roomIdx][slot.day][slot.period]) continue;
          if (teacherDailyLessons[teacherIdx][slot.day] >= maxTeacherDaily) continue;

          // Hard Rule: Strictly max 1 lesson of the same subject per class in a single day
          const subDayKey = `${v.classId}_${slot.day}_${v.subjectId}`;
          const alreadyInDay = classDaySubjectCount.get(subDayKey) || 0;
          if (alreadyInDay >= 1) continue;

          const penalty = evaluateCandidatePenalty(
            v,
            slot,
            classDaySubjectCount,
            teacherDailyLessons,
            teacherIdx,
            sub,
            teacherOccupied
          );

          valid.push({ slot, score: penalty });
        }

        // Fail-First: if any unassigned variable has 0 remaining valid slots, prune immediately
        if (valid.length === 0) {
          return false;
        }

        // Metric: domain size * 10 - subject frequency
        const freq = classSubjectTotalMap.get(`${v.classId}_${v.subjectId}`) || 1;
        const metric = valid.length * 10 - freq;

        if (metric < minMetric) {
          minMetric = metric;
          bestVar = v;
          bestCandidates = valid;
          if (valid.length === 1) break; // Singleton domain
        }
      }

      if (!bestVar) {
        return true;
      }

      // LCV: Try lowest penalty slots first
      bestCandidates.sort((a, b) => a.score - b.score);

      const classIdx = classIndexMap.get(bestVar.classId)!;
      const teacherIdx = teacherIndexMap.get(bestVar.teacherId)!;

      for (const candidate of bestCandidates) {
        const slot = candidate.slot;
        const roomIdx = roomIndexMap.get(slot.roomId);
        const subDayKey = `${bestVar.classId}_${slot.day}_${bestVar.subjectId}`;

        // Forward assign
        assignment.set(bestVar.id, slot);
        classOccupied[classIdx][slot.day][slot.period] = true;
        teacherOccupied[teacherIdx][slot.day][slot.period] = true;
        if (roomIdx !== undefined) roomOccupied[roomIdx][slot.day][slot.period] = true;
        teacherDailyLessons[teacherIdx][slot.day]++;
        classDaySubjectCount.set(subDayKey, (classDaySubjectCount.get(subDayKey) || 0) + 1);

        if (backtrack(assignedCountSoFar + 1)) {
          return true;
        }

        // Revert (Undo)
        assignment.delete(bestVar.id);
        classOccupied[classIdx][slot.day][slot.period] = false;
        teacherOccupied[teacherIdx][slot.day][slot.period] = false;
        if (roomIdx !== undefined) roomOccupied[roomIdx][slot.day][slot.period] = false;
        teacherDailyLessons[teacherIdx][slot.day]--;
        const cur = classDaySubjectCount.get(subDayKey) || 1;
        if (cur <= 1) classDaySubjectCount.delete(subDayKey);
        else classDaySubjectCount.set(subDayKey, cur - 1);
      }

      return false;
    };

    if (backtrack(0)) {
      let rawEntries = Array.from(assignment.entries()).map(([varId, slot]) => {
        const v = sortedVariables.find((item) => item.id === varId)!;
        const isKelajak =
          v.subjectId === 'kelajak-darsi' ||
          problem.subjects.get(v.subjectId)?.name.toLowerCase().includes('kelajak');
        return {
          id: `entry_${varId}`,
          classId: v.classId,
          subjectId: v.subjectId,
          teacherId: v.teacherId,
          classroomId: slot.roomId,
          day: slot.day,
          period: slot.period,
          isLocked: isKelajak ? true : v.isPinned || false,
        };
      });

      // Strictly compact every class schedule so it starts at Period 1 and has 0 gaps/holes
      const entries = compactScheduleEntries(rawEntries, teachers, classes, subjects, rooms, settings);

      const scoreResult = calculateScheduleScore(entries, teachers, classes, subjects, rooms, settings);

      return {
        success: true,
        scheduleEntries: entries,
        nodesExplored: totalNodesExplored,
        elapsedMs: Date.now() - startTime,
        score: scoreResult.totalScore,
      };
    }
  }

  // Generate actionable bottleneck diagnostics
  const bottlenecks: string[] = [];
  teachers.forEach((t) => {
    const totalAssigned = teacherTotalLessons.get(t.id) || 0;
    let availableSlots = 0;
    settings.workingDays.forEach((d) => {
      const maxP = settings.periodsPerDay[d] || 7;
      for (let p = 1; p <= maxP; p++) {
        if (t.availability[`${d}-${p}`] !== false) availableSlots++;
      }
    });

    if (totalAssigned > 0 && availableSlots < totalAssigned + 4) {
      bottlenecks.push(`Учитель «${t.fullName}» имеет ${totalAssigned} уроков при ${availableSlots} доступных слотах в матрице (слишком узкие рамки).`);
    }
  });

  return {
    success: false,
    scheduleEntries: [],
    nodesExplored: totalNodesExplored,
    elapsedMs: Date.now() - startTime,
    failureReasons: [
      'Алгоритму не удалось составить расписание из-за взаимных ограничений.',
      ...(bottlenecks.length > 0 ? bottlenecks : [
        'Возможная причина: у одного или нескольких учителей заблокированы дни (например, суббота) или закрыты утренние часы.',
      ]),
      'Рекомендация: в карточке учителя откройте матрицу доступности и нажмите «Разрешить все» (yoki «Barchasiga ruxsat berish»).',
    ],
  };
};
