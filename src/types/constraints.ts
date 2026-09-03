export type ConflictSeverity = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO';

export type ConflictType =
  | 'teacher_clash'
  | 'class_clash'
  | 'room_clash'
  | 'teacher_unavailable'
  | 'teacher_daily_max'
  | 'teacher_weekly_max'
  | 'room_capacity'
  | 'room_type_mismatch'
  | 'curriculum_mismatch'
  | 'teacher_gap'
  | 'excessive_daily_load'
  | 'difficult_subject_late';

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  day: number;
  period: number;
  message: string;
  affectedEntries: string[];
  affectedEntityIds: {
    classIds?: string[];
    teacherIds?: string[];
    roomIds?: string[];
    subjectIds?: string[];
  };
  suggestion?: string;
}

export type ValidationSeverity = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationError {
  id: string;
  code: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  affectedEntityIds?: {
    classIds?: string[];
    teacherIds?: string[];
    roomIds?: string[];
    subjectIds?: string[];
  };
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canProceed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  summary: {
    totalClasses: number;
    totalTeachers: number;
    totalRooms: number;
    totalRequiredLessons: number;
    totalAvailableTeacherCapacity: number;
    totalAvailableClassroomSlots: number;
    totalTimeSlotsPerWeek: number;
  };
}
