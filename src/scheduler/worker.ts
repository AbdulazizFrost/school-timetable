import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { checkHardConstraints } from './constraints';
import { optimizeSchedule } from './optimizer';
import { solveCSP } from './schedulerEngine';
import { calculateScheduleScore } from './scoring';
import { validateSchoolData } from './validator';

export interface WorkerMessageRequest {
  type: 'START_GENERATION' | 'OPTIMIZE_SCHEDULE' | 'CANCEL';
  payload: {
    teachers: Teacher[];
    classes: SchoolClass[];
    subjects: Subject[];
    rooms: Classroom[];
    settings: ScheduleSettings;
    existingEntries?: any[];
  };
}

export interface WorkerMessageResponse {
  type: 'PROGRESS' | 'SUCCESS' | 'ERROR';
  stage?: string;
  progress?: number;
  message?: string;
  nodesVisited?: number;
  currentScore?: number;
  result?: {
    entries: any[];
    score: any;
    conflicts: any[];
    elapsedMs: number;
    nodesVisited: number;
  };
  error?: string;
  fatalErrors?: string[];
}

let isCancelled = false;

self.onmessage = (e: MessageEvent<WorkerMessageRequest>) => {
  const { type, payload } = e.data;

  if (type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (type === 'START_GENERATION') {
    isCancelled = false;
    const { teachers, classes, subjects, rooms, settings } = payload;

    // Step 1: Validation
    self.postMessage({
      type: 'PROGRESS',
      stage: 'validating',
      progress: 5,
      message: 'Диагностика данных и проверка условий разрешимости...',
    } as WorkerMessageResponse);

    const validation = validateSchoolData(teachers, classes, subjects, rooms, settings);
    if (!validation.canProceed) {
      const fatalMessages = validation.errors.map((err) => `${err.title}: ${err.message}`);
      self.postMessage({
        type: 'ERROR',
        error: 'Обнаружены критические ошибки в данных школы.',
        fatalErrors: fatalMessages,
      } as WorkerMessageResponse);
      return;
    }

    // Step 2: CSP Solving
    self.postMessage({
      type: 'PROGRESS',
      stage: 'solving',
      progress: 15,
      message: 'Инициализация CSP-графа и эвристик MRV / LCV...',
    } as WorkerMessageResponse);

    const solveResult = solveCSP(teachers, classes, subjects, rooms, settings, {
      maxTimeMs: 12000,
      shouldCancel: () => isCancelled,
      onProgress: (progress, message, nodes) => {
        self.postMessage({
          type: 'PROGRESS',
          stage: 'solving',
          progress,
          message,
          nodesVisited: nodes,
        } as WorkerMessageResponse);
      },
    });

    if (!solveResult.success) {
      self.postMessage({
        type: 'ERROR',
        error: 'Не удалось составить расписание без конфликтов.',
        fatalErrors: solveResult.failureReasons,
      } as WorkerMessageResponse);
      return;
    }

    // Step 3: Soft Optimization
    self.postMessage({
      type: 'PROGRESS',
      stage: 'optimizing',
      progress: 90,
      message: 'Оптимизация мягких ограничений и устранение окон...',
    } as WorkerMessageResponse);

    const optResult = optimizeSchedule(solveResult.scheduleEntries as any, teachers, classes, subjects, rooms, settings, {
      maxIterations: 600,
      maxTimeMs: 2500,
      shouldCancel: () => isCancelled,
      onProgress: (progress, message, currentScore) => {
        self.postMessage({
          type: 'PROGRESS',
          stage: 'optimizing',
          progress: 90 + Math.round(progress * 0.08),
          message,
          currentScore,
        } as WorkerMessageResponse);
      },
    });

    const finalEntries = optResult.entries;
    const finalScore = calculateScheduleScore(finalEntries, teachers, classes, subjects, rooms, settings);
    const conflictsCheck = checkHardConstraints(finalEntries, teachers, classes, subjects, rooms, settings);

    self.postMessage({
      type: 'PROGRESS',
      stage: 'completed',
      progress: 100,
      message: 'Расписание успешно сформировано!',
    } as WorkerMessageResponse);

    self.postMessage({
      type: 'SUCCESS',
      result: {
        entries: finalEntries,
        score: finalScore,
        conflicts: conflictsCheck.conflicts,
        elapsedMs: solveResult.elapsedMs,
        nodesVisited: solveResult.nodesExplored,
      },
    } as WorkerMessageResponse);
  }

  if (type === 'OPTIMIZE_SCHEDULE') {
    isCancelled = false;
    const { teachers, classes, subjects, rooms, settings, existingEntries } = payload;
    if (!existingEntries || existingEntries.length === 0) return;

    self.postMessage({
      type: 'PROGRESS',
      stage: 'optimizing',
      progress: 10,
      message: 'Запуск алгоритма оптимизации...',
    } as WorkerMessageResponse);

    const optResult = optimizeSchedule(existingEntries, teachers, classes, subjects, rooms, settings, {
      maxIterations: 1000,
      maxTimeMs: 4000,
      shouldCancel: () => isCancelled,
      onProgress: (progress, message, currentScore) => {
        self.postMessage({
          type: 'PROGRESS',
          stage: 'optimizing',
          progress,
          message,
          currentScore,
        } as WorkerMessageResponse);
      },
    });

    const finalEntries = optResult.entries;
    const finalScore = calculateScheduleScore(finalEntries, teachers, classes, subjects, rooms, settings);
    const conflictsCheck = checkHardConstraints(finalEntries, teachers, classes, subjects, rooms, settings);

    self.postMessage({
      type: 'SUCCESS',
      result: {
        entries: finalEntries,
        score: finalScore,
        conflicts: conflictsCheck.conflicts,
        elapsedMs: 0,
        nodesVisited: optResult.iterationsRun,
      },
    } as WorkerMessageResponse);
  }
};
