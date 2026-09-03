import { create } from 'zustand';
import { Classroom, CurriculumRequirement, ScheduleSettings, SchoolClass, Subject, Teacher, TeacherClassAllocation } from '../types';
import { ValidationResult } from '../types/constraints';
import {
  INITIAL_CLASSES,
  INITIAL_ROOMS,
  INITIAL_SETTINGS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
} from '../data/demoData';
import { validateSchoolData } from '../scheduler/validator';
import { ProjectBackupData, storageService } from '../services/storageService';
import { Language, getTranslation, translations } from '../i18n/translations';

interface SchoolState {
  settings: ScheduleSettings;
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Classroom[];
  theme: 'light' | 'dark' | 'system';
  language: Language;
  validation: ValidationResult;

  // Actions
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['ru']) => string;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateSettings: (settings: Partial<ScheduleSettings>) => void;
  
  // Teachers CRUD
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  batchAddTeachers: (teachers: Array<Omit<Teacher, 'id'>>) => void;

  // Classes CRUD
  addClass: (schoolClass: Omit<SchoolClass, 'id'>) => void;
  updateClass: (id: string, schoolClass: Partial<SchoolClass>) => void;
  deleteClass: (id: string) => void;

  // Subjects CRUD
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, subject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Classrooms CRUD
  addClassroom: (room: Omit<Classroom, 'id'>) => void;
  updateClassroom: (id: string, room: Partial<Classroom>) => void;
  deleteClassroom: (id: string) => void;

  // Global actions
  autoFixCurriculums: () => void;
  runValidation: () => ValidationResult;
  loadDemoData: () => void;
  clearAllData: () => void;
  importProject: (data: ProjectBackupData) => void;
}

const rawLoadedTeachers = storageService.loadTeachers();
const isOldTeachers = !rawLoadedTeachers || rawLoadedTeachers.some((t) => t.id === 'tch_1a' || t.fullName.includes('Karimova Nargiza') || t.fullName.includes('Smirnova'));
const loadedTeachers = isOldTeachers ? INITIAL_TEACHERS : rawLoadedTeachers;

const rawLoadedSubjects = storageService.loadSubjects();
const isOldSubjects = !rawLoadedSubjects || rawLoadedSubjects.some((s) => s.id === 'sub_mat' || s.id === 'sub_kelajak');
const loadedSubjects = isOldSubjects ? INITIAL_SUBJECTS : rawLoadedSubjects;

const rawLoadedClasses = storageService.loadClasses();
const isOldClasses = !rawLoadedClasses || rawLoadedClasses.some((c) => (c.studentCount || 0) > 8);
const loadedClasses = isOldClasses ? INITIAL_CLASSES : rawLoadedClasses;

const loadedSettings = storageService.loadSettings() || INITIAL_SETTINGS;
const loadedRooms = storageService.loadRooms() || INITIAL_ROOMS;
const loadedTheme = storageService.loadTheme() || 'light';
const loadedLanguage = storageService.loadLanguage() || 'ru';

if (isOldTeachers) storageService.saveTeachers(INITIAL_TEACHERS);
if (isOldSubjects) storageService.saveSubjects(INITIAL_SUBJECTS);
if (isOldClasses) storageService.saveClasses(INITIAL_CLASSES);

const initialValidation = validateSchoolData(
  loadedTeachers,
  loadedClasses,
  loadedSubjects,
  loadedRooms,
  loadedSettings
);

const syncClassesWithTeacherAllocations = (
  classes: SchoolClass[],
  teacherId: string,
  allocations?: TeacherClassAllocation[]
): SchoolClass[] => {
  if (!allocations) return classes;

  const targetAllocationsMap = new Map<string, TeacherClassAllocation>();
  allocations.forEach((a) => {
    targetAllocationsMap.set(`${a.classId}_${a.subjectId}`, a);
  });

  return classes.map((cls) => {
    let newCurriculum = [...cls.curriculum];
    
    // 1. Update or unassign existing rows
    newCurriculum = newCurriculum.map((req) => {
      const key = `${cls.id}_${req.subjectId}`;
      const alloc = targetAllocationsMap.get(key);
      if (alloc) {
        return {
          ...req,
          teacherId: teacherId,
          lessonsPerWeek: alloc.lessonsPerWeek,
        };
      } else if (req.teacherId === teacherId) {
        return {
          ...req,
          teacherId: '',
        };
      }
      return req;
    });

    // 2. Add newly allocated rows if not present
    allocations
      .filter((a) => a.classId === cls.id)
      .forEach((a) => {
        const exists = newCurriculum.some((req) => req.subjectId === a.subjectId);
        if (!exists) {
          newCurriculum.push({
            id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            subjectId: a.subjectId,
            teacherId: teacherId,
            lessonsPerWeek: a.lessonsPerWeek,
          });
        }
      });

    return {
      ...cls,
      curriculum: newCurriculum,
    };
  });
};

