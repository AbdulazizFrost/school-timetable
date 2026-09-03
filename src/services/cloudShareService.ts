import { Classroom, ScheduleSettings, SchoolClass, Subject, Teacher } from '../types';
import { Schedule } from '../types/schedule';

export interface SharedProjectPayload {
  schedule: Schedule;
  schoolData: {
    teachers: Teacher[];
    classes: SchoolClass[];
    subjects: Subject[];
    rooms: Classroom[];
    settings: ScheduleSettings;
  };
  authorName: string;
  createdAt: string;
}

const CLOUD_API_BASE = 'https://api.restful-api.dev/objects';

export const cloudShareService = {
  /**
   * Upload current schedule and school data to cloud, returning clean shareId and full shareUrl
   */
  shareProject: async (
    schedule: Schedule,
    schoolData: {
      teachers: Teacher[];
      classes: SchoolClass[];
      subjects: Subject[];
      rooms: Classroom[];
      settings: ScheduleSettings;
    },
    authorName: string = 'Составитель расписания'
  ): Promise<{ shareId: string; shareUrl: string }> => {
    const payload: SharedProjectPayload = {
      schedule,
      schoolData,
      authorName,
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(CLOUD_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `timetable_${Date.now()}`,
        data: payload,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ошибка загрузки в облако: ${res.status}`);
    }

    const data = await res.json();
    const shareId = data.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;

    return { shareId, shareUrl };
  },

  /**
   * Download project from cloud by ID or full URL
   */
  loadProject: async (shareIdOrUrl: string): Promise<SharedProjectPayload> => {
    let cleanId = shareIdOrUrl.trim();

    // If a full URL was pasted, extract ?share=... or the last segment
    if (cleanId.includes('share=')) {
      try {
        const url = new URL(cleanId);
        const param = url.searchParams.get('share');
        if (param) cleanId = param.trim();
      } catch {
        const match = cleanId.match(/share=([a-zA-Z0-9_-]+)/);
        if (match) cleanId = match[1];
      }
    } else if (cleanId.startsWith('http')) {
      const parts = cleanId.split('/');
      cleanId = parts[parts.length - 1];
    }

    const res = await fetch(`${CLOUD_API_BASE}/${cleanId}`);
    if (!res.ok) {
      throw new Error(`Не удалось найти расписание коллеги по этому коду (${res.status})`);
    }

    const json = await res.json();
    if (!json.data || !json.data.schedule || !json.data.schoolData) {
      throw new Error('Данные в облаке повреждены или имеют устаревший формат');
    }

    return json.data as SharedProjectPayload;
  },

  /**
   * Check if the current page was opened with ?share=...
   */
  getShareIdFromUrl: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('share');
    } catch {
      return null;
    }
  },
};
