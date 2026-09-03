import { create } from 'zustand';
import confetti from 'canvas-confetti';
import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { ScheduleConflict } from '../types/constraints';
import { GenerationProgress, Schedule, ScheduleEntry, ScheduleScore, ScheduleViewMode } from '../types/schedule';
import { checkHardConstraints, isSlotValid } from '../scheduler/constraints';
import { optimizeSchedule } from '../scheduler/optimizer';
import { solveCSP } from '../scheduler/schedulerEngine';
import { calculateScheduleScore } from '../scheduler/scoring';
import { validateSchoolData } from '../scheduler/validator';
import { storageService } from '../services/storageService';
import { auditService } from '../services/auditService';
import { useSchoolStore } from './useSchoolStore';

interface ScheduleState {
  schedule: Schedule | null;
  undoStack: ScheduleEntry[][];
  redoStack: ScheduleEntry[][];

  // Generation state
  isGenerating: boolean;
  isOptimizing: boolean;
  generationProgress: GenerationProgress;
  diagnosticsModalOpen: boolean;
  fatalErrors: string[];

  // View state
  viewMode: ScheduleViewMode;
  selectedEntityId: string;
  filterDay?: number;
  showAllInGrid: boolean;
  conflictDrawerOpen: boolean;

  // Manual editing modals
  editModalOpen: boolean;
  editingEntry: ScheduleEntry | null;
  newEntrySlot: { classId?: string; day: number; period: number } | null;
  swapModalOpen: boolean;
  swapPair: { source: ScheduleEntry; target: ScheduleEntry } | null;

  // Actions
  setViewMode: (mode: ScheduleViewMode) => void;
  setSelectedEntityId: (id: string) => void;
  setFilterDay: (day?: number) => void;
  setShowAllInGrid: (show: boolean) => void;
  setConflictDrawerOpen: (open: boolean) => void;
  setDiagnosticsModalOpen: (open: boolean) => void;
  setEditModalOpen: (open: boolean, entry?: ScheduleEntry | null, newSlot?: { classId?: string; day: number; period: number } | null) => void;
  setSwapModalOpen: (open: boolean, pair?: { source: ScheduleEntry; target: ScheduleEntry } | null) => void;

