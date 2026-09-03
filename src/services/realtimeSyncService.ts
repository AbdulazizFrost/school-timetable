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

export interface RealtimeBroadcastMessage {
  type: 'HEARTBEAT' | 'ACTION' | 'SCHEDULE_SYNC';
  peer: Omit<RealtimePeer, 'isMe'>;
  actionTitle?: string;
  actionDetails?: string;
  scheduleEntries?: ScheduleEntry[];
  conflictsCount?: number;
  time: number;
}

const SYNC_TOPIC = 'school_live_timetable_abdulaziz_main';
const STORAGE_KEY_CLIENT_ID = 'school_realtime_client_id';

class RealtimeSyncService {
  private clientId: string = '';
  private ip: string = 'Загрузка...';
  private locationInfo: string = '';
  private activePeers: Map<string, RealtimePeer> = new Map();
  private subscribers: Set<(peers: RealtimePeer[], latestSchedule?: ScheduleEntry[], lastAction?: string) => void> = new Set();
  private currentActivePage: string = 'dashboard';
  private lastActionText: string = 'Вошёл в приложение';
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
    // Generate persistent client ID for this browser tab/session
    let storedId = sessionStorage.getItem(STORAGE_KEY_CLIENT_ID);
    if (!storedId) {
      storedId = `user_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString().slice(-4)}`;
      sessionStorage.setItem(STORAGE_KEY_CLIENT_ID, storedId);
    }
    this.clientId = storedId;

    // Fetch real IP
    this.fetchRealIp();

    // Start Realtime SSE connection and Heartbeat
    this.startListening();
    this.startHeartbeat();
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

    // Try getting geo info
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
      return { device: 'PC', browser: 'Web', resolution: '1920x1080' };
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
    try {
      await fetch(`https://ntfy.sh/${SYNC_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': payload.type,
          'Priority': payload.type === 'ACTION' ? 'high' : 'low',
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // ignore network hiccups
    }
  }

  private startHeartbeat() {
    // Send immediate heartbeat
    this.sendPayload({
      type: 'HEARTBEAT',
      peer: this.getMyPeer(),
      time: Date.now(),
    });

    // Loop every 6 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendPayload({
        type: 'HEARTBEAT',
        peer: this.getMyPeer(),
        time: Date.now(),
      });
      this.cleanExpiredPeers();
    }, 6000);
  }

  private startListening() {
    try {
      // Connect using Server-Sent Events (SSE) for instant sub-second delivery
      this.sseSource = new EventSource(`https://ntfy.sh/${SYNC_TOPIC}/sse`);
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
        // If SSE fails or drops, start fallback JSON polling
        this.fallbackPolling();
      };
    } catch {
      this.fallbackPolling();
    }
  }

  private fallbackPolling() {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`https://ntfy.sh/${SYNC_TOPIC}/json?poll=1&since=20s`);
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
    }, 4000);
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

    if (msg.scheduleEntries && !isMe) {
      this.latestRemoteSchedule = msg.scheduleEntries;
    }

    this.cleanExpiredPeers();
    this.notifySubscribers(msg.actionTitle);
  }

  private cleanExpiredPeers() {
    const now = Date.now();
    // A peer is considered online if seen in last 25 seconds
    this.activePeers.forEach((peer, key) => {
      if (now - peer.lastSeen > 25000 && !peer.isMe) {
        this.activePeers.delete(key);
      }
    });

    // Make sure 'me' is always in active peers
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
    // Immediate call with current state
    this.cleanExpiredPeers();
    callback(Array.from(this.activePeers.values()), this.latestRemoteSchedule || undefined);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Broadcast an action and the current schedule state over the network
   */
  public broadcastAction(actionTitle: string, actionDetails: string, scheduleEntries?: ScheduleEntry[]) {
    this.lastActionText = actionTitle;
    const payload: RealtimeBroadcastMessage = {
      type: 'ACTION',
      peer: this.getMyPeer(),
      actionTitle,
      actionDetails,
      scheduleEntries,
      time: Date.now(),
    };

    // Update local self peer
    this.activePeers.set(this.clientId, {
      ...this.getMyPeer(),
      isMe: true,
      lastSeen: Date.now(),
    });

    this.sendPayload(payload);
    this.notifySubscribers(actionTitle);
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
