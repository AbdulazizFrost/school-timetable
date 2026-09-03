import { ScheduleEntry } from '../types/schedule';

export interface RealtimePeer {
  clientId: string;
  ip: string;
  device: string;
  browser: string;
  screenResolution: string;
  activePage: string;
  lastAction: string;
  lastSeen: number; // timestamp ms
  isMe: boolean;
  country?: string;
  city?: string;
}

export type RealtimeMessageType =
  | 'HEARTBEAT'
  | 'ACTION'
  | 'SCHEDULE_SYNC'
  | 'SCHOOL_DATA_SYNC'
  | 'REQUEST_FULL_SYNC'
  | 'RESPONSE_FULL_SYNC';

export interface RealtimeBroadcastMessage {
  type: RealtimeMessageType;
  roomId: string;
  peer: Omit<RealtimePeer, 'isMe'>;
  targetClientId?: string; // If direct reply to specific peer
  actionTitle?: string;
  actionDetails?: string;
  scheduleEntries?: ScheduleEntry[];
  schoolData?: any;
  conflictsCount?: number;
  time: number;
}

const STORAGE_KEY_CLIENT_ID = 'school_realtime_client_id';
const STORAGE_KEY_ROOM_ID = 'school_teamwork_room_id';
const DEFAULT_ROOM_ID = 'school_team_777';

class RealtimeSyncService {
  private clientId: string = '';
  private roomId: string = DEFAULT_ROOM_ID;
  private ip: string = 'Загрузка...';
  private locationInfo: string = '';
  private activePeers: Map<string, RealtimePeer> = new Map();
  private subscribers: Set<(peers: RealtimePeer[], latestSchedule?: ScheduleEntry[], lastAction?: string) => void> = new Set();
  
  // Remote sync listeners
  private scheduleListeners: Set<(entries: ScheduleEntry[], actionTitle?: string) => void> = new Set();
  private schoolDataListeners: Set<(data: any, actionTitle?: string) => void> = new Set();
  private syncRequestListeners: Set<(requesterId: string) => void> = new Set();
  private syncResponseListeners: Set<(state: { schedule?: any; schoolData?: any }) => void> = new Set();