  // Core Schedule Actions
  pushHistory: (newEntries: ScheduleEntry[]) => void;
  generateSchedule: () => Promise<boolean>;
  optimizeCurrentSchedule: () => Promise<boolean>;
  moveEntry: (entryId: string, targetDay: number, targetPeriod: number, force?: boolean) => boolean;
  swapEntries: (sourceId: string, targetId: string) => boolean;
  addOrUpdateEntry: (entry: Partial<ScheduleEntry> & { classId: string; subjectId: string; teacherId: string; day: number; period: number; classroomId: string }) => boolean;
  deleteEntry: (entryId: string) => void;
  toggleEntryLock: (entryId: string) => void;
  cloneSchedule: () => void;
  clearSchedule: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

import { INITIAL_CLASSES, INITIAL_ROOMS, INITIAL_SETTINGS, INITIAL_SUBJECTS, INITIAL_TEACHERS } from '../data/demoData';

const getInitialSchedule = (): Schedule | null => {
  const loaded = storageService.loadSchedule();
  if (loaded && loaded.entries && loaded.entries.length >= 50) {
    return loaded;
  }
  const solveRes = solveCSP(INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
  if (solveRes.success && solveRes.scheduleEntries.length > 0) {
    const optRes = optimizeSchedule(
      solveRes.scheduleEntries as any,
      INITIAL_TEACHERS,
      INITIAL_CLASSES,
      INITIAL_SUBJECTS,
      INITIAL_ROOMS,
      INITIAL_SETTINGS,
      {
        maxIterations: 400,
        maxTimeMs: 1500,
      }
    );
    const finalEntries = optRes.entries;
    const score = calculateScheduleScore(finalEntries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    const hardCheck = checkHardConstraints(finalEntries, INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ROOMS, INITIAL_SETTINGS);
    const prebuilt: Schedule = {
      id: `sch_prebuilt_${Date.now()}`,
      name: `Расписание 2026-2027`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: finalEntries,
      score,
      conflicts: hardCheck.conflicts,
    };
    storageService.saveSchedule(prebuilt);
    return prebuilt;
  }
  return loaded;
};

const loadedSchedule = getInitialSchedule();

const initialProgress: GenerationProgress = {
  stage: 'idle',
  progress: 0,
  message: '',
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedule: loadedSchedule,
  undoStack: [],
  redoStack: [],

  isGenerating: false,
  isOptimizing: false,
  generationProgress: initialProgress,
  diagnosticsModalOpen: false,
  fatalErrors: [],

  viewMode: 'classes',
  selectedEntityId: '',
  filterDay: undefined,
  showAllInGrid: false,
  conflictDrawerOpen: false,

  editModalOpen: false,
  editingEntry: null,
  newEntrySlot: null,
  swapModalOpen: false,
  swapPair: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedEntityId: (id) => set({ selectedEntityId: id }),
  setFilterDay: (day) => set({ filterDay: day }),
  setShowAllInGrid: (show) => set({ showAllInGrid: show }),
  setConflictDrawerOpen: (open) => set({ conflictDrawerOpen: open }),
  setDiagnosticsModalOpen: (open) => set({ diagnosticsModalOpen: open }),
  setEditModalOpen: (open, entry = null, newSlot = null) =>
    set({ editModalOpen: open, editingEntry: entry, newEntrySlot: newSlot }),
  setSwapModalOpen: (open, pair = null) => set({ swapModalOpen: open, swapPair: pair }),

  // History Push Helper
  pushHistory: (newEntries: ScheduleEntry[]) => {
    const currentSchedule = get().schedule;
    if (!currentSchedule) return;

    const undoStack = [...get().undoStack, currentSchedule.entries];
    // Limit stack size to 30
    if (undoStack.length > 30) undoStack.shift();

    const schoolStore = useSchoolStore.getState();
    const hardCheck = checkHardConstraints(
      newEntries,
      schoolStore.teachers,
      schoolStore.classes,
      schoolStore.subjects,
      schoolStore.rooms,
      schoolStore.settings
    );
    const score = calculateScheduleScore(
      newEntries,
      schoolStore.teachers,
      schoolStore.classes,
      schoolStore.subjects,
      schoolStore.rooms,
      schoolStore.settings
    );

    const updatedSchedule: Schedule = {
      ...currentSchedule,
      entries: newEntries,
      score,
      conflicts: hardCheck.conflicts,
      updatedAt: new Date().toISOString(),
    };

    const actionDesc =
      newEntries.length > currentSchedule.entries.length
        ? `Добавлен урок в сетку (всего уроков: ${newEntries.length})`
        : newEntries.length < currentSchedule.entries.length
        ? `Удалён урок из сетки (всего уроков: ${newEntries.length})`
        : `Изменено положение уроков (перемещение/обмен местами)`;

    auditService.logAction({
      actionType: 'schedule_move',
      title: 'Правка расписания составителем',
      description: actionDesc,
      conflicts: hardCheck.conflicts,
      snapshot: currentSchedule.entries,
    });

    storageService.saveSchedule(updatedSchedule);
    set({
      schedule: updatedSchedule,
      undoStack,
      redoStack: [], // clear redo on new action
    });
  },

  undo: () => {
    const { undoStack, schedule, redoStack } = get();
    if (undoStack.length === 0 || !schedule) return;

    const previousEntries = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, undoStack.length - 1);
    const newRedoStack = [schedule.entries, ...redoStack];

    const schoolStore = useSchoolStore.getState();
    const hardCheck = checkHardConstraints(
      previousEntries,
      schoolStore.teachers,
      schoolStore.classes,
      schoolStore.subjects,
      schoolStore.rooms,
      schoolStore.settings
    );
    const score = calculateScheduleScore(
      previousEntries,
      schoolStore.teachers,
      schoolStore.classes,
      schoolStore.subjects,
      schoolStore.rooms,
      schoolStore.settings
    );

    const updatedSchedule: Schedule = {
      ...schedule,
      entries: previousEntries,
      score,
      conflicts: hardCheck.conflicts,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveSchedule(updatedSchedule);
    set({
      schedule: updatedSchedule,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });
  },

  redo: () => {
    const { redoStack, schedule, undoStack } = get();
    if (redoStack.length === 0 || !schedule) return;

    const nextEntries = redoStack[0];
    const newRedoStack = redoStack.slice(1);
    const newUndoStack = [...undoStack, schedule.entries];

    const schoolStore = useSchoolStore.getState();
    const hardCheck = checkHardConstraints(
      nextEntries,
      schoolStore.teachers,
      schoolStore.classes,
      schoolStore.subjects,
      schoolStore.rooms,
      schoolStore.settings
    );
    const score = calculateScheduleScore(
      nextEntries,
      schoolStore.teachers,
      schoolStore.classes,
      schoolStore.subjects,
      schoolStore.rooms,
      schoolStore.settings
    );

    const updatedSchedule: Schedule = {
      ...schedule,
      entries: nextEntries,
      score,
      conflicts: hardCheck.conflicts,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveSchedule(updatedSchedule);
    set({
      schedule: updatedSchedule,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // Schedule Generation
  generateSchedule: async (): Promise<boolean> => {
    const schoolStore = useSchoolStore.getState();
    
    // Automatically apply data cleanups (e.g. remove Russian from 1-A, ensure 7 periods, open matrix)
    schoolStore.autoFixCurriculums();
    
    const { teachers, classes, subjects, rooms, settings } = useSchoolStore.getState();

    // Step 0: Auto-expand daily periods if any class requires more slots than current settings provide
    let maxClassLessons = 0;
    classes.forEach((cls) => {
      const sum = cls.curriculum.reduce((acc, r) => acc + r.lessonsPerWeek, 0);
      if (sum > maxClassLessons) maxClassLessons = sum;
    });

    const workingDaysCount = Math.max(1, settings.workingDays.length);
    const neededPeriods = Math.max(5, Math.ceil(maxClassLessons / workingDaysCount));

    let activeSettings = { ...settings };
    let settingsNeedUpdate = false;
    const updatedPeriods: Record<number, number> = {};
    settings.workingDays.forEach((d) => {
      const cur = settings.periodsPerDay[d] || 5;
      if (cur < neededPeriods) {
        updatedPeriods[d] = neededPeriods;
        settingsNeedUpdate = true;
      } else {
        updatedPeriods[d] = cur;
      }
    });

    if (settingsNeedUpdate) {
      activeSettings.periodsPerDay = updatedPeriods;
      schoolStore.updateSettings(activeSettings);
    }

    const currentSchool = useSchoolStore.getState();
    const currentTeachers = currentSchool.teachers;
    const currentClasses = currentSchool.classes;
    const currentSubjects = currentSchool.subjects;
    const currentRooms = currentSchool.rooms;
    const currentSettings = currentSchool.settings;

    // Step 1: Pre-flight validation
    const validation = schoolStore.runValidation();
    if (!validation.canProceed) {
      const fatalMessages = validation.errors.map((e) => `${e.title}: ${e.message}`);
      set({
        diagnosticsModalOpen: true,
        fatalErrors: fatalMessages,
      });
      return false;
    }

    set({
      isGenerating: true,
      generationProgress: {
        stage: 'validating',
        progress: 10,
        message: 'Анализ данных и структуры классов...',
      },
    });

    try {
      // Use Web Worker if available, with smooth fallback
      let solverWorker: Worker | null = null;
      let usedWorker = false;

      try {
        solverWorker = new Worker(new URL('../scheduler/worker.ts', import.meta.url), {
          type: 'module',
        });
        usedWorker = true;
      } catch (err) {
        console.warn('Web Worker initialization fallback to main thread:', err);
      }

      if (usedWorker && solverWorker) {
        const resultPromise = new Promise<boolean>((resolve) => {
          solverWorker!.onmessage = (e) => {
            const data = e.data;
            if (data.type === 'PROGRESS') {
              set({
                generationProgress: {
                  stage: data.stage || 'solving',
                  progress: data.progress || 0,
                  message: data.message || '',
                  nodesVisited: data.nodesVisited,
                  currentScore: data.currentScore,
                },
              });
            } else if (data.type === 'SUCCESS' && data.result) {
              const newSchedule: Schedule = {
                id: `sch_${Date.now()}`,
                name: `Расписание ${new Date().toLocaleDateString('ru-RU')}`,
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                entries: data.result.entries,
                score: data.result.score,
                conflicts: data.result.conflicts || [],
              };

              storageService.saveSchedule(newSchedule);
              set({
                schedule: newSchedule,
                isGenerating: false,
                generationProgress: {
                  stage: 'completed',
                  progress: 100,
                  message: 'Готово! Расписание успешно составлено.',
                },
                undoStack: [],
                redoStack: [],
              });

              // Fire celebration confetti
              try {
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              } catch (_) {}

              solverWorker?.terminate();
              resolve(true);
            } else if (data.type === 'ERROR') {
              set({
                isGenerating: false,
                diagnosticsModalOpen: true,
                fatalErrors: data.fatalErrors || [data.error || 'Не удалось составить расписание.'],
                generationProgress: {
                  stage: 'failed',
                  progress: 0,
                  message: data.error || 'Ошибка генерации',
                },
              });
              solverWorker?.terminate();
              resolve(false);
            }
          };

          solverWorker!.postMessage({
            type: 'START_GENERATION',
            payload: {
              teachers: currentTeachers,
              classes: currentClasses,
              subjects: currentSubjects,
              rooms: currentRooms,
              settings: currentSettings,
            },
          });
        });

        return await resultPromise;
      } else {
        // Fallback synchronous solver with simulated progress ticks
        set({
          generationProgress: {
            stage: 'solving',
            progress: 25,
            message: 'Инициализация CSP-графа и поиск бесконфликтного решения...',
          },
        });

        await new Promise((r) => setTimeout(r, 60));

        const solveResult = solveCSP(
          currentTeachers,
          currentClasses,
          currentSubjects,
          currentRooms,
          currentSettings,
          {
            maxTimeMs: 12000,
            onProgress: (p, msg, nodes) => {
              set({
                generationProgress: {
                  stage: 'solving',
                  progress: p,
                  message: msg,
                  nodesVisited: nodes,
                },
              });
            },
          }
        );

        if (!solveResult.success) {
          set({
            isGenerating: false,
            diagnosticsModalOpen: true,
            fatalErrors: solveResult.failureReasons || ['Не удалось составить расписание.'],
            generationProgress: {
              stage: 'failed',
              progress: 0,
              message: 'Генерация остановлена из-за ограничений.',
            },
          });
          return false;
        }

        set({
          generationProgress: {
            stage: 'optimizing',
            progress: 90,
            message: 'Оптимизация мягких ограничений и устранение окон...',
          },
        });

        await new Promise((r) => setTimeout(r, 60));

        const optResult = optimizeSchedule(
          solveResult.scheduleEntries as any,
          currentTeachers,
          currentClasses,
          currentSubjects,
          currentRooms,
          currentSettings,
          {
            maxIterations: 600,
            maxTimeMs: 2500,
          }
        );

        const finalEntries = optResult.entries;
        const finalScore = calculateScheduleScore(
          finalEntries,
          currentTeachers,
          currentClasses,
          currentSubjects,
          currentRooms,
          currentSettings
        );
        const hardCheck = checkHardConstraints(
          finalEntries,
          currentTeachers,
          currentClasses,
          currentSubjects,
          currentRooms,
          currentSettings
        );

        const newSchedule: Schedule = {
          id: `sch_${Date.now()}`,
          name: `Расписание ${new Date().toLocaleDateString('ru-RU')}`,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          entries: finalEntries,
          score: finalScore,
          conflicts: hardCheck.conflicts,
        };

        storageService.saveSchedule(newSchedule);

        auditService.logAction({
          actionType: 'schedule_generate',
          title: 'Автогенерация расписания',
          description: `Составлено расписание: ${newSchedule.entries.length} уроков, ${hardCheck.conflicts.length} конфликтов. Оценка качества: ${finalScore.totalScore}/100`,
          conflicts: hardCheck.conflicts,
        });

        set({
          schedule: newSchedule,
          isGenerating: false,
          generationProgress: {
            stage: 'completed',
            progress: 100,
            message: 'Готово!',
          },
          undoStack: [],
          redoStack: [],
        });

        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (_) {}

        return true;
      }
    } catch (err: any) {
      set({
        isGenerating: false,
        diagnosticsModalOpen: true,
        fatalErrors: [err?.message || 'Непредвиденная ошибка при генерации.'],
        generationProgress: {
          stage: 'failed',
          progress: 0,
          message: 'Ошибка',
        },
      });
      return false;
    }
  },

  // Soft optimization of existing schedule
  optimizeCurrentSchedule: async (): Promise<boolean> => {
    const currentSchedule = get().schedule;
    if (!currentSchedule || currentSchedule.entries.length === 0) return false;

    set({ isOptimizing: true });
    const schoolStore = useSchoolStore.getState();

    try {
      const optResult = optimizeSchedule(
        currentSchedule.entries,
        schoolStore.teachers,
        schoolStore.classes,
        schoolStore.subjects,
        schoolStore.rooms,
        schoolStore.settings,
        {
          maxIterations: 1000,
          maxTimeMs: 3000,
        }
      );

      if (optResult.improved) {
        auditService.logAction({
          actionType: 'schedule_optimize',
          title: 'Оптимизация окон',
          description: `Оптимизированы разрывы и окна у учителей (устранено окон: ${optResult.gapsEliminated}). Оценка: ${optResult.finalScore}/100`,
        });
        get().pushHistory(optResult.entries);
        try {
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.7 },
          });
        } catch (_) {}
      }

      set({ isOptimizing: false });
      return true;
    } catch (err) {
      set({ isOptimizing: false });
      return false;
    }
  },

  moveEntry: (entryId, targetDay, targetPeriod, force = false): boolean => {
    const currentSchedule = get().schedule;
    if (!currentSchedule) return false;

    const entry = currentSchedule.entries.find((e) => e.id === entryId);
    if (!entry) return false;

    const isKelajak = entry.subjectId === 'kelajak-darsi' || entry.subjectId.toLowerCase().includes('kelajak');
    if (isKelajak) {
      alert('Этот урок зафиксирован: Kelajak darsi проходит каждый понедельник на 1-м уроке.');
      return false;
    }

    if (targetDay === 1 && targetPeriod === 1) {
      alert('Этот слот зафиксирован: Понедельник 1-й урок закреплён за Kelajak darsi.');
      return false;
    }

    const schoolStore = useSchoolStore.getState();
    const otherEntries = currentSchedule.entries.filter((e) => e.id !== entryId);
    const teacher = schoolStore.teachers.find((t) => t.id === entry.teacherId);

    if (!force) {
      // Validate slot
      const valid = isSlotValid(
        entry.classId,
        entry.teacherId,
        entry.classroomId,
        targetDay,
        targetPeriod,
        otherEntries,
        teacher,
        teacher?.maxLessonsPerDay || 6
      );

      // Check if another lesson already exists for this class at target slot
      const targetOccupiedBySameClass = currentSchedule.entries.find(
        (e) => e.classId === entry.classId && e.day === targetDay && e.period === targetPeriod && e.id !== entryId
      );

      if (targetOccupiedBySameClass) {
        // Trigger swap prompt
        set({
          swapModalOpen: true,
          swapPair: { source: entry, target: targetOccupiedBySameClass },
        });
        return false;
      }
    }

    const newEntries = currentSchedule.entries.map((e) =>
      e.id === entryId ? { ...e, day: targetDay, period: targetPeriod } : e
    );

    get().pushHistory(newEntries);
    return true;
  },

  swapEntries: (sourceId, targetId): boolean => {
    const currentSchedule = get().schedule;
    if (!currentSchedule) return false;

    const source = currentSchedule.entries.find((e) => e.id === sourceId);
    const target = currentSchedule.entries.find((e) => e.id === targetId);
    if (!source || !target) return false;

    const isKelajakSource = source.subjectId === 'kelajak-darsi' || source.subjectId.toLowerCase().includes('kelajak');
    const isKelajakTarget = target.subjectId === 'kelajak-darsi' || target.subjectId.toLowerCase().includes('kelajak');
    if (isKelajakSource || isKelajakTarget) {
      alert('Этот урок зафиксирован: Kelajak darsi проходит каждый понедельник на 1-м уроке.');
      return false;
    }

    const newEntries = currentSchedule.entries.map((e) => {
      if (e.id === sourceId) return { ...e, day: target.day, period: target.period };
      if (e.id === targetId) return { ...e, day: source.day, period: source.period };
      return e;
    });

    get().pushHistory(newEntries);
    set({ swapModalOpen: false, swapPair: null });
    return true;
  },

  addOrUpdateEntry: (entryData): boolean => {
    const currentSchedule = get().schedule;
    const newEntryId = entryData.id || `entry_man_${Date.now()}`;
    let newEntries: ScheduleEntry[] = [];

    if (!currentSchedule) {
      const singleEntry: ScheduleEntry = {
        id: newEntryId,
        classId: entryData.classId,
        subjectId: entryData.subjectId,
        teacherId: entryData.teacherId,
        classroomId: entryData.classroomId,
        day: entryData.day,
        period: entryData.period,
        isManual: true,
      };
      newEntries = [singleEntry];
      const schoolStore = useSchoolStore.getState();
      const score = calculateScheduleScore(newEntries, schoolStore.teachers, schoolStore.classes, schoolStore.subjects, schoolStore.rooms, schoolStore.settings);
      const hardCheck = checkHardConstraints(newEntries, schoolStore.teachers, schoolStore.classes, schoolStore.subjects, schoolStore.rooms, schoolStore.settings);

      const sch: Schedule = {
        id: `sch_${Date.now()}`,
        name: 'Расписание',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entries: newEntries,
        score,
        conflicts: hardCheck.conflicts,
      };
      storageService.saveSchedule(sch);
      set({ schedule: sch, editModalOpen: false, editingEntry: null, newEntrySlot: null });
      return true;
    }

    const existingIndex = currentSchedule.entries.findIndex((e) => e.id === entryData.id);
    if (existingIndex >= 0) {
      newEntries = currentSchedule.entries.map((e) =>
        e.id === entryData.id ? ({ ...e, ...entryData } as ScheduleEntry) : e
      );
    } else {
      newEntries = [
        ...currentSchedule.entries,
        {
          id: newEntryId,
          classId: entryData.classId,
          subjectId: entryData.subjectId,
          teacherId: entryData.teacherId,
          classroomId: entryData.classroomId,
          day: entryData.day,
          period: entryData.period,
          isManual: true,
        },
      ];
    }

    get().pushHistory(newEntries);
    set({ editModalOpen: false, editingEntry: null, newEntrySlot: null });
    return true;
  },

  deleteEntry: (entryId) => {
    const currentSchedule = get().schedule;
    if (!currentSchedule) return;

    const newEntries = currentSchedule.entries.filter((e) => e.id !== entryId);
    get().pushHistory(newEntries);
  },

  toggleEntryLock: (entryId) => {
    const currentSchedule = get().schedule;
    if (!currentSchedule) return;

    const newEntries = currentSchedule.entries.map((e) =>
      e.id === entryId ? { ...e, isLocked: !e.isLocked } : e
    );
    get().pushHistory(newEntries);
  },

  cloneSchedule: () => {
    const currentSchedule = get().schedule;
    if (!currentSchedule) return;

    const cloned: Schedule = {
      ...currentSchedule,
      id: `sch_${Date.now()}`,
      name: `${currentSchedule.name} (Копия)`,
      version: currentSchedule.version + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storageService.saveSchedule(cloned);
    set({ schedule: cloned, undoStack: [], redoStack: [] });
  },

  clearSchedule: () => {
    const cur = get().schedule;
    auditService.logAction({
      actionType: 'schedule_clear',
      title: 'Очистка расписания',
      description: 'Расписание полностью очищено составителем',
      snapshot: cur?.entries,
    });
    storageService.saveSchedule(null);
    set({ schedule: null, undoStack: [], redoStack: [] });
  },
}));
