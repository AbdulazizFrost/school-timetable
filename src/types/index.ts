export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6; // 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat

export const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

export const DAY_SHORT_NAMES: Record<number, string> = {
  1: 'ПН',
  2: 'ВТ',
  3: 'СР',
  4: 'ЧТ',
  5: 'ПТ',
  6: 'СБ',
};

export type RoomType =
  | 'general'
  | 'computer'
  | 'lab_physics'
  | 'lab_chemistry'
  | 'lab_biology'
  | 'gym'
  | 'language'
  | 'workshop'
  | 'music';

export const ROOM_TYPE_LABELS: Record<string, string> = {
  general: 'Общий кабинет',
  computer: 'Компьютерный класс',
  lab_physics: 'Лаборатория физики',
  lab_chemistry: 'Лаборатория химии',
  lab_biology: 'Лаборатория биологии',
  gym: 'Спортзал',
  language: 'Лингафонный кабинет',
  workshop: 'Мастерская / Труд',
  music: 'Музыкальный класс',
};

export interface TeacherAvailabilitySlot {
  day: number;
  period: number;
  isAvailable: boolean;
  isPreferred?: boolean;
}

export interface TeacherClassAllocation {
  id?: string;
  classId: string;
  subjectId: string;
  lessonsPerWeek: number;
}

export interface Teacher {
  id: string;
  fullName: string;
  shortName?: string;
  email?: string;
  phone?: string;
  subjectIds: string[];
  subjectHours?: Record<string, number>; // key: subjectId, value: allocated hours/week for this subject
  classAllocations?: TeacherClassAllocation[]; // Workload per specific class and subject
  weeklyLoad: number; // Maximum weekly teaching periods
  maxLessonsPerDay: number; // e.g. 5
  availability: Record<string, boolean>; // key: `${day}-${period}`, default true
  preferredSlots?: Array<{ day: number; period: number }>;
  unavailableSlots?: Array<{ day: number; period: number }>;
  color?: string;
  notes?: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  color: string;
  difficulty: 'high' | 'medium' | 'low'; // High = Math/Physics/Chem, Medium = Bio/History, Low = PE/Art/Music
  difficultyScore: number; // 1 to 5 (used for workload calculation)
  maxConsecutiveLessons: number; // 1 or 2
  allowDoubleLesson: boolean;
  preferredPeriods: number[]; // e.g. [2, 3, 4] for high difficulty subjects
  requiredRoomType?: string;
  canBeFirstPeriod: boolean;
}

export interface CurriculumRequirement {
  id: string;
  subjectId: string;
  teacherId?: string; // specific teacher assigned or empty to auto-assign
  lessonsPerWeek: number;
  preferredDays?: number[];
  preferredPeriods?: number[];
  allowDoubleLesson?: boolean;
  customRoomId?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "5-А"
  grade: number; // 5
  letter: string; // "А"
  studentCount: number;
  homeRoomId?: string;
  shift: number; // 1 = morning, 2 = afternoon
  curriculum: CurriculumRequirement[];
}

export interface Classroom {
  id: string;
  name: string; // "101", "Кабинет Физики"
  roomNumber: string;
  type: string; // RoomType or custom string
  capacity: number;
  floor?: number;
  building?: string;
  availableSlots?: Record<string, boolean>; // key: `${day}-${period}`
}

export interface TimeSlot {
  id: string;
  day: number;
  period: number;
  startTime: string;
  endTime: string;
}

export interface PeriodTimeConfig {
  period: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleSettings {
  schoolName: string;
  academicYear: string;
  workingDays: number[]; // [1, 2, 3, 4, 5, 6]
  periodsPerDay: Record<number, number>; // { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 4 }
  periodTimes: PeriodTimeConfig[];
  defaultLessonDurationMinutes: number;
  defaultBreakDurationMinutes: number;
  allowDoubleLessonsDefault: boolean;
  maxDifficultSubjectsPerDay: number;
  shiftCount: number;
}
