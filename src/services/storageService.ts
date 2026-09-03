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
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, lang);
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadLanguage: (): 'ru' | 'uz' => {
    try {
      return (localStorage.getItem(STORAGE_KEYS.LANG) as any) || 'ru';
    } catch (e) {
      return 'ru';
    }
  },

  saveSettings: (settings: ScheduleSettings) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadSettings: (): ScheduleSettings | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to parse settings from storage:', e);
      return null;
    }
  },

  saveTeachers: (teachers: Teacher[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadTeachers: (): Teacher[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to parse teachers from storage:', e);
      return null;
    }
  },

  saveClasses: (classes: SchoolClass[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadClasses: (): SchoolClass[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to parse classes from storage:', e);
      return null;
    }
  },

  saveSubjects: (subjects: Subject[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadSubjects: (): Subject[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to parse subjects from storage:', e);
      return null;
    }
  },

  saveRooms: (rooms: Classroom[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadRooms: (): Classroom[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to parse rooms from storage:', e);
      return null;
    }
  },

  saveSchedule: (schedule: Schedule | null) => {
    try {
      if (!schedule) {
        localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
      } else {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadSchedule: (): Schedule | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to parse schedule from storage:', e);
      return null;
    }
  },

  saveTheme: (theme: 'light' | 'dark' | 'system') => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },
  loadTheme: (): 'light' | 'dark' | 'system' => {
    try {
      return (localStorage.getItem(STORAGE_KEYS.THEME) as any) || 'light';
    } catch (e) {
      return 'light';
    }
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
