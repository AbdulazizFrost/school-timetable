import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { Schedule } from '../types/schedule';

export interface ProjectBackupData {
  version: string;
  exportedAt: string;
  settings: ScheduleSettings;
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Classroom[];
  schedule: Schedule | null;
}

const STORAGE_KEYS = {
  SETTINGS: 'school_timetable_settings',
  TEACHERS: 'school_timetable_teachers',
  CLASSES: 'school_timetable_classes',
  SUBJECTS: 'school_timetable_subjects',
  ROOMS: 'school_timetable_rooms',
  SCHEDULE: 'school_timetable_schedule',
  THEME: 'school_timetable_theme',
  LANG: 'school_timetable_lang',
};

export const storageService = {
  saveLanguage: (lang: 'ru' | 'uz') => {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  },
  loadLanguage: (): 'ru' | 'uz' => {
    return (localStorage.getItem(STORAGE_KEYS.LANG) as any) || 'ru';
  },

  saveSettings: (settings: ScheduleSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
  loadSettings: (): ScheduleSettings | null => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  },

  saveTeachers: (teachers: Teacher[]) => {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  },
  loadTeachers: (): Teacher[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    return data ? JSON.parse(data) : null;
  },

  saveClasses: (classes: SchoolClass[]) => {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  },
  loadClasses: (): SchoolClass[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    return data ? JSON.parse(data) : null;
  },

  saveSubjects: (subjects: Subject[]) => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },
  loadSubjects: (): Subject[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return data ? JSON.parse(data) : null;
  },

  saveRooms: (rooms: Classroom[]) => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  },
  loadRooms: (): Classroom[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return data ? JSON.parse(data) : null;
  },

  saveSchedule: (schedule: Schedule | null) => {
    if (!schedule) {
      localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
    } else {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    }
  },
  loadSchedule: (): Schedule | null => {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    return data ? JSON.parse(data) : null;
  },

  saveTheme: (theme: 'light' | 'dark' | 'system') => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },
  loadTheme: (): 'light' | 'dark' | 'system' => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as any) || 'light';
  },

  exportProjectJSON: (
    settings: ScheduleSettings,
    teachers: Teacher[],
    classes: SchoolClass[],
    subjects: Subject[],
    rooms: Classroom[],
    schedule: Schedule | null
  ): string => {
    const backup: ProjectBackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings,
      teachers,
      classes,
      subjects,
      rooms,
      schedule,
    };
    return JSON.stringify(backup, null, 2);
  },

  importProjectJSON: (jsonString: string): ProjectBackupData => {
    const data = JSON.parse(jsonString) as ProjectBackupData;
    if (!data.teachers || !data.classes || !data.subjects || !data.settings) {
      throw new Error('Некорректная структура файла проекта. Отсутствуют обязательные разделы.');
    }
    return data;
  },

  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
};
