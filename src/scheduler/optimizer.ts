import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { checkHardConstraints, isSlotValid } from './constraints';
import { calculateScheduleScore } from './scoring';
import { ScheduleEntry } from '../types/schedule';
import { compactTeacherWindows } from './schedulerEngine';

export interface OptimizationOptions {
  maxIterations?: number;
  maxTimeMs?: number;
  onProgress?: (progress: number, stage: string, currentScore: number) => void;
  shouldCancel?: () => boolean;
}

export interface OptimizationResult {
  improved: boolean;
  initialScore: number;
  finalScore: number;
  entries: ScheduleEntry[];
  iterationsRun: number;
  gapsEliminated: number;
}

/**
 * Optimizes soft constraints of a valid schedule via local neighborhood search.
 * Hard constraints are strictly preserved.
 */
export const optimizeSchedule = (
  initialEntries: ScheduleEntry[],
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings,
  options: OptimizationOptions = {}
): OptimizationResult => {
  const maxIterations = options.maxIterations || 800;
  const maxTimeMs = options.maxTimeMs || 3000;
  const startTime = Date.now();

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  let currentEntries: ScheduleEntry[] = compactTeacherWindows(
    initialEntries.map((e) => ({ ...e })),
    teachers,
    classes,
    subjects,
    rooms,
    settings
  );

  let currentScoreResult = calculateScheduleScore(currentEntries, teachers, classes, subjects, rooms, settings);
  const initialScore = currentScoreResult.totalScore;
  const initialGaps = currentScoreResult.metrics.totalTeacherGaps;

  let bestEntries = [...currentEntries];
  let bestScore = initialScore;

  const timeSlots: Array<{ day: number; period: number }> = [];
  settings.workingDays.forEach((day) => {
    const maxPeriod = settings.periodsPerDay[day] || 7;
    for (let p = 1; p <= maxPeriod; p++) {
      timeSlots.push({ day, period: p });
    }
  });

  let iterationsRun = 0;
  let temperature = 1.0;
  const coolingRate = 0.995;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterationsRun++;

    if (options.shouldCancel && options.shouldCancel()) {
      break;
    }

    if (Date.now() - startTime > maxTimeMs) {
      break;
    }

    if (iter % 50 === 0 && options.onProgress) {
      const progressPercent = Math.min(100, Math.round((iter / maxIterations) * 100));
      options.onProgress(progressPercent, 'Оптимизация окон учителей и баланса предметов...', bestScore);
    }

    // Pick a candidate entry to improve: strongly prioritize teachers who have windows on their day
    const entriesWithGaps = currentEntries.filter((e) => {
      if (e.isLocked) return false;
      const tchDay = currentEntries
        .filter((o) => o.teacherId === e.teacherId && o.day === e.day)
        .map((o) => o.period)
        .sort((a, b) => a - b);
      return tchDay.length >= 2 && tchDay[tchDay.length - 1] - tchDay[0] + 1 > tchDay.length;
    });

    const entryToMove =
      entriesWithGaps.length > 0 && Math.random() < 0.7
        ? entriesWithGaps[Math.floor(Math.random() * entriesWithGaps.length)]
        : currentEntries[Math.floor(Math.random() * currentEntries.length)];
    if (!entryToMove) continue;

    const isKelajak =
      entryToMove.subjectId === 'kelajak-darsi' ||
      subjectMap.get(entryToMove.subjectId)?.name.toLowerCase().includes('kelajak');

    if (entryToMove.isLocked || isKelajak) {
      continue;
    }

    // Strategy 1: Move to an empty slot for this class
    // Strategy 2: Swap with another lesson of the same class
    const strategy = Math.random() < 0.5 ? 'move' : 'swap';

    if (strategy === 'move') {
      const randomSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      if (
        (randomSlot.day === entryToMove.day && randomSlot.period === entryToMove.period) ||
        (randomSlot.day === 1 && randomSlot.period === 1) // Never displace Monday Period 1
      ) {
        continue;
      }

      // Check if slot is empty for this class
      const classHasLesson = currentEntries.some(
        (e) => e.id !== entryToMove.id && e.classId === entryToMove.classId && e.day === randomSlot.day && e.period === randomSlot.period
      );
      if (classHasLesson) continue;

      // Check if teacher is available and valid in new slot
      const otherEntries = currentEntries.filter((e) => e.id !== entryToMove.id);
      const teacher = teacherMap.get(entryToMove.teacherId);
      const valid = isSlotValid(
        entryToMove.classId,
        entryToMove.teacherId,
        entryToMove.classroomId,
        randomSlot.day,
        randomSlot.period,
        otherEntries,
        teacher,
        teacher?.maxLessonsPerDay || 5,
        entryToMove.subjectId
      );

      if (valid) {
        const candidateEntries = currentEntries.map((e) =>
          e.id === entryToMove.id ? { ...e, day: randomSlot.day, period: randomSlot.period } : e
        );

        // Strictly verify all hard constraints (no collisions, no duplicate subjects in a day, class starts at period 1 with 0 gaps)
        const hardCheck = checkHardConstraints(candidateEntries, teachers, classes, subjects, rooms, settings);
        if (!hardCheck.hasConflicts) {
          const candidateScore = calculateScheduleScore(candidateEntries, teachers, classes, subjects, rooms, settings);
          const delta = candidateScore.totalScore - currentScoreResult.totalScore;

          if (delta > 0 || (delta >= -2 && Math.random() < Math.exp(delta / (temperature || 0.1)))) {
            currentEntries = candidateEntries;
            currentScoreResult = candidateScore;

            if (candidateScore.totalScore > bestScore) {
              bestScore = candidateScore.totalScore;
              bestEntries = candidateEntries;
            }
          }
        }
      }
    } else {
      // Strategy: Swap with another lesson in the same class
      const classEntries = currentEntries.filter(
        (e) =>
          e.classId === entryToMove.classId &&
          e.id !== entryToMove.id &&
          !e.isLocked &&
          e.subjectId !== 'kelajak-darsi' &&
          !subjectMap.get(e.subjectId)?.name.toLowerCase().includes('kelajak') &&
          !(e.day === 1 && e.period === 1)
      );
      if (classEntries.length === 0) continue;

      const partner = classEntries[Math.floor(Math.random() * classEntries.length)];
      if (partner.day === entryToMove.day && partner.period === entryToMove.period) continue;

      // Candidate swap
      const entriesWithoutPair = currentEntries.filter((e) => e.id !== entryToMove.id && e.id !== partner.id);
      const tch1 = teacherMap.get(entryToMove.teacherId);
      const tch2 = teacherMap.get(partner.teacherId);

      const valid1 = isSlotValid(
        entryToMove.classId,
        entryToMove.teacherId,
        entryToMove.classroomId,
        partner.day,
        partner.period,
        entriesWithoutPair,
        tch1,
        tch1?.maxLessonsPerDay || 5,
        entryToMove.subjectId
      );

      const valid2 = isSlotValid(
        partner.classId,
        partner.teacherId,
        partner.classroomId,
        entryToMove.day,
        entryToMove.period,
        entriesWithoutPair,
        tch2,
        tch2?.maxLessonsPerDay || 5,
        partner.subjectId
      );

      if (valid1 && valid2) {
        const candidateEntries = currentEntries.map((e) => {
          if (e.id === entryToMove.id) return { ...e, day: partner.day, period: partner.period };
          if (e.id === partner.id) return { ...e, day: entryToMove.day, period: entryToMove.period };
          return e;
        });

        // Double check all hard constraints
        const hardCheck = checkHardConstraints(candidateEntries, teachers, classes, subjects, rooms, settings);
        if (!hardCheck.hasConflicts) {
          const candidateScore = calculateScheduleScore(candidateEntries, teachers, classes, subjects, rooms, settings);
          const delta = candidateScore.totalScore - currentScoreResult.totalScore;

          if (delta > 0 || (delta >= -2 && Math.random() < Math.exp(delta / (temperature || 0.1)))) {
            currentEntries = candidateEntries;
            currentScoreResult = candidateScore;

            if (candidateScore.totalScore > bestScore) {
              bestScore = candidateScore.totalScore;
              bestEntries = candidateEntries;
            }
          }
        }
      }
    }

    temperature *= coolingRate;
  }

  // Final teacher window compaction pass
  bestEntries = compactTeacherWindows(bestEntries, teachers, classes, subjects, rooms, settings);
  const finalScoreResult = calculateScheduleScore(bestEntries, teachers, classes, subjects, rooms, settings);

  return {
    improved: bestScore > initialScore || finalScoreResult.metrics.totalTeacherGaps < initialGaps,
    initialScore,
    finalScore: Math.max(bestScore, finalScoreResult.totalScore),
    entries: bestEntries,
    iterationsRun,
    gapsEliminated: Math.max(0, initialGaps - finalScoreResult.metrics.totalTeacherGaps),
  };
};
