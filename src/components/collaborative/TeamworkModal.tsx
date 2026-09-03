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
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';

export interface TeamworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamworkModal: React.FC<TeamworkModalProps> = ({ isOpen, onClose }) => {
  const { language, teachers, classes, subjects, rooms, settings } = useSchoolStore();
  const { schedule } = useScheduleStore();

  const isUz = language === 'uz';

  const [peers, setPeers] = useState<RealtimePeer[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [customRoomInput, setCustomRoomInput] = useState<string>(realtimeSyncService.getRoomId());
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string>('');

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

  const otherPeers = peers.filter((p) => !p.isMe);
  const myPeer = peers.find((p) => p.isMe);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={isUz ? "👥 Jamoaviy ishlash (Birgalikda sozlash)" : "👥 Совместная работа в реальном времени"}
      description={
        isUz
          ? "2 ta kompyuterdan 2 kishi bir vaqtning o'zida dars jadvalini birgalikda sozlashi mumkin"
          : "Два человека с двух компьютеров могут одновременно составлять и проверять расписание в одной комнате"
      }
    >
      <div className="space-y-5">
        {/* Status Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-blue-600/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs font-bold text-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase text-blue-200">
                  {isUz ? "XONA HOLATI:" : "КОМНАТА СОВМЕСТНОЙ РАБОТЫ:"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-400 text-slate-950 font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                  {peers.length} {isUz ? "ta qurilma ulangan" : "участника в сети"}
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                {otherPeers.length > 0
                  ? isUz
                    ? `Hamkasbingiz ulangan! Har qanday o'zgarish ikkalangizda ham ko'rinadi.`
                    : `Ваш коллега подключён! Любые перемещения уроков видны на обоих экранах.`
                  : isUz
                    ? "Havolani ikkinchi odamga yuboring — u ulanishi bilan ikkovingiz bitta jadvalda ishlaysiz."
                    : "Отправьте ссылку второму человеку — как только он откроет её, вы будете работать вместе!"}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleForceSync}
            className="bg-white hover:bg-slate-100 text-blue-700 font-extrabold text-xs shadow-md flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isUz ? "Qayta sinxronlash" : "Синхронизировать всё"}</span>
          </Button>
        </div>

        {syncSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* Share Link Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            {isUz ? "Ikkinchi kompyuter uchun maxfiy havola:" : "Ссылка для подключения второго компьютера:"}
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 select-all"
            />
            <Button
              onClick={handleCopyLink}
              className={cn(
                'px-4 py-2 text-xs font-black flex items-center gap-1.5 shrink-0 transition-all',
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>
                {copied
                  ? isUz ? "Nusxalandi!" : "Скопировано!"
                  : isUz ? "Nusxalash" : "Скопировать ссылку"}
              </span>
            </Button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isUz
              ? "Ushbu havolani Telegram yoki WhatsApp orqali hamkasbingizga yuboring. U ochishi bilan sizning loyihangizga kiradi."
              : "Отправьте эту ссылку коллеге в Telegram или WhatsApp. Открыв её, он сразу попадёт в ваше расписание."}
          </p>
        </div>

        {/* Online Participants */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            {isUz ? "Ulangan qurilmalar:" : "Участники в этой комнате:"}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* My PC Card */}
            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-400 dark:border-blue-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  {myPeer?.device || 'Ваш компьютер'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-black">
                  {isUz ? "SIZ" : "ВЫ (ПК 1)"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                <p>IP: <strong className="text-slate-700 dark:text-slate-300">{myPeer?.ip || '—'}</strong></p>
                <p>Браузер: <strong className="text-slate-700 dark:text-slate-300">{myPeer?.browser}</strong></p>
                <p className="text-emerald-600 font-bold">● В сети прямо сейчас</p>
              </div>
            </div>

            {/* Other Colleague Card */}
            {otherPeers.length > 0 ? (
              otherPeers.map((peer) => (
                <div
                  key={peer.clientId}
                  className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-400 dark:border-emerald-800 space-y-2 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-emerald-600" />
                      {peer.device}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-black">
                      {isUz ? "HAMKASB" : "КОЛЛЕГА (ПК 2)"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                    <p>IP: <strong className="text-slate-700 dark:text-slate-300">{peer.ip}</strong></p>
                    <p>Браузер: <strong className="text-slate-700 dark:text-slate-300">{peer.browser}</strong></p>
                    <p className="text-emerald-600 font-bold truncate" title={peer.lastAction}>
                      ● {peer.lastAction || 'В сети онлайн'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center justify-center text-xs text-slate-400">
                <Users className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                <p className="font-bold">
                  {isUz ? "Ikkinchi odam kutilmoqda..." : "Ожидание подключения второго коллеги..."}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isUz ? "Havolani yuboring va u bu yerda paydo bo'ladi" : "Отправьте ссылку, и его компьютер появится здесь"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3-Step Guide */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
          <p className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>{isUz ? "Birgalikda ishlash qanday ishlaydi:" : "Как работать вдвоём:"}</span>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed">
            <li>
              Нажмите кнопку <strong>«Скопировать ссылку»</strong> выше.
            </li>
            <li>
              Отправьте её второму человеку (завучу или директору).
            </li>
            <li>
              Когда он откроет ссылку на своём компьютере, вы оба увидите друг друга онлайн.
            </li>
            <li>
              <strong>Все действия синхронизируются моментально:</strong> если первый передвинет урок — у второго он сразу сдвинется; если второй настроит учителя — данные сразу обновятся у первого!
            </li>
          </ol>
        </div>

        {/* Room Code Switcher */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">{isUz ? "Xona kodi:" : "Код комнаты:"}</span>
            <input
              type="text"
              value={customRoomInput}
              onChange={(e) => setCustomRoomInput(e.target.value)}
              className="w-32 px-2.5 py-1 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
            <Button size="sm" onClick={handleSwitchRoom} className="text-xs font-bold py-1">
              {isUz ? "O'zgartirish" : "Сменить"}
            </Button>
          </div>

          <Button size="sm" onClick={onClose} className="text-xs font-bold py-1">
            {isUz ? "Yopish" : "Закрыть"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
