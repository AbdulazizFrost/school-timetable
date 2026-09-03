import { ScheduleConflict } from '../types/constraints';
import { ScheduleEntry } from '../types/schedule';

export type AuditActionType =
  | 'schedule_generate'
  | 'schedule_optimize'
  | 'schedule_move'
  | 'schedule_swap'
  | 'schedule_add_lesson'
  | 'schedule_delete_lesson'
  | 'schedule_clear'
  | 'schedule_clone'
  | 'curriculum_split'
  | 'teacher_edit'
  | 'class_edit'
  | 'room_edit'
  | 'settings_edit'
  | 'demo_load';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  editorName: string; // e.g. "Завуч школы", "Методист"
  deviceInfo: string; // OS, Browser
  actionType: AuditActionType;
  title: string;
  description: string;
  details?: Record<string, any>;
  quality: 'correct' | 'warning' | 'error';
  conflictsCount: number;
  conflictsSummary?: string[];
  snapshot?: ScheduleEntry[]; // for instant revert
}

export interface EditorSession {
  editorName: string;
  role: string;
  startedAt: string;
  lastActiveAt: string;
  device: string;
  browser: string;
  totalActionsCount: number;
}

const STORAGE_KEY_AUDIT = 'school_timetable_audit_log_v1';
const STORAGE_KEY_PIN = 'school_timetable_secret_pin';
const STORAGE_KEY_SESSION = 'school_timetable_editor_session';

const DEFAULT_PIN = '7777';

export const auditService = {
  /**
   * Get Secret PIN code
   */
  getPin: (): string => {
    try {
      return localStorage.getItem(STORAGE_KEY_PIN) || DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  },

  /**
   * Set new Secret PIN code
   */
  setPin: (newPin: string): boolean => {
    try {
      localStorage.setItem(STORAGE_KEY_PIN, newPin.trim() || DEFAULT_PIN);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Verify input PIN
   */
  verifyPin: (inputPin: string): boolean => {
    const current = auditService.getPin();
    return inputPin.trim() === current.trim();
  },

  /**
   * Get Current Editor Session info
   */
  getSession: (): EditorSession => {
    const defaultDevice = typeof navigator !== 'undefined' ? navigator.userAgent : 'Desktop Web';
    const isWindows = defaultDevice.includes('Windows');
    const isMac = defaultDevice.includes('Macintosh');
    const isMobile = defaultDevice.includes('Mobile') || defaultDevice.includes('Android') || defaultDevice.includes('iPhone');

    const osLabel = isWindows ? 'Windows' : isMac ? 'macOS' : isMobile ? 'Мобильное устройство' : 'Linux';
    const browserLabel = defaultDevice.includes('Chrome') ? 'Google Chrome' : defaultDevice.includes('Safari') ? 'Safari' : defaultDevice.includes('Firefox') ? 'Firefox' : 'Web Browser';

    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) {
        const parsed: EditorSession = JSON.parse(stored);
        return {
          ...parsed,
          device: osLabel,
          browser: browserLabel,
        };
      }
    } catch {}

    const newSession: EditorSession = {
      editorName: 'Завуч школы (Составитель)',
      role: 'Заместитель директора по УВР',
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      device: osLabel,
      browser: browserLabel,
      totalActionsCount: 0,
    };

    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
    } catch {}

    return newSession;
  },

  /**
   * Update current editor name/role
   */
  setEditorName: (name: string, role: string = 'Составитель расписания'): void => {
    const current = auditService.getSession();
    const updated: EditorSession = {
      ...current,
      editorName: name.trim() || 'Завуч',
      role: role.trim() || 'Составитель',
      lastActiveAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
    } catch {}
  },

  /**
   * Load Audit Log history
   */
  getLogs: (): AuditLogEntry[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUDIT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Log an action performed by whoever is editing the schedule
   */
  logAction: (entry: {
    actionType: AuditActionType;
    title: string;
    description: string;
    conflicts?: ScheduleConflict[];
    details?: Record<string, any>;
    snapshot?: ScheduleEntry[];
  }): void => {
    try {
      const session = auditService.getSession();
      const conflicts = entry.conflicts || [];
      const conflictsCount = conflicts.length;

      // Quality assessment: does this action introduce conflicts?
      let quality: 'correct' | 'warning' | 'error' = 'correct';
      if (conflictsCount > 0) {
        quality = 'error';
      } else if (entry.actionType === 'schedule_clear') {
        quality = 'warning';
      }

      const logItem: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        editorName: session.editorName,
        deviceInfo: `${session.device} • ${session.browser}`,
        actionType: entry.actionType,
        title: entry.title,
        description: entry.description,
        details: entry.details,
        quality,
        conflictsCount,
        conflictsSummary: conflicts.map((c) => c.message || c.type),
        snapshot: entry.snapshot,
      };

      const existing = auditService.getLogs();
      // Keep up to 300 recent actions
      const updated = [logItem, ...existing].slice(0, 300);
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(updated));

      // Update session activity
      const updatedSession: EditorSession = {
        ...session,
        lastActiveAt: new Date().toISOString(),
        totalActionsCount: (session.totalActionsCount || 0) + 1,
      };
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedSession));
    } catch (err) {
      console.warn('Failed to save audit log:', err);
    }
  },

  /**
   * Clear all audit logs
   */
  clearLogs: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY_AUDIT);
    } catch {}
  },

  /**
   * Get the initial schedule snapshot before modifications
   */
  getInitialSnapshot: (): ScheduleEntry[] | null => {
    const logs = auditService.getLogs();
    // Look for the earliest snapshot in the logs
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].snapshot && logs[i].snapshot!.length > 0) {
        return logs[i].snapshot!;
      }
    }
    return null;
  },

  /**
   * Compare initial entries vs current entries to identify modified cells
   */
  getModifiedEntryIds: (currentEntries: ScheduleEntry[]): Set<string> => {
    const initial = auditService.getInitialSnapshot();
    const modifiedIds = new Set<string>();
    if (!initial || initial.length === 0) return modifiedIds;

    const initialMap = new Map(initial.map((e) => [e.id, e]));

    currentEntries.forEach((cur) => {
      const init = initialMap.get(cur.id);
      if (!init) {
        // Newly added
        modifiedIds.add(cur.id);
      } else if (
        init.day !== cur.day ||
        init.period !== cur.period ||
        init.teacherId !== cur.teacherId ||
        init.classroomId !== cur.classroomId
      ) {
        // Moved or reassigned
        modifiedIds.add(cur.id);
      }
    });

    return modifiedIds;
  },
};
