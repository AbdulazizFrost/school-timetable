import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { ScheduleMetrics, ScheduleScore, ScheduleScoreBreakdown } from '../types/schedule';
import { ScheduleEntry } from '../types/schedule';

export const calculateScheduleScore = (
  entries: ScheduleEntry[],
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Classroom[],
  settings: ScheduleSettings
): ScheduleScore => {
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  if (entries.length === 0) {
    return {
      totalScore: 0,
      rating: 'Needs Improvement',
      breakdown: {
        teacherGapsScore: 0,
        classBalanceScore: 0,
        subjectDistributionScore: 0,
        difficultSubjectsScore: 0,
        consecutiveLessonsScore: 0,
        teacherPreferencesScore: 0,
      },
      metrics: {
        totalTeacherGaps: 0,
        maxDailyLessonsDiff: 0,
        difficultSubjectsLateCount: 0,
        consecutiveViolationsCount: 0,
        preferenceFulfillmentPercent: 100,
        roomUtilizationPercent: 0,
      },
    };
  }

  // 1. Teacher Gaps (Windows) Calculation
  let totalTeacherGaps = 0;
  teachers.forEach((teacher) => {
    settings.workingDays.forEach((day) => {
      const dayEntries = entries
        .filter((e) => e.teacherId === teacher.id && e.day === day)
        .sort((a, b) => a.period - b.period);

      if (dayEntries.length >= 2) {
        const firstPeriod = dayEntries[0].period;
        const lastPeriod = dayEntries[dayEntries.length - 1].period;
        const span = lastPeriod - firstPeriod + 1;
        const gaps = span - dayEntries.length;
        if (gaps > 0) {
          totalTeacherGaps += gaps;
        }
      }
    });
  });

  // Gap score: 100 if 0 gaps, -10 per gap
  const teacherGapsScore = Math.max(0, Math.min(100, 100 - totalTeacherGaps * 10));

  // 2. Class Daily Workload Balance
  let maxDailyLessonsDiff = 0;
  let classBalancePenalties = 0;

  classes.forEach((cls) => {
    const classDayCounts: number[] = [];
    settings.workingDays.forEach((day) => {
      const count = entries.filter((e) => e.classId === cls.id && e.day === day).length;
      classDayCounts.push(count);
    });

    const activeCounts = classDayCounts.filter((c) => c > 0);
    if (activeCounts.length > 0) {
      const maxC = Math.max(...activeCounts);
      const minC = Math.min(...activeCounts);
      const diff = maxC - minC;
      if (diff > maxDailyLessonsDiff) {
        maxDailyLessonsDiff = diff;
      }
      if (diff > 2) {
        classBalancePenalties += (diff - 2) * 8;
      }
    }
  });

  const classBalanceScore = Math.max(0, Math.min(100, 100 - classBalancePenalties));

  // 3. Subject Distribution (e.g. Math on Mon/Wed/Fri vs all on Monday)
  let distributionPenalties = 0;
  classes.forEach((cls) => {
    // group by subject
    const subjectCounts: Record<string, { total: number; days: Set<number> }> = {};
    const classEntries = entries.filter((e) => e.classId === cls.id);

    classEntries.forEach((e) => {
      if (!subjectCounts[e.subjectId]) {
        subjectCounts[e.subjectId] = { total: 0, days: new Set() };
      }
      subjectCounts[e.subjectId].total++;
      subjectCounts[e.subjectId].days.add(e.day);
    });

    Object.entries(subjectCounts).forEach(([_, stats]) => {
      // If subject has >= 3 lessons per week, it should be on at least 3 days (or at least 2 if double lessons)
      if (stats.total >= 4 && stats.days.size < 3) {
        distributionPenalties += 10;
      } else if (stats.total === 3 && stats.days.size < 2) {
        distributionPenalties += 10;
      }
    });
  });

  const subjectDistributionScore = Math.max(0, Math.min(100, 100 - distributionPenalties * 3));

  // 4. Difficult Subjects Placement (Math, Physics, Chem at periods 2..4 vs 6..7)
  let difficultSubjectsLateCount = 0;
  let difficultSubjectsFirstCount = 0;

  entries.forEach((e) => {
    const sub = subjectMap.get(e.subjectId);
    if (sub && sub.difficulty === 'high') {
      if (e.period >= 6) {
        difficultSubjectsLateCount++;
      }
      if (e.period === 1 && !sub.canBeFirstPeriod) {
        difficultSubjectsFirstCount++;
      }
    }
  });

  const difficultPenalty = difficultSubjectsLateCount * 6 + difficultSubjectsFirstCount * 3;
  const difficultSubjectsScore = Math.max(0, Math.min(100, 100 - difficultPenalty));

  // 5. Consecutive Lessons Policy
  let consecutiveViolationsCount = 0;
  classes.forEach((cls) => {
    settings.workingDays.forEach((day) => {
      const dayClassEntries = entries
        .filter((e) => e.classId === cls.id && e.day === day)
        .sort((a, b) => a.period - b.period);

      for (let i = 0; i < dayClassEntries.length - 1; i++) {
        const cur = dayClassEntries[i];
        const next = dayClassEntries[i + 1];
        if (cur.subjectId === next.subjectId && next.period === cur.period + 1) {
          const sub = subjectMap.get(cur.subjectId);
          if (sub && !sub.allowDoubleLesson) {
            consecutiveViolationsCount++;
          }
          // 3 in a row is always a violation
          if (i + 2 < dayClassEntries.length) {
            const third = dayClassEntries[i + 2];
            if (third.subjectId === cur.subjectId && third.period === next.period + 1) {
              consecutiveViolationsCount += 2;
            }
          }
        }
      }
    });
  });

  const consecutiveLessonsScore = Math.max(0, Math.min(100, 100 - consecutiveViolationsCount * 12));

  // 6. Teacher Preferences Fulfillment
  let totalPreferencesChecked = 0;
  let preferencesSatisfied = 0;

  teachers.forEach((t) => {
    if (t.preferredSlots && t.preferredSlots.length > 0) {
      t.preferredSlots.forEach((slot) => {
        totalPreferencesChecked++;
        const hasLesson = entries.some(
          (e) => e.teacherId === t.id && e.day === slot.day && e.period === slot.period
        );
        if (hasLesson) {
          preferencesSatisfied++;
        }
      });
    }
  });

  const preferenceFulfillmentPercent =
    totalPreferencesChecked > 0 ? Math.round((preferencesSatisfied / totalPreferencesChecked) * 100) : 100;
  const teacherPreferencesScore = preferenceFulfillmentPercent;

  // Weighted Total Score
  // Teacher Gaps: 35%
  // Class Balance: 15%
  // Subject Distribution: 15%
  // Difficult Subjects: 15%
  // Consecutive Lessons: 10%
  // Teacher Preferences: 10%
  const totalScore = Math.round(
    teacherGapsScore * 0.35 +
      classBalanceScore * 0.15 +
      subjectDistributionScore * 0.15 +
      difficultSubjectsScore * 0.15 +
      consecutiveLessonsScore * 0.1 +
      teacherPreferencesScore * 0.1
  );

  let rating: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
  if (totalScore >= 90) rating = 'Excellent';
  else if (totalScore >= 80) rating = 'Good';
  else if (totalScore >= 65) rating = 'Needs Improvement';
  else rating = 'Poor';

  const breakdown: ScheduleScoreBreakdown = {
    teacherGapsScore,
    classBalanceScore,
    subjectDistributionScore,
    difficultSubjectsScore,
    consecutiveLessonsScore,
    teacherPreferencesScore,
  };

  const metrics: ScheduleMetrics = {
    totalTeacherGaps,
    maxDailyLessonsDiff,
    difficultSubjectsLateCount,
    consecutiveViolationsCount,
    preferenceFulfillmentPercent,
    roomUtilizationPercent: Math.min(100, Math.round((entries.length / (rooms.length * 30 || 1)) * 100)),
  };

  return {
    totalScore,
    rating,
    breakdown,
    metrics,
  };
};