  private currentActivePage: string = 'dashboard';
  private lastActionText: string = 'Вошёл в проект';
  private heartbeatInterval: any = null;
  private pollInterval: any = null;
  private sseSource: EventSource | null = null;
  private latestRemoteSchedule: ScheduleEntry[] | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initClient();
    }
  }

  private initClient() {
    // 1. Client ID
    let storedId = sessionStorage.getItem(STORAGE_KEY_CLIENT_ID);
    if (!storedId) {
      storedId = `user_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString().slice(-4)}`;
      sessionStorage.setItem(STORAGE_KEY_CLIENT_ID, storedId);
    }
    this.clientId = storedId;

    // 2. Room ID from URL ?room=... or localStorage
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = urlParams.get('room');
      if (urlRoom && urlRoom.trim()) {
        this.roomId = urlRoom.trim();
        localStorage.setItem(STORAGE_KEY_ROOM_ID, this.roomId);
      } else {
        const storedRoom = localStorage.getItem(STORAGE_KEY_ROOM_ID);
        if (storedRoom) {
          this.roomId = storedRoom;
        } else {
          this.roomId = DEFAULT_ROOM_ID;
          localStorage.setItem(STORAGE_KEY_ROOM_ID, this.roomId);
        }
      }
    } catch {
      this.roomId = DEFAULT_ROOM_ID;
    }

    // 3. Fetch real IP & Geo
    this.fetchRealIp();

    // 4. Start connection
    this.connectRoom(this.roomId);
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getInviteUrl(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
  }

  public setRoomId(newRoom: string) {
    if (!newRoom || newRoom === this.roomId) return;
    this.roomId = newRoom.trim();
    localStorage.setItem(STORAGE_KEY_ROOM_ID, this.roomId);

    // Update URL query parameter without full reload
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', this.roomId);
      window.history.replaceState({}, '', url.toString());
    } catch {}

    this.connectRoom(this.roomId);
  }

  private connectRoom(room: string) {
    if (this.sseSource) {
      try {
        this.sseSource.close();
      } catch {}
      this.sseSource = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.activePeers.clear();

    const topic = `school_collab_${room}`;

    // Start SSE
    this.startListening(topic);
    // Start Heartbeat
    this.startHeartbeat(topic);

    // Request full state sync from any existing peer in the room
    setTimeout(() => {
      this.requestFullSync();
    }, 1500);
  }

  private async fetchRealIp() {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      if (res.ok) {
        const data = await res.json();
        this.ip = data.ip || '84.54.71.225';
      }
    } catch {
      this.ip = '84.54.71.225';
    }

    try {
      const geoRes = await fetch(`https://ipapi.co/${this.ip}/json/`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.city && geoData.country_name) {
          this.locationInfo = `${geoData.city}, ${geoData.country_name}`;
        }
      }
    } catch {}
  }

  public setActivePage(page: string) {
    this.currentActivePage = page;
  }

  public getDeviceInfo(): { device: string; browser: string; resolution: string } {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { device: 'ПК / Компьютер', browser: 'Web', resolution: '1920x1080' };
    }

    const ua = navigator.userAgent;
    let device = 'ПК / Компьютер';
    if (/iPad|iPhone|iPod/.test(ua)) device = 'iPhone / iPad (iOS)';
    else if (/Android/.test(ua)) device = 'Android Смартфон';
    else if (/Macintosh/.test(ua)) device = 'Mac / macOS';
    else if (/Windows/.test(ua)) device = 'Windows 11 / 10 (ПК)';
    else if (/Linux/.test(ua)) device = 'Linux Компьютер';

    let browser = 'Браузер';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';

    const resolution = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;

    return { device, browser, resolution };
  }

  private getMyPeer(): Omit<RealtimePeer, 'isMe'> {
    const { device, browser, resolution } = this.getDeviceInfo();
    return {
      clientId: this.clientId,
      ip: this.ip,
      device,
      browser,
      screenResolution: resolution,
      activePage: this.currentActivePage,
      lastAction: this.lastActionText,
      lastSeen: Date.now(),
      city: this.locationInfo,
    };
  }

  private async sendPayload(payload: RealtimeBroadcastMessage) {
    const topic = `school_collab_${this.roomId}`;
    try {
      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: {
          Title: payload.type,
          Priority: payload.type === 'ACTION' || payload.type === 'SCHEDULE_SYNC' ? 'high' : 'low',
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // network hiccup
    }
  }

  private startHeartbeat(topic: string) {
    // Initial heartbeat
    this.sendPayload({
      type: 'HEARTBEAT',
      roomId: this.roomId,
      peer: this.getMyPeer(),
      time: Date.now(),
    });

    // Send heartbeat every 6 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendPayload({
        type: 'HEARTBEAT',
        roomId: this.roomId,
        peer: this.getMyPeer(),
        time: Date.now(),
      });
      this.cleanExpiredPeers();
    }, 6000);
  }

  private startListening(topic: string) {
    try {
      this.sseSource = new EventSource(`https://ntfy.sh/${topic}/sse`);
      this.sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message' && data.message) {
            const parsed: RealtimeBroadcastMessage = JSON.parse(data.message);
            this.handleIncomingMessage(parsed);
          }
        } catch {}
      };
      this.sseSource.onerror = () => {
        this.fallbackPolling(topic);
      };
    } catch {
      this.fallbackPolling(topic);
    }
  }

  private fallbackPolling(topic: string) {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=20s`);
        if (res.ok) {
          const text = await res.text();
          const lines = text.trim().split('\n');
          lines.forEach((line) => {
            try {
              const item = JSON.parse(line);
              if (item.event === 'message' && item.message) {
                const parsed: RealtimeBroadcastMessage = JSON.parse(item.message);
                this.handleIncomingMessage(parsed);
              }
            } catch {}
          });
        }
      } catch {}
    }, 3500);
  }

  private handleIncomingMessage(msg: RealtimeBroadcastMessage) {
    if (!msg || !msg.peer || !msg.peer.clientId) return;

    const isMe = msg.peer.clientId === this.clientId;
    const peer: RealtimePeer = {
      ...msg.peer,
      isMe,
      lastSeen: msg.time || Date.now(),
    };

    this.activePeers.set(peer.clientId, peer);

    if (isMe) {
      // Ignore own actions
      return;
    }

    // Direct targeted message check
    if (msg.targetClientId && msg.targetClientId !== this.clientId) {
      return;
    }

    // Handle full sync request from a new peer
    if (msg.type === 'REQUEST_FULL_SYNC') {
      this.syncRequestListeners.forEach((cb) => cb(msg.peer.clientId));
      return;
    }

    // Handle full sync response
    if (msg.type === 'RESPONSE_FULL_SYNC' && msg.schoolData) {
      this.syncResponseListeners.forEach((cb) =>
        cb({ schedule: msg.scheduleEntries, schoolData: msg.schoolData })
      );
      if (msg.scheduleEntries) {
        this.latestRemoteSchedule = msg.scheduleEntries;
      }
      return;
    }

    // Handle schedule update
    if (msg.scheduleEntries && (msg.type === 'SCHEDULE_SYNC' || msg.type === 'ACTION')) {
      this.latestRemoteSchedule = msg.scheduleEntries;
      this.scheduleListeners.forEach((cb) => cb(msg.scheduleEntries!, msg.actionTitle));
    }

    // Handle school data update (teachers, classes, etc.)
    if (msg.schoolData && msg.type === 'SCHOOL_DATA_SYNC') {
      this.schoolDataListeners.forEach((cb) => cb(msg.schoolData, msg.actionTitle));
    }

    this.cleanExpiredPeers();
    this.notifySubscribers(msg.actionTitle);
  }

  private cleanExpiredPeers() {
    const now = Date.now();
    this.activePeers.forEach((peer, key) => {
      if (now - peer.lastSeen > 22000 && !peer.isMe) {
        this.activePeers.delete(key);
      }
    });

    const myPeer: RealtimePeer = {
      ...this.getMyPeer(),
      isMe: true,
      lastSeen: now,
    };
    this.activePeers.set(this.clientId, myPeer);
  }

  private notifySubscribers(lastAction?: string) {
    const peersList = Array.from(this.activePeers.values());
    this.subscribers.forEach((cb) => {
      try {
        cb(peersList, this.latestRemoteSchedule || undefined, lastAction);
      } catch {}
    });
  }

  public subscribe(
    callback: (peers: RealtimePeer[], latestSchedule?: ScheduleEntry[], lastAction?: string) => void
  ) {
    this.subscribers.add(callback);
    this.cleanExpiredPeers();
    callback(Array.from(this.activePeers.values()), this.latestRemoteSchedule || undefined);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Broadcast an action and updated schedule to all room members
   */
  public broadcastAction(actionTitle: string, actionDetails: string, scheduleEntries?: ScheduleEntry[]) {
    this.lastActionText = actionTitle;
    const payload: RealtimeBroadcastMessage = {
      type: 'ACTION',
      roomId: this.roomId,
      peer: this.getMyPeer(),
      actionTitle,
      actionDetails,
      scheduleEntries,
      time: Date.now(),
    };

    this.activePeers.set(this.clientId, {
      ...this.getMyPeer(),
      isMe: true,
      lastSeen: Date.now(),
    });

    this.sendPayload(payload);
    this.notifySubscribers(actionTitle);
  }

  /**
   * Broadcast updated school data (teachers, classes, etc.) to all room members
   */
  public broadcastSchoolData(schoolData: any, actionTitle: string) {
    this.lastActionText = actionTitle;
    const payload: RealtimeBroadcastMessage = {
      type: 'SCHOOL_DATA_SYNC',
      roomId: this.roomId,
      peer: this.getMyPeer(),
      actionTitle,
      schoolData,
      time: Date.now(),
    };

    this.sendPayload(payload);
    this.notifySubscribers(actionTitle);
  }

  /**
   * Request full sync from room peers when joining
   */
  public requestFullSync() {
    this.sendPayload({
      type: 'REQUEST_FULL_SYNC',
      roomId: this.roomId,
      peer: this.getMyPeer(),
      time: Date.now(),
    });
  }

  /**
   * Respond to full sync request
   */
  public respondFullSync(targetClientId: string, fullState: { schedule?: any; schoolData?: any }) {
    this.sendPayload({
      type: 'RESPONSE_FULL_SYNC',
      roomId: this.roomId,
      targetClientId,
      peer: this.getMyPeer(),
      scheduleEntries: fullState.schedule?.entries || fullState.schedule,
      schoolData: fullState.schoolData,
      time: Date.now(),
    });
  }

  // Remote listeners registration
  public onRemoteSchedule(cb: (entries: ScheduleEntry[], actionTitle?: string) => void) {
    this.scheduleListeners.add(cb);
    return () => {
      this.scheduleListeners.delete(cb);
    };
  }

  public onRemoteSchoolData(cb: (data: any, actionTitle?: string) => void) {
    this.schoolDataListeners.add(cb);
    return () => {
      this.schoolDataListeners.delete(cb);
    };
  }

  public onRequestSync(cb: (requesterId: string) => void) {
    this.syncRequestListeners.add(cb);
    return () => {
      this.syncRequestListeners.delete(cb);
    };
  }

  public onRemoteSyncResponse(cb: (state: { schedule?: any; schoolData?: any }) => void) {
    this.syncResponseListeners.add(cb);
    return () => {
      this.syncResponseListeners.delete(cb);
    };
  }

  public getOnlinePeers(): RealtimePeer[] {
    this.cleanExpiredPeers();
    return Array.from(this.activePeers.values());
  }

  public getRemoteSchedule(): ScheduleEntry[] | null {
    return this.latestRemoteSchedule;
  }
}

export const realtimeSyncService = new RealtimeSyncService();

