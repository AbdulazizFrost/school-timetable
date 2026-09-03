import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Laptop,
  Globe,
  Share2,
  X,
  ExternalLink,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button, cn } from '../common/Button';
import { realtimeSyncService, RealtimePeer } from '../../services/realtimeSyncService';
import { cloudShareService } from '../../services/cloudShareService';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { storageService } from '../../services/storageService';

export interface TeamworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamworkModal: React.FC<TeamworkModalProps> = ({ isOpen, onClose }) => {
  const { language, teachers, classes, subjects, rooms, settings, importProject } = useSchoolStore();
  const { schedule } = useScheduleStore();

  const isUz = language === 'uz';

  const [peers, setPeers] = useState<RealtimePeer[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [customRoomInput, setCustomRoomInput] = useState<string>(realtimeSyncService.getRoomId());
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string>('');

  // Colleague schedule transition state
  const [joinInput, setJoinInput] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');
  const [joinSuccess, setJoinSuccess] = useState<string>('');

  // Share my schedule state
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  useEffect(() => {
    const unsub = realtimeSyncService.subscribe((updatedPeers) => {
      setPeers(updatedPeers);
    });
    return () => unsub();
  }, []);

  const inviteUrl = realtimeSyncService.getInviteUrl();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSwitchRoom = () => {
    if (!customRoomInput.trim()) return;
    realtimeSyncService.setRoomId(customRoomInput.trim());
  };

  const handleForceSync = () => {
    if (schedule) {
      realtimeSyncService.broadcastAction(
        'Принудительная синхронизация проекта',
        `Синхронизировано расписание (${schedule.entries.length} ур.) и данные школы`,
        schedule.entries
      );
      realtimeSyncService.broadcastSchoolData(
        { teachers, classes, subjects, rooms, settings },
        'Синхронизация данных школы'
      );
      setSyncSuccessMsg(
        isUz ? "Loyihaning to'liq holati yuborildi!" : 'Полное состояние проекта отправлено коллеге!'
      );
      setTimeout(() => setSyncSuccessMsg(''), 3500);
    }
  };

  // 1. Enter colleague's schedule
  const handleJoinColleagueSchedule = async () => {
    if (!joinInput.trim()) return;
    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const project = await cloudShareService.loadProject(joinInput.trim());
      // Import school data
      importProject({
        version: '1.0',
        exportedAt: project.createdAt,
        settings: project.schoolData.settings,
        teachers: project.schoolData.teachers,
        classes: project.schoolData.classes,
        subjects: project.schoolData.subjects,
        rooms: project.schoolData.rooms,
        schedule: project.schedule,
      });
      // Import schedule
      useScheduleStore.setState({ schedule: project.schedule });
      storageService.saveSchedule(project.schedule);

      setJoinSuccess(
        isUz
          ? `Muvaffaqiyatli o'tildi! ${project.schedule.entries.length} ta dars yuklandi.`
          : `Вы успешно перешли в расписание коллеги! Загружено ${project.schedule.entries.length} уроков.`
      );

      // Also join his room if present
      if (joinInput.includes('room=')) {
        try {
          const u = new URL(joinInput);
          const r = u.searchParams.get('room');
          if (r) realtimeSyncService.setRoomId(r);
        } catch {}
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setJoinError(err.message || (isUz ? "Xatolik yuz berdi" : 'Не удалось загрузить расписание'));
    } finally {
      setIsJoining(false);
    }
  };

  // 2. Generate share link for my schedule
  const handleGenerateShareLink = async () => {
    if (!schedule) return;
    setIsSharing(true);
    try {
      const res = await cloudShareService.shareProject(schedule, {
        teachers,
        classes,
        subjects,
        rooms,
        settings,
      });
      setShareUrl(res.shareUrl);
      navigator.clipboard.writeText(res.shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSharing(false);
    }
  };

  const otherPeers = peers.filter((p) => !p.isMe);
  const myPeer = peers.find((p) => p.isMe);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={isUz ? "👥 Jamoaviy ishlash va hamkasb jadvaliga o'tish" : "👥 Совместная работа и переход к расписанию коллеги"}
      description={
        isUz
          ? "Hamkasbingiz tuzgan jadvalga o'ting yoki o'zingiznikini unga yuboring"
          : "Перейдите в расписание коллеги или отправьте ему своё расписание для совместной настройки"
      }
    >
      <div className="space-y-5">
        {/* ========================================================================= */}
        {/* 1. ENTER COLLEAGUE'S SCHEDULE (ПЕРЕЙТИ К ЕГО РАСПИСАНИЮ) */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-700/60 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shrink-0">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">
                {isUz ? "📥 Hamkasbingizning dars jadvaliga o'tish" : "📥 Перейти в расписание коллеги"}
              </h4>
              <p className="text-[11px] text-slate-300">
                {isUz
                  ? "Hamkasbingiz yuborgan havola yoki kodni kiriting — uning barcha darslari sizda ochiladi"
                  : "Вставьте ссылку или код, который вам прислал коллега — его расписание сразу откроется на вашем экране"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder={isUz ? "Havolani bu yerga qo'ying (https://...)" : "Вставьте ссылку коллеги (https://.../?share=...)"}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-indigo-600/60 bg-slate-950/80 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <Button
              onClick={handleJoinColleagueSchedule}
              disabled={isJoining || !joinInput.trim()}
              isLoading={isJoining}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs px-4 py-2.5 shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>{isUz ? "Uning ishiga o'tish" : "Перейти в его расписание"}</span>
            </Button>
          </div>

          {joinSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{joinSuccess}</span>
            </div>
          )}

          {joinError && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <X className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. SHARE MY SCHEDULE (ОТПРАВИТЬ СВОЁ РАСПИСАНИЕ КОЛЛЕГЕ) */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900 shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {isUz ? "📤 O'z jadvalingiz havolasini hamkasbga yuborish" : "📤 Отправить своё расписание коллеге"}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isUz
                    ? "Havola yarating va hamkasbingizga yuboring — u sizning ishingizga kiradi"
                    : "Создайте готовую ссылку для коллеги — открыв её, он сразу попадёт в вашу работу"}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleGenerateShareLink}
              disabled={isSharing}
              isLoading={isSharing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUz ? "Havola yaratish" : "Создать ссылку"}</span>
            </Button>
          </div>

          {shareUrl && (
            <div className="space-y-2 pt-1 animate-in fade-in">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold select-all"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 3000);
                  }}
                  className={cn(
                    'px-4 py-2 text-xs font-black flex items-center gap-1.5 shrink-0 transition-all',
                    shareCopied
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  )}
                >
                  {shareCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>
                    {shareCopied
                      ? isUz ? "Nusxalandi!" : "Скопировано!"
                      : isUz ? "Nusxalash" : "Скопировать"}
                  </span>
                </Button>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ {isUz ? "Havola tayyor! Uni hamkasbingizga yuboring." : "Ссылка готова! Отправьте её коллеге в Telegram или WhatsApp."}
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. REALTIME ONLINE PEERS (ОНЛАЙН СИНХРОНИЗАЦИЯ) */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isUz ? "Onlayn ishtirokchilar (Birgalikda sozlash):" : "Участники в сети (Синхронизация на лету):"}
            </span>

            <Button
              size="sm"
              onClick={handleForceSync}
              className="bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs py-1 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isUz ? "Qayta sinxronlash" : "Синхронизировать"}</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* My PC Card */}
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-blue-600" />
                  {myPeer?.device || 'Ваш компьютер'}
                </span>
                <span className="px-2 py-0.2 rounded-full text-[9px] bg-blue-600 text-white font-black">
                  {isUz ? "SIZ" : "ВЫ (ПК 1)"}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                IP: {myPeer?.ip} • {myPeer?.browser}
              </p>
            </div>

            {/* Other Colleague Card */}
            {otherPeers.length > 0 ? (
              otherPeers.map((peer) => (
                <div
                  key={peer.clientId}
                  className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 space-y-1 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                      <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                      {peer.device}
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] bg-emerald-600 text-white font-black">
                      {isUz ? "HAMKASB" : "КОЛЛЕГА (ПК 2)"}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    IP: {peer.ip} • {peer.lastAction || 'В сети онлайн'}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center flex items-center justify-center text-xs text-slate-400">
                <span>{isUz ? "Ikkinchi kompyuter kutilmoqda..." : "Ожидание второго компьютера..."}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button size="sm" onClick={onClose} className="text-xs font-bold py-1.5 px-4">
            {isUz ? "Tushunarli, yopish" : "Понятно, закрыть"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
