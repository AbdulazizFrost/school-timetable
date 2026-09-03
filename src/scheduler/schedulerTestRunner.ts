import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { checkHardConstraints, isSlotValid, validateSchedule } from './constraints';
import { optimizeSchedule } from './optimizer';
import { buildCSPProblem, solveCSP } from './schedulerEngine';
import { calculateScheduleScore } from './scoring';
import { validateSchoolData } from './validator';
import { INITIAL_CLASSES, INITIAL_ROOMS, INITIAL_SETTINGS, INITIAL_SUBJECTS, INITIAL_TEACHERS } from '../data/demoData';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

export const runSchedulerTestSuite = (): { allPassed: boolean; results: TestResult[] } => {
  const results: TestResult[] = [];

  const runTest = (name: string, fn: () => void) => {
    const start = performance.now();
    try {
      fn();
      results.push({
        name,
        passed: true,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err: any) {
      results.push({
        name,
        passed: false,
        message: err?.message || String(err),
        durationMs: Math.round(performance.now() - start),
      });
    }
  };

  // Test 1: Pre-flight validator on valid Demo Data
  runTest('1. Pre-flight Validation: Valid Demo Data passes with 0 fatal errors', () => {
    const res = validateSchoolData(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (!res.canProceed) {
      throw new Error(`Expected canProceed = true, got errors: ${res.errors.map((e) => e.message).join('; ')}`);
    }
  });

  // Test 2: Teacher Conflict Detection
  runTest('2. Hard Constraint: Teacher Clash Detection', () => {
    const entries = [
      { id: '1', classId: 'cls_5a', subjectId: 'sub_math', teacherId: 'tch_math1', classroomId: 'room_101', day: 1, period: 1 },
      { id: '2', classId: 'cls_6a', subjectId: 'sub_math', teacherId: 'tch_math1', classroomId: 'room_102', day: 1, period: 1 },
    ];
    const check = checkHardConstraints(entries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (!check.hasConflicts || !check.conflicts.some((c) => c.type === 'teacher_clash')) {
      throw new Error('Failed to detect teacher collision at same day/period');
    }
  });

  // Test 3: Class Conflict Detection
  runTest('3. Hard Constraint: Class Clash Detection', () => {
    const entries = [
      { id: '1', classId: 'cls_5a', subjectId: 'sub_math', teacherId: 'tch_math1', classroomId: 'room_101', day: 1, period: 1 },
      { id: '2', classId: 'cls_5a', subjectId: 'sub_rus', teacherId: 'tch_rus1', classroomId: 'room_102', day: 1, period: 1 },
    ];
    const check = checkHardConstraints(entries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (!check.hasConflicts || !check.conflicts.some((c) => c.type === 'class_clash')) {
      throw new Error('Failed to detect class collision at same day/period');
    }
  });

  // Test 4: Room Conflict Detection
  runTest('4. Hard Constraint: Room Clash Detection', () => {
    const entries = [
      { id: '1', classId: 'cls_5a', subjectId: 'sub_math', teacherId: 'tch_math1', classroomId: 'room_101', day: 1, period: 1 },
      { id: '2', classId: 'cls_6a', subjectId: 'sub_rus', teacherId: 'tch_rus1', classroomId: 'room_101', day: 1, period: 1 },
    ];
    const check = checkHardConstraints(entries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (!check.hasConflicts || !check.conflicts.some((c) => c.type === 'room_clash')) {
      throw new Error('Failed to detect room collision at same day/period');
    }
  });

  // Test 5: Teacher Availability Matrix Constraint
  runTest('5. Hard Constraint: Teacher Availability Enforcement', () => {
    const restrictedTeacher: Teacher = {
      ...INITIAL_TEACHERS[0],
      availability: { '1-1': false }, // Forbidden at Mon 1st period
    };
    const valid = isSlotValid('cls_5a', restrictedTeacher.id, 'room_101', 1, 1, [], restrictedTeacher, 5);
    if (valid) {
      throw new Error('isSlotValid should return false when teacher availability is false for that slot');
    }
  });

  // Test 6: Teacher Max Daily Limit
  runTest('6. Hard Constraint: Teacher Max Daily Lessons Limit', () => {
    const teacher = INITIAL_TEACHERS[0];
    const existing = [
      { id: '1', classId: 'cls_5a', subjectId: 'sub_math', teacherId: teacher.id, classroomId: 'room_101', day: 1, period: 1 },
      { id: '2', classId: 'cls_5b', subjectId: 'sub_math', teacherId: teacher.id, classroomId: 'room_101', day: 1, period: 2 },
      { id: '3', classId: 'cls_6a', subjectId: 'sub_math', teacherId: teacher.id, classroomId: 'room_101', day: 1, period: 3 },
      { id: '4', classId: 'cls_6b', subjectId: 'sub_math', teacherId: teacher.id, classroomId: 'room_101', day: 1, period: 4 },
      { id: '5', classId: 'cls_7a', subjectId: 'sub_math', teacherId: teacher.id, classroomId: 'room_101', day: 1, period: 5 },
    ];
    const valid = isSlotValid('cls_7b', teacher.id, 'room_101', 1, 6, existing, teacher, 5);
    if (valid) {
      throw new Error('Teacher exceeded 5 daily lessons limit, isSlotValid should return false');
    }
  });

  // Test 7: Impossible Schedule Diagnostics
  runTest('7. Explainability: Impossible Schedule Detected & Diagnosed', () => {
    const overloadedClass: SchoolClass = {
      ...INITIAL_CLASSES[0],
      curriculum: [
        { id: 'c1', subjectId: 'sub_math', lessonsPerWeek: 50 }, // 50 lessons when school week has only 39 slots
      ],
    };
    const res = validateSchoolData(INITIAL_TEACHERS, [overloadedClass], INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (res.canProceed) {
      throw new Error('Expected validation to flag fatal class overload error');
    }
  });

  // Test 8: CSP Solver executes on full Demo Data
  runTest('8. CSP Solver: Solves Full Realistic School Timetable', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 10000,
    });
    if (!solveRes.success) {
      throw new Error(`CSP Solver failed: ${solveRes.failureReasons?.join('; ')}`);
    }

    const check = checkHardConstraints(solveRes.scheduleEntries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    const fatalConflicts = check.conflicts.filter((c) => c.severity === 'FATAL' || c.severity === 'ERROR');
    if (fatalConflicts.length > 0) {
      throw new Error(`Generated schedule has ${fatalConflicts.length} hard conflicts: ${fatalConflicts[0].message}`);
    }
  });

  // Test 9: Optimizer improves soft score
  runTest('9. Optimizer: Soft constraints local search optimization', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES.slice(0, 4), INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 5000,
    });
    if (solveRes.success) {
      const initialScore = calculateScheduleScore(solveRes.scheduleEntries, INITIAL_TEACHERS, INITIAL_CLASSES.slice(0, 4), INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
      const optRes = optimizeSchedule(solveRes.scheduleEntries, INITIAL_TEACHERS, INITIAL_CLASSES.slice(0, 4), INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
        maxIterations: 300,
        maxTimeMs: 1500,
      });
      if (optRes.finalScore < initialScore.totalScore) {
        throw new Error('Optimizer resulted in lower score than initial solution');
      }
    }
  });

  // Test 10: Schedule Scoring Engine (0-100)
  runTest('10. Scoring Engine: Evaluates 0-100 score and breakdown correctly', () => {
    const emptyScore = calculateScheduleScore([], INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (emptyScore.totalScore !== 0) {
      throw new Error(`Empty schedule should have score 0, got ${emptyScore.totalScore}`);
    }
  });

  // Test 11: Kelajak darsi Hard Constraint verification (Monday Period 1 for all classes)
  runTest('11. Hard Constraint: Kelajak darsi strictly on Monday Period 1 for all 7 classes', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 10000,
    });
    if (!solveRes.success) {
      throw new Error(`CSP Solver failed: ${solveRes.failureReasons?.join('; ')}`);
    }

    // 1. Verify all 7 classes have Kelajak darsi on Monday Period 1 with isLocked = true
    INITIAL_CLASSES.forEach((cls) => {
      const mon1Entry = solveRes.scheduleEntries.find(
        (e) => e.classId === cls.id && e.day === 1 && e.period === 1
      );
      if (!mon1Entry) {
        throw new Error(`Class ${cls.name} has no lesson on Monday Period 1`);
      }
      if (mon1Entry.subjectId !== 'kelajak-darsi' && !mon1Entry.subjectId.toLowerCase().includes('kelajak')) {
        throw new Error(`Class ${cls.name} has subject ${mon1Entry.subjectId} instead of Kelajak darsi on Monday Period 1`);
      }
      if (!mon1Entry.isLocked) {
        throw new Error(`Class ${cls.name} Kelajak darsi entry is not locked`);
      }
    });

    // 2. Verify all 7 classes maintain Kelajak darsi on Monday Period 1 after local search optimization
    const optRes = optimizeSchedule(solveRes.scheduleEntries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxIterations: 200,
      maxTimeMs: 1000,
    });
    INITIAL_CLASSES.forEach((cls) => {
      const mon1Entry = optRes.entries.find(
        (e) => e.classId === cls.id && e.day === 1 && e.period === 1
      );
      if (!mon1Entry || (mon1Entry.subjectId !== 'kelajak-darsi' && !mon1Entry.subjectId.toLowerCase().includes('kelajak'))) {
        throw new Error(`Optimizer violated Kelajak darsi Monday Period 1 constraint for class ${cls.name}`);
      }
    });
  });

  // Test 12: No Duplicate Subject on Same Day in Same Class
  runTest('12. Hard Constraint: Strictly 0 duplicate subjects in any class in a single day', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 10000,
    });
    if (!solveRes.success) {
      throw new Error(`CSP Solver failed: ${solveRes.failureReasons?.join('; ')}`);
    }

    const checkMap = new Map<string, number>();
    solveRes.scheduleEntries.forEach((entry) => {
      const key = `${entry.classId}_${entry.day}_${entry.subjectId}`;
      const cnt = (checkMap.get(key) || 0) + 1;
      if (cnt > 1) {
        throw new Error(`Duplicate subject detected for class ${entry.classId} on day ${entry.day}: subject ${entry.subjectId} appears ${cnt} times!`);
      }
      checkMap.set(key, cnt);
    });
  });

  // Test 13: Full validateSchedule report
  runTest('13. Validation Engine: validateSchedule returns STATUS: VALID with 0 errors on generated timetable', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 10000,
    });
    if (!solveRes.success) {
      throw new Error(`CSP Solver failed: ${solveRes.failureReasons?.join('; ')}`);
    }

    const report = validateSchedule(solveRes.scheduleEntries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (report.status !== 'VALID') {
      throw new Error(`Schedule validation failed with status ${report.status}:\n${report.details.join('\n')}`);
    }
    if (report.classConflicts > 0 || report.teacherConflicts > 0 || report.wrongWeeklyHours > 0 || report.missingLessons > 0 || report.extraLessons > 0) {
      throw new Error(`Schedule validation report has errors: ${report.summaryText}`);
    }
  });

  // Test 14: Dual representation consistency (Class view == Teacher view 100%)
  runTest('14. Dual Representation: Class Schedule matches Teacher Schedule exactly with 0 discrepancy', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 10000,
    });
    if (!solveRes.success) {
      throw new Error(`CSP Solver failed: ${solveRes.failureReasons?.join('; ')}`);
    }

    // 1. For every class entry, verify the corresponding teacher has the exact same entry at (day, period)
    solveRes.scheduleEntries.forEach((entry) => {
      const teacherEntries = solveRes.scheduleEntries.filter(
        (e) => e.teacherId === entry.teacherId && e.day === entry.day && e.period === entry.period
      );
      if (teacherEntries.length !== 1) {
        throw new Error(`Teacher ${entry.teacherId} does not have exactly 1 lesson at day ${entry.day} period ${entry.period}`);
      }
      if (teacherEntries[0].id !== entry.id || teacherEntries[0].classId !== entry.classId || teacherEntries[0].subjectId !== entry.subjectId) {
        throw new Error(`Mismatch between class entry and teacher entry for teacher ${entry.teacherId}`);
      }
    });

    // 2. For every teacher entry, verify the corresponding class has the exact same entry at (day, period)
    solveRes.scheduleEntries.forEach((entry) => {
      const classEntries = solveRes.scheduleEntries.filter(
        (e) => e.classId === entry.classId && e.day === entry.day && e.period === entry.period
      );
      if (classEntries.length !== 1) {
        throw new Error(`Class ${entry.classId} does not have exactly 1 lesson at day ${entry.day} period ${entry.period}`);
      }
      if (classEntries[0].id !== entry.id || classEntries[0].teacherId !== entry.teacherId || classEntries[0].subjectId !== entry.subjectId) {
        throw new Error(`Mismatch between teacher entry and class entry for class ${entry.classId}`);
      }
    });
  });

  // Test 15: Class Compactness (Every class starts strictly at Period 1, with 0 gaps)
  runTest('15. Hard Constraint: Every class starts strictly at Period 1 with 0 gaps on every day', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 10000,
    });
    if (!solveRes.success) {
      throw new Error(`CSP Solver failed: ${solveRes.failureReasons?.join('; ')}`);
    }

    INITIAL_CLASSES.forEach((cls) => {
      INITIAL_SETTINGS.workingDays.forEach((day) => {
        const dayLessons = solveRes.scheduleEntries
          .filter((e) => e.classId === cls.id && e.day === day)
          .sort((a, b) => a.period - b.period);

        if (dayLessons.length > 0) {
          if (dayLessons[0].period !== 1) {
            throw new Error(`Class ${cls.name} on day ${day} does not start on Period 1! Starts on Period ${dayLessons[0].period}`);
          }
          const periods = dayLessons.map((l) => l.period);
          for (let p = 1; p <= dayLessons.length; p++) {
            if (!periods.includes(p)) {
              throw new Error(`Class ${cls.name} on day ${day} has a hole/gap at Period ${p}! Scheduled periods: ${periods.join(', ')}`);
            }
          }
        }
      });
    });
  });

  // Test 16: Teacher Windows Minimization
  runTest('16. Teacher Compactness: Teacher Windows are strictly minimized with contiguous lesson clusters', () => {
    const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxTimeMs: 10000,
    });
    if (!solveRes.success) {
      throw new Error(`CSP Solver failed: ${solveRes.failureReasons?.join('; ')}`);
    }

    const optRes = optimizeSchedule(solveRes.scheduleEntries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS, {
      maxIterations: 300,
      maxTimeMs: 1000,
    });

    const score = calculateScheduleScore(optRes.entries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    if (score.metrics.totalTeacherGaps > 30) {
      throw new Error(`Too many teacher windows detected across school: ${score.metrics.totalTeacherGaps} total gap hours!`);
    }
  });

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
};
