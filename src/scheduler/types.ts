import { Classroom, SchoolClass, Subject, Teacher } from '../types';
import { ScheduleEntry } from '../types/schedule';

export interface LessonVariable {
  id: string; // unique lesson requirement instance, e.g. "cls_5a_sub_math_0"
  classId: string;
  subjectId: string;
  teacherId: string;
  requiredRoomType?: string;
  customRoomId?: string;
  allowDoubleLesson: boolean;
  isDifficult: boolean;
  difficultyScore: number;
  lessonsPerWeek: number;
  instanceIndex: number; // 0..lessonsPerWeek - 1
  preferredDays?: number[];
  preferredPeriods?: number[];
  isPinned?: boolean;
  isSplit?: boolean;
  splitType?: 'boys_girls' | 'subgroups';
  secondTeacherId?: string;
  secondCustomRoomId?: string;
}

export interface SlotValue {
  day: number;
  period: number;
  roomId: string;
  secondRoomId?: string;
}

export interface CSPProblem {
  variables: LessonVariable[];
  teachers: Map<string, Teacher>;
  subjects: Map<string, Subject>;
  classes: Map<string, SchoolClass>;
  rooms: Map<string, Classroom>;
  allRooms: Classroom[];
  workingDays: number[];
  periodsPerDay: Record<number, number>;
  timeSlots: Array<{ day: number; period: number }>;
}

export interface SolverOptions {
  maxTimeMs?: number;
  onProgress?: (progress: number, stage: string, nodes: number, bestScore?: number) => void;
  shouldCancel?: () => boolean;
  enableOptimization?: boolean;
}

export interface SolverResult {
  success: boolean;
  scheduleEntries: ScheduleEntry[];
  nodesExplored: number;
  elapsedMs: number;
  score?: number;
  failureReasons?: string[];
}
