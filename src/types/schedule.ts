import { ScheduleConflict } from './constraints';

export interface ScheduleEntry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  classroomId: string;
  day: number; // 1..6
  period: number; // 1..8
  isLocked?: boolean; // pinned by user
  isManual?: boolean;
}

export interface ScheduleScoreBreakdown {
  teacherGapsScore: number; // 25% weight
  classBalanceScore: number; // 20% weight
  subjectDistributionScore: number; // 20% weight
  difficultSubjectsScore: number; // 15% weight
  consecutiveLessonsScore: number; // 10% weight
  teacherPreferencesScore: number; // 10% weight
}

export interface ScheduleMetrics {
  totalTeacherGaps: number;
  maxDailyLessonsDiff: number;
  difficultSubjectsLateCount: number;
  consecutiveViolationsCount: number;
  preferenceFulfillmentPercent: number;
  roomUtilizationPercent: number;
}

export interface ScheduleScore {
  totalScore: number; // 0..100
  rating: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
  breakdown: ScheduleScoreBreakdown;
  metrics: ScheduleMetrics;
}

export interface Schedule {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  entries: ScheduleEntry[];
  score?: ScheduleScore;
  conflicts: ScheduleConflict[];
}

export type ScheduleViewMode = 'classes' | 'teachers' | 'classrooms';

export interface ScheduleFilterState {
  viewMode: ScheduleViewMode;
  selectedClassId?: string;
  selectedTeacherId?: string;
  selectedRoomId?: string;
  showAllInGrid: boolean;
  filterDay?: number;
  highlightSubjectId?: string;
  showConflictsOnly?: boolean;
}

export interface GenerationProgress {
  stage: 'idle' | 'validating' | 'preparing' | 'solving' | 'optimizing' | 'completed' | 'failed';
  progress: number; // 0..100
  message: string;
  nodesVisited?: number;
  conflictsFound?: number;
  currentScore?: number;
  elapsedTimeMs?: number;
  error?: string;
  fatalErrors?: string[];
}