export const useSchoolStore = create<SchoolState>((set, get) => ({
  settings: loadedSettings,
  teachers: loadedTeachers,
  classes: loadedClasses,
  subjects: loadedSubjects,
  rooms: loadedRooms,
  theme: loadedTheme,
  language: loadedLanguage,
  validation: initialValidation,

  setLanguage: (lang) => {
    storageService.saveLanguage(lang);
    set({ language: lang });
  },

  t: (key) => {
    return getTranslation(get().language, key);
  },

  setTheme: (theme) => {
    storageService.saveTheme(theme);
    set({ theme });
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    storageService.saveSettings(updated);
    const validation = validateSchoolData(get().teachers, get().classes, get().subjects, get().rooms, updated);
    set({ settings: updated, validation });
  },

  // Teachers
  addTeacher: (teacherData) => {
    const id = `tch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTeacher: Teacher = { ...teacherData, id };
    const updatedTeachers = [...get().teachers, newTeacher];
    
    // Sync classes curriculum if classAllocations are provided
    let updatedClasses = get().classes;
    if (newTeacher.classAllocations && newTeacher.classAllocations.length > 0) {
      updatedClasses = syncClassesWithTeacherAllocations(updatedClasses, id, newTeacher.classAllocations);
      storageService.saveClasses(updatedClasses);
    }

    storageService.saveTeachers(updatedTeachers);
    const validation = validateSchoolData(updatedTeachers, updatedClasses, get().subjects, get().rooms, get().settings);
    set({ teachers: updatedTeachers, classes: updatedClasses, validation });
  },

  updateTeacher: (id, teacherData) => {
    const updatedTeachers = get().teachers.map((t) => (t.id === id ? { ...t, ...teacherData } : t));
    
    // Sync classes curriculum if classAllocations are provided
    let updatedClasses = get().classes;
    if (teacherData.classAllocations) {
      updatedClasses = syncClassesWithTeacherAllocations(updatedClasses, id, teacherData.classAllocations);
      storageService.saveClasses(updatedClasses);
    }

    storageService.saveTeachers(updatedTeachers);
    const validation = validateSchoolData(updatedTeachers, updatedClasses, get().subjects, get().rooms, get().settings);
    set({ teachers: updatedTeachers, classes: updatedClasses, validation });
  },

  deleteTeacher: (id) => {
    const updatedTeachers = get().teachers.filter((t) => t.id !== id);
    // Unassign this teacher from classes curriculum without deleting the subject row
    const updatedClasses = get().classes.map((cls) => ({
      ...cls,
      curriculum: cls.curriculum.map((req) => (req.teacherId === id ? { ...req, teacherId: '' } : req)),
    }));
    storageService.saveTeachers(updatedTeachers);
    storageService.saveClasses(updatedClasses);
    const validation = validateSchoolData(updatedTeachers, updatedClasses, get().subjects, get().rooms, get().settings);
    set({ teachers: updatedTeachers, classes: updatedClasses, validation });
  },

  batchAddTeachers: (newTeachersData) => {
    const newTeachers = newTeachersData.map((t, idx) => ({
      ...t,
      id: `tch_${Date.now()}_${idx}`,
    }));
    const updated = [...get().teachers, ...newTeachers];
    storageService.saveTeachers(updated);
    const validation = validateSchoolData(updated, get().classes, get().subjects, get().rooms, get().settings);
    set({ teachers: updated, validation });
  },

  // Classes
  addClass: (classData) => {
    const id = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newClass: SchoolClass = { ...classData, id };
    const updated = [...get().classes, newClass];
    storageService.saveClasses(updated);
    const validation = validateSchoolData(get().teachers, updated, get().subjects, get().rooms, get().settings);
    set({ classes: updated, validation });
  },

  updateClass: (id, classData) => {
    const updated = get().classes.map((c) => (c.id === id ? { ...c, ...classData } : c));
    storageService.saveClasses(updated);
    const validation = validateSchoolData(get().teachers, updated, get().subjects, get().rooms, get().settings);
    set({ classes: updated, validation });
  },

  deleteClass: (id) => {
    const updated = get().classes.filter((c) => c.id !== id);
    storageService.saveClasses(updated);
    const validation = validateSchoolData(get().teachers, updated, get().subjects, get().rooms, get().settings);
    set({ classes: updated, validation });
  },

  // Subjects
  addSubject: (subjectData) => {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSubject: Subject = { ...subjectData, id };
    const updated = [...get().subjects, newSubject];
    storageService.saveSubjects(updated);
    const validation = validateSchoolData(get().teachers, get().classes, updated, get().rooms, get().settings);
    set({ subjects: updated, validation });
  },

  updateSubject: (id, subjectData) => {
    const updated = get().subjects.map((s) => (s.id === id ? { ...s, ...subjectData } : s));
    storageService.saveSubjects(updated);
    const validation = validateSchoolData(get().teachers, get().classes, updated, get().rooms, get().settings);
    set({ subjects: updated, validation });
  },

  deleteSubject: (id) => {
    const updatedSubjects = get().subjects.filter((s) => s.id !== id);
    // Prune deleted subject from all classes curriculum
    const updatedClasses = get().classes.map((cls) => ({
      ...cls,
      curriculum: cls.curriculum.filter((req) => req.subjectId !== id),
    }));
    // Remove from teachers subjectIds
    const updatedTeachers = get().teachers.map((tch) => ({
      ...tch,
      subjectIds: tch.subjectIds.filter((sId) => sId !== id),
    }));

    storageService.saveSubjects(updatedSubjects);
    storageService.saveClasses(updatedClasses);
    storageService.saveTeachers(updatedTeachers);
    const validation = validateSchoolData(updatedTeachers, updatedClasses, updatedSubjects, get().rooms, get().settings);
    set({ subjects: updatedSubjects, classes: updatedClasses, teachers: updatedTeachers, validation });
  },

  autoFixCurriculums: () => {
    const validSubjectIds = new Set(get().subjects.map((s) => s.id));
    const currentTeachers = get().teachers;
    const currentClasses = get().classes;
    
    // 1. Build class curriculums directly from the teachers' own classAllocations
    const classCurriculumMap = new Map<string, CurriculumRequirement[]>();
    currentTeachers.forEach((t) => {
      (t.classAllocations || []).forEach((alloc) => {
        if (!alloc.classId || !alloc.subjectId || (Number(alloc.lessonsPerWeek) || 0) <= 0) return;
        if (!validSubjectIds.has(alloc.subjectId)) return;
        const list = classCurriculumMap.get(alloc.classId) || [];
        list.push({
          id: `req_${alloc.classId}_${alloc.subjectId}_${t.id}`,
          subjectId: alloc.subjectId,
          teacherId: t.id,
          lessonsPerWeek: Number(alloc.lessonsPerWeek),
        });
        classCurriculumMap.set(alloc.classId, list);
      });
    });

    const fixedClasses = currentClasses.map((cls) => {
      const fromTeachers = classCurriculumMap.get(cls.id);
      if (fromTeachers && fromTeachers.length > 0) {
        return {
          ...cls,
          curriculum: fromTeachers,
        };
      }
      return cls;
    });

    // 2. Count actual assigned hours per teacher
    const teacherAssignedHours: Record<string, number> = {};
    fixedClasses.forEach((cls) => {
      cls.curriculum.forEach((req) => {
        if (req.teacherId) {
          teacherAssignedHours[req.teacherId] = (teacherAssignedHours[req.teacherId] || 0) + req.lessonsPerWeek;
        }
      });
    });

    // 3. Settings: ensure periodsPerDay is at least 7
    let updatedSettings = { ...get().settings };
    const newPeriods: Record<number, number> = {};
    updatedSettings.workingDays.forEach((d) => {
      newPeriods[d] = Math.max(7, updatedSettings.periodsPerDay[d] || 7);
    });
    updatedSettings.periodsPerDay = newPeriods;

    // 4. Update teachers WITHOUT removing any teacher or their allocations!
    const fixedTeachers = currentTeachers.map((t) => {
      const assigned = teacherAssignedHours[t.id] || 0;
      let newAvail = { ...t.availability };

      const isGulnozaSlux =
        t.id === 'tch_gulnoza_slux' ||
        t.fullName.toLowerCase().includes('slux') ||
        (t.subjectIds.includes('slux') && t.fullName.toLowerCase().includes('gulnoza'));

      if (isGulnozaSlux) {
        // Strictly set as on the photo: Mon-Fri, period 1: false, periods 2-4: true, periods 5-7: false
        const gulnozaAvail: Record<string, boolean> = {};
        [1, 2, 3, 4, 5].forEach((d) => {
          for (let p = 1; p <= 7; p++) {
            gulnozaAvail[`${d}-${p}`] = p >= 2 && p <= 4;
          }
        });
        newAvail = gulnozaAvail;
      } else {
        // Count how many open slots the teacher has
        let openSlots = 0;
        updatedSettings.workingDays.forEach((d) => {
          for (let p = 1; p <= 7; p++) {
            const key = `${d}-${p}`;
            if (newAvail[key] !== false) openSlots++;
          }
        });

        // If teacher has too few available slots to fit their workload, auto-open 1..7 for this teacher
        if (openSlots < assigned || (assigned >= 15 && openSlots < assigned + 3)) {
          updatedSettings.workingDays.forEach((d) => {
            for (let p = 1; p <= 7; p++) {
              newAvail[`${d}-${p}`] = true;
            }
          });
        } else {
          // Keep user custom checkmarks, ensure undefined slots are true
          updatedSettings.workingDays.forEach((d) => {
            for (let p = 1; p <= 7; p++) {
              const key = `${d}-${p}`;
              if (newAvail[key] === undefined) {
                newAvail[key] = true;
              }
            }
          });
        }
      }

      return {
        ...t,
        weeklyLoad: Math.max(t.weeklyLoad || 0, assigned),
        maxLessonsPerDay: Math.max(t.maxLessonsPerDay || 5, Math.ceil(assigned / updatedSettings.workingDays.length) + 1, isGulnozaSlux ? 4 : 6),
        availability: newAvail,
      };
    });

    storageService.saveClasses(fixedClasses);
    storageService.saveTeachers(fixedTeachers);
    storageService.saveSettings(updatedSettings);

    const validation = validateSchoolData(fixedTeachers, fixedClasses, get().subjects, get().rooms, updatedSettings);
    set({
      classes: fixedClasses,
      teachers: fixedTeachers,
      settings: updatedSettings,
      validation,
    });
  },

  // Classrooms
  addClassroom: (roomData) => {
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRoom: Classroom = { ...roomData, id };
    const updated = [...get().rooms, newRoom];
    storageService.saveRooms(updated);
    const validation = validateSchoolData(get().teachers, get().classes, get().subjects, updated, get().settings);
    set({ rooms: updated, validation });
  },

  updateClassroom: (id, roomData) => {
    const updated = get().rooms.map((r) => (r.id === id ? { ...r, ...roomData } : r));
    storageService.saveRooms(updated);
    const validation = validateSchoolData(get().teachers, get().classes, get().subjects, updated, get().settings);
    set({ rooms: updated, validation });
  },

  deleteClassroom: (id) => {
    const updated = get().rooms.filter((r) => r.id !== id);
    storageService.saveRooms(updated);
    const validation = validateSchoolData(get().teachers, get().classes, get().subjects, updated, get().settings);
    set({ rooms: updated, validation });
  },

  runValidation: () => {
    const validation = validateSchoolData(
      get().teachers,
      get().classes,
      get().subjects,
      get().rooms,
      get().settings
    );
    set({ validation });
    return validation;
  },

  loadDemoData: () => {
    storageService.saveSettings(INITIAL_SETTINGS);
    storageService.saveTeachers(INITIAL_TEACHERS);
    storageService.saveClasses(INITIAL_CLASSES);
    storageService.saveSubjects(INITIAL_SUBJECTS);
    storageService.saveRooms(INITIAL_ROOMS);
    const validation = validateSchoolData(
      INITIAL_TEACHERS,
      INITIAL_CLASSES,
      INITIAL_SUBJECTS,
      INITIAL_ROOMS,
      INITIAL_SETTINGS
    );
    set({
      settings: INITIAL_SETTINGS,
      teachers: INITIAL_TEACHERS,
      classes: INITIAL_CLASSES,
      subjects: INITIAL_SUBJECTS,
      rooms: INITIAL_ROOMS,
      validation,
    });
  },

  clearAllData: () => {
    storageService.clearAll();
    const emptySettings: ScheduleSettings = {
      schoolName: 'Новая школа',
      academicYear: '2026-2027',
      workingDays: [1, 2, 3, 4, 5],
      periodsPerDay: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 },
      periodTimes: INITIAL_SETTINGS.periodTimes,
      defaultLessonDurationMinutes: 45,
      defaultBreakDurationMinutes: 10,
      allowDoubleLessonsDefault: true,
      maxDifficultSubjectsPerDay: 3,
      shiftCount: 1,
    };
    const emptyValidation = validateSchoolData([], [], [], [], emptySettings);
    set({
      settings: emptySettings,
      teachers: [],
      classes: [],
      subjects: [],
      rooms: [],
      validation: emptyValidation,
    });
  },

  importProject: (data) => {
    storageService.saveSettings(data.settings);
    storageService.saveTeachers(data.teachers);
    storageService.saveClasses(data.classes);
    storageService.saveSubjects(data.subjects);
    storageService.saveRooms(data.rooms);
    if (data.schedule) {
      storageService.saveSchedule(data.schedule);
    }
    const validation = validateSchoolData(data.teachers, data.classes, data.subjects, data.rooms, data.settings);
    set({
      settings: data.settings,
      teachers: data.teachers,
      classes: data.classes,
      subjects: data.subjects,
      rooms: data.rooms,
      validation,
    });
  },
}));
