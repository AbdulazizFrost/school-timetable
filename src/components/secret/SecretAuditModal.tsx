import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  User,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  X,
  KeyRound,
  History,
  Activity,
  ChevronRight,
  Eye,
  Settings,
  Undo2,
  Monitor,
  AlertCircle,
  Wifi,
  Globe,
  Radio,
} from 'lucide-react';
import { auditService, AuditLogEntry, EditorSession } from '../../services/auditService';
import { realtimeSyncService, RealtimePeer } from '../../services/realtimeSyncService';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Button, cn } from '../common/Button';
import { ScreenMirrorView } from './ScreenMirrorView';

export interface SecretAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SecretTab = 'screen_mirror' | 'audit_check' | 'timeline' | 'session' | 'pin_settings';

export const SecretAuditModal: React.FC<SecretAuditModalProps> = ({ isOpen, onClose }) => {
  const { schedule, pushHistory } = useScheduleStore();
  const { teachers, classes, rooms, subjects, language } = useSchoolStore();

  const isUz = language === 'uz';

  // PIN Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<SecretTab>('screen_mirror');

  // Logs and Session State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [session, setSession] = useState<EditorSession>(auditService.getSession());

  // Edit Editor name state
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editorNameInput, setEditorNameInput] = useState<string>(session.editorName);

  // New PIN state
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string>('');

  // Realtime Peers State
  const [realtimePeers, setRealtimePeers] = useState<RealtimePeer[]>([]);

  useEffect(() => {
    const unsub = realtimeSyncService.subscribe((peers) => {
      setRealtimePeers(peers);
    });
    return () => unsub();
  }, []);

  // Reload logs on open or tick
  const refreshData = () => {
    setLogs(auditService.getLogs());
    setSession(auditService.getSession());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const interval = setInterval(refreshData, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Handle PIN verification
  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (auditService.verifyPin(pinInput)) {
      setIsAuthenticated(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError(isUz ? "Noto'g'ri PIN-kod!" : 'Неверный PIN-код доступа!');
    }
  };

  // Revert snapshot action
  const handleRevertAction = (entry: AuditLogEntry) => {
    if (!entry.snapshot) return;
    const confirmMsg = isUz
      ? "Ushbu holatga qaytarishni xohlaysizmi?"
      : "Вы уверены, что хотите откатить расписание до этого состояния?";
    if (window.confirm(confirmMsg)) {
      pushHistory(entry.snapshot);
      auditService.logAction({
        actionType: 'schedule_move',
        title: 'Откат действия директором',
        description: `Директор откатил действие от ${new Date(entry.timestamp).toLocaleTimeString()}`,
      });
      refreshData();
    }
  };

  // Save updated editor name
  const handleSaveEditorName = () => {
    auditService.setEditorName(editorNameInput, session.role);
    setSession(auditService.getSession());
    setIsEditingName(false);
  };

  // Change PIN handler
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.trim().length < 4) {
      alert(isUz ? "PIN-kod kamida 4 belgidan iborat bo'lishi kerak" : 'PIN-код должен быть не менее 4 цифр');
      return;
    }
    auditService.setPin(newPinInput.trim());
    setNewPinInput('');
    setPinSuccessMsg(isUz ? "PIN-kod muvaffaqiyatli yangilandi!" : 'PIN-код успешно изменён!');
    setTimeout(() => setPinSuccessMsg(''), 3000);
  };

  // Clear audit history
  const handleClearLogs = () => {
    const confirmMsg = isUz ? "Barcha audit yozuvlarini o'chirishni xohlaysizmi?" : "Очистить весь журнал аудита?";
    if (window.confirm(confirmMsg)) {
      auditService.clearLogs();
      refreshData();
    }
  };

  // Audit Quality Analysis
  const auditAnalysis = useMemo(() => {
    const conflicts = schedule?.conflicts || [];
    const hasConflicts = conflicts.length > 0;

    const totalActions = logs.length;
    const errorActions = logs.filter((l) => l.quality === 'error').length;
    const accuracyRate = totalActions > 0 ? Math.round(((totalActions - errorActions) / totalActions) * 100) : 100;

    return {
      hasConflicts,
      conflicts,
      accuracyRate,
      score: schedule?.score?.totalScore || 0,
    };
  }, [schedule, logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* ========================================================================= */}
        {/* 1. PIN-CODE SECURITY SCREEN (IF NOT AUTHENTICATED) */}
        {/* ========================================================================= */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto my-auto space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                {isUz ? "MAXFIY AUDIT PUL'TI" : "СКРЫТЫЙ ПУЛЬТ ДИРЕКТОРА"}
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-3 text-slate-900 dark:text-white">
                {isUz ? "Xavfsizlik kalitini kiriting" : "Введите PIN-код доступа"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isUz
                  ? "Dars jadvalini kim tuzayotganini va to'g'ri bajaryaptimi-yo'qligini tekshirish"
                  : "Контроль и скрытая проверка работы составителя расписания"}
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  maxLength={12}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="••••"
                  className="w-48 mx-auto text-center text-2xl tracking-[0.4em] font-mono py-2.5 px-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-amber-500 focus:outline-none transition-all"
                />
                {pinError && (
                  <p className="text-xs font-bold text-rose-500 mt-2 animate-shake">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold"
                >
                  {isUz ? "Bekor qilish" : "Отмена"}
                </Button>
                <Button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                >
                  <Unlock className="w-4 h-4 mr-1.5" />
                  {isUz ? "Kirish" : "Войти"}
                </Button>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2">
                {isUz ? "Standart PIN-kod:" : "Заводской PIN по умолчанию:"} <span className="font-mono font-bold text-slate-700 dark:text-slate-300">7777</span>
              </p>
            </form>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. AUTHENTICATED SECRET AUDITOR CONSOLE */
          /* ========================================================================= */
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isUz ? "Maxfiy nazorat va audit pul'ti" : "Скрытый пульт контроля и аудита"}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      STEALTH ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isUz ? "Tuzuvchi: " : "Сейчас настраивает: "}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {session.editorName}
                    </span>{' '}
                    ({session.device})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto touch-scroll">
              <button
                onClick={() => setActiveTab('screen_mirror')}
                className={cn(
                  'py-3 px-3.5 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'screen_mirror'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <Monitor className="w-4 h-4 text-emerald-500" />
                <span>{isUz ? "Tuzuvchi ekrani (Jonli)" : "Экран составителя (Живое зеркало)"}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                onClick={() => setActiveTab('audit_check')}
                className={cn(
                  'py-3 px-3.5 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'audit_check'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {auditAnalysis.hasConflicts ? (
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                <span>{isUz ? "To'g'rilik tekshiruvi" : "Проверка правильности"}</span>
                {auditAnalysis.hasConflicts && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 font-extrabold">
                    {auditAnalysis.conflicts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  'py-3 px-3.5 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'timeline'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <History className="w-4 h-4" />
                <span>{isUz ? "Harakatlar jurnali" : "Лента действий составителя"}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-extrabold">
                  {logs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('session')}
                className={cn(
                  'py-3 px-3.5 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'session'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <User className="w-4 h-4" />
                <span>{isUz ? "Kim sozlamoqda (Sessiya)" : "Кто настраивает (Сессия)"}</span>
              </button>

              <button
                onClick={() => setActiveTab('pin_settings')}
                className={cn(
                  'py-3 px-3.5 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'pin_settings'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <KeyRound className="w-4 h-4" />
                <span>{isUz ? "PIN-kodni o'zgartirish" : "Сменить PIN-код"}</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* ========================================================================= */}
              {/* TAB 0: LIVE SCREEN MIRROR ("ЭКРАН СОСТАВИТЕЛЯ (ЖИВОЕ ЗЕРКАЛО)") */}
              {/* ========================================================================= */}
              {activeTab === 'screen_mirror' && <ScreenMirrorView />}

              {/* ========================================================================= */}
              {/* TAB 1: AUDIT & VERIFICATION ("ПРОВЕРКА ПРАВИЛЬНОСТИ") */}
              {/* ========================================================================= */}
              {activeTab === 'audit_check' && (
                <div className="space-y-4">
                  {/* Verdict Banner */}
                  <div
                    className={cn(
                      'p-5 rounded-2xl border flex items-start gap-4 transition-all',
                      !auditAnalysis.hasConflicts
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
                    )}
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 text-white',
                        !auditAnalysis.hasConflicts ? 'bg-emerald-600' : 'bg-rose-600'
                      )}
                    >
                      {!auditAnalysis.hasConflicts ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : (
                        <ShieldAlert className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold">
                        {!auditAnalysis.hasConflicts
                          ? isUz
                            ? "Dars jadvali to'g'ri tuzilmoqda! Xatolar yo'q"
                            : "Составитель делает расписание правильно! Конфликтов нет"
                          : isUz
                          ? `Diqqat: Tuzuvchi ${auditAnalysis.conflicts.length} ta xato va to'qnashuvga yo'l qo'ydi!`
                          : `Внимание: Составитель допустил ${auditAnalysis.conflicts.length} ошибок в расписании!`}
                      </h4>
                      <p className="text-xs mt-1 opacity-80 leading-relaxed">
                        {!auditAnalysis.hasConflicts
                          ? isUz
                            ? "Barcha qoidalar 100% bajarilgan: o'qituvchilar, sinflar va xonalar bir-biriga xalaqit bermaydi."
                            : "Все жесткие ограничения соблюдены: накладок у учителей, кабинетов и классов не обнаружено."
                          : isUz
                          ? "Quyidagi xatolarni tekshirib, tuzuvchiga tuzatishni ayting yoki audit lentasidan noto'g'ri qadamni bitta tugma bilan bekor qiling."
                          : "Проверьте список нарушений ниже или откатите ошибочные действия составителя в один клик в соседней вкладке."}
                      </p>
                    </div>
                  </div>

                  {/* Quality metrics bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">
                        {isUz ? "Aniqlik darajasi" : "Индекс точности действий"}
                      </p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {auditAnalysis.accuracyRate}%
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">
                        {isUz ? "Jadval sifati bali" : "Качество расписания (Score)"}
                      </p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {auditAnalysis.score} / 100
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">
                        {isUz ? "Jami to'qnashuvlar" : "Накладок и конфликтов"}
                      </p>
                      <p
                        className={cn(
                          'text-xl font-black mt-1',
                          auditAnalysis.hasConflicts ? 'text-rose-600' : 'text-emerald-600'
                        )}
                      >
                        {auditAnalysis.conflicts.length}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Errors list */}
                  {auditAnalysis.hasConflicts ? (
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {isUz ? "Yo'l qo'yilgan xatolar ro'yxati:" : "Список допущенных составителем нарушений:"}
                      </h5>
                      <div className="space-y-2">
                        {auditAnalysis.conflicts.map((c, idx) => (
                          <div
                            key={c.id || idx}
                            className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold text-rose-900 dark:text-rose-200">
                                  {c.type === 'teacher_clash'
                                    ? isUz ? "O'qituvchi to'qnashuvi" : "Накладка у учителя"
                                    : c.type === 'room_clash'
                                    ? isUz ? "Xona to'qnashuvi" : "Кабинет занят двумя классами"
                                    : c.type === 'class_clash'
                                    ? isUz ? "Sinf to'qnashuvi" : "У класса два урока одновременно"
                                    : isUz ? "SanPiN / Cheklov buzilishi" : "Нарушение СанПиН / ограничения"}
                                </span>
                                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                  {c.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {isUz ? "Xatolar topilmadi" : "Нарушений не обнаружено"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {isUz
                          ? "Tuzuvchi barcha talab va cheklovlarga rioya qilmoqda."
                          : "Составитель соблюдает все правила: двойных бронирований и накладок нет."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: TIMELINE AUDIT LOG ("ЛЕНТА ДЕЙСТВИЙ СОСТАВИТЕЛЯ") */}
              {/* ========================================================================= */}
              {activeTab === 'timeline' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isUz ? "Barcha o'zgarishlar tarixi (eng so'nggi harakatlar tepada)" : "Хронология всех действий составителя (новые сверху):"}
                    </p>
                    {logs.length > 0 && (
                      <button
                        onClick={handleClearLogs}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isUz ? "Jurnalni tozalash" : "Очистить историю"}</span>
                      </button>
                    )}
                  </div>

                  {logs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      {isUz ? "Hozircha yozuvlar yo'q. Tuzuvchi biror amal bajarganda shu yerda ko'rinadi." : "Пока нет записей. Любые действия составителя сразу появятся здесь."}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {logs.map((log) => {
                        const timeStr = new Date(log.timestamp).toLocaleTimeString();
                        const dateStr = new Date(log.timestamp).toLocaleDateString();
                        const isError = log.quality === 'error';

                        return (
                          <div
                            key={log.id}
                            className={cn(
                              'p-3.5 rounded-2xl border transition-all',
                              isError
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[11px] font-bold text-slate-400">
                                    {timeStr} ({dateStr})
                                  </span>
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {log.title}
                                  </span>
                                  {isError ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300">
                                      {isUz ? "XATO KELTIRIB CHIQARDI" : "СОЗДАЛ ОШИБКУ"}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                      ✓ OK
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                  {log.description}
                                </p>
                                {log.conflictsSummary && log.conflictsSummary.length > 0 && (
                                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                                    ⚠ {log.conflictsSummary.join('; ')}
                                  </p>
                                )}
                              </div>

                              {/* Rollback button if snapshot exists */}
                              {log.snapshot && (
                                <button
                                  onClick={() => handleRevertAction(log)}
                                  title={isUz ? "Ushbu holatga qaytarish" : "Откатить расписание к этому состоянию"}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  <Undo2 className="w-3 h-3 text-amber-500" />
                                  <span>{isUz ? "Qaytarish" : "Откатить"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: WHO IS CONFIGURING (REAL-TIME ONLINE DEVICES) */}
              {/* ========================================================================= */}
              {activeTab === 'session' && (
                <div className="space-y-4">
                  {/* Live Status Header */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                        <Wifi className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {isUz ? "ONLAYN QURILMALARNI KUZATISH" : "ЖИВОЕ ОТСЛЕЖИВАНИЕ УСТРОЙСТВ ОНЛАЙН"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 font-extrabold border border-emerald-800">
                            {realtimePeers.length} {isUz ? "ta qurilma tarmoqda" : "устройств в сети"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isUz
                            ? "Dars jadvalini aynan kim ochgani va nimalarni o'zgartirayotgani real IP va qurilmasi bilan"
                            : "Реальные IP-адреса, браузеры, экраны и действия тех, кто прямо сейчас открыл расписание"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* List of Real Online Devices */}
                  <div className="space-y-3">
                    {realtimePeers.map((peer) => (
                      <div
                        key={peer.clientId}
                        className={cn(
                          'p-4 rounded-2xl border transition-all space-y-3',
                          peer.isMe
                            ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                            : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-md shadow-emerald-500/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {peer.device}
                            </span>
                            {peer.isMe ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-extrabold">
                                🛡️ {isUz ? "SIZ (DIREKTOR)" : "ВЫ (ДИРЕКТОР / ЭКРАН ПРОВЕРКИ)"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-extrabold border border-emerald-300">
                                👤 {isUz ? "TUZUVCHI ONLAYN (SOZLAMOQDA)" : "СОСТАВИТЕЛЬ (НАСТРАИВАЕТ РАСПИСАНИЕ)"}
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            {isUz ? "Oxirgi faollik: " : "Активен: "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                              {Math.max(1, Math.round((Date.now() - peer.lastSeen) / 1000))} сек назад
                            </span>
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              {isUz ? "Haqiqiy IP manzil:" : "Реальный IP-адрес:"}
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {peer.ip}
                            </span>
                            {peer.city && (
                              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                                {peer.city}
                              </span>
                            )}
                          </div>

                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              {isUz ? "Brauzer va ekran:" : "Браузер и экран:"}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">
                              {peer.browser}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              {peer.screenResolution}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              {isUz ? "Hozir qaysi sahifada:" : "Где сейчас на сайте:"}
                            </span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-xs block">
                              {peer.activePage === 'schedule'
                                ? 'Расписание (Сетка)'
                                : peer.activePage === 'teachers'
                                ? 'Учителя (Нагрузка)'
                                : peer.activePage === 'classes'
                                ? 'Классы (Планы)'
                                : peer.activePage === 'subjects'
                                ? 'Предметы'
                                : peer.activePage === 'rooms'
                                ? 'Кабинеты'
                                : 'Главная страница'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              {isUz ? "So'nggi harakat:" : "Последнее действие:"}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block truncate" title={peer.lastAction}>
                              {peer.lastAction || 'Просмотр сетки'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manual Editor Name override */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold block">
                        {isUz ? "Tuzuvchi ismi (eslatma):" : "Имя составителя (подпись в отчёте):"}
                      </span>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                        {session.editorName}
                      </p>
                    </div>

                    {!isEditingName ? (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {isUz ? "O'zgartirish" : "Изменить имя"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editorNameInput}
                          onChange={(e) => setEditorNameInput(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        />
                        <Button size="sm" onClick={handleSaveEditorName} className="text-xs font-bold">
                          OK
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: PIN SETTINGS */}
              {/* ========================================================================= */}
              {activeTab === 'pin_settings' && (
                <div className="space-y-4 max-w-md">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>{isUz ? "Yangi PIN-kod o'rnatish" : "Сменить секретный PIN-код"}</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {isUz
                        ? "Ushbu maxfiy audit paneliga kirish uchun faqat siz biladigan yangi PIN-kod o'rnating."
                        : "Установите новый PIN-код для входа в этот скрытый пульт. Никто кроме вас не сможет открыть эту панель."}
                    </p>

                    <form onSubmit={handleChangePin} className="space-y-3">
                      <div>
                        <input
                          type="password"
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value)}
                          placeholder="Yangi PIN / Новый PIN"
                          maxLength={12}
                          className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      {pinSuccessMsg && (
                        <p className="text-xs font-bold text-emerald-600">{pinSuccessMsg}</p>
                      )}
                      <Button type="submit" className="w-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white">
                        {isUz ? "Saqlash" : "Сохранить новый PIN"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
