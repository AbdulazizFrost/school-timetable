import React, { useEffect, useState } from 'react';
import { Layout } from './components/layout/Layout';
import { NavSection } from './components/layout/Sidebar';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { SchedulePage } from './components/schedule/SchedulePage';
import { ObserverPage } from './components/observer/ObserverPage';
import { TeachersPage } from './components/teachers/TeachersPage';
import { ClassesPage } from './components/classes/ClassesPage';
import { SubjectsPage } from './components/subjects/SubjectsPage';
import { ClassroomsPage } from './components/classrooms/ClassroomsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { SecretAuditModal } from './components/secret/SecretAuditModal';
import { realtimeSyncService } from './services/realtimeSyncService';
import { cloudShareService } from './services/cloudShareService';
import { storageService } from './services/storageService';
import { useSchoolStore } from './store/useSchoolStore';
import { useScheduleStore } from './store/useScheduleStore';

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [isSecretAuditOpen, setIsSecretAuditOpen] = useState<boolean>(false);
  const [sharedLoadStatus, setSharedLoadStatus] = useState<string | null>(null);
  const { theme, setTheme, importProject } = useSchoolStore();

  // Auto-load colleague's schedule if opened via ?share=... link
  useEffect(() => {
    const shareId = cloudShareService.getShareIdFromUrl();
    if (shareId) {
      setSharedLoadStatus('Загрузка расписания коллеги из облака...');
      cloudShareService
        .loadProject(shareId)
        .then((project) => {
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
          useScheduleStore.setState({ schedule: project.schedule });
          storageService.saveSchedule(project.schedule);

          setSharedLoadStatus(
            `✅ Вы успешно перешли в расписание коллеги! Загружено ${project.schedule.entries.length} уроков.`
          );
          setCurrentSection('schedule');

          setTimeout(() => {
            setSharedLoadStatus(null);
          }, 6000);
        })
        .catch((err) => {
          setSharedLoadStatus(`❌ Ошибка загрузки расписания: ${err.message}`);
          setTimeout(() => setSharedLoadStatus(null), 6000);
        });
    }
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme);
  }, []);

  // Sync active page with realtime monitor
  useEffect(() => {
    realtimeSyncService.setActivePage(currentSection);
  }, [currentSection]);

  // Stealth Access: Secret hotkey and custom event triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret Shortcut: Ctrl + Shift + A or Ctrl + Shift + S
      const isA = e.key === 'A' || e.key === 'a' || e.key === 'Ф' || e.key === 'ф';
      const isS = e.key === 'S' || e.key === 's' || e.key === 'Ы' || e.key === 'ы';
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (isA || isS)) {
        e.preventDefault();
        setIsSecretAuditOpen(true);
      }
    };

    const handleCustomTrigger = () => {
      setIsSecretAuditOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-secret-audit', handleCustomTrigger);

    // Check URL parameters like ?audit or ?secret or ?admin
    try {
      const search = window.location.search;
      if (search.includes('audit') || search.includes('secret') || search.includes('admin')) {
        setIsSecretAuditOpen(true);
      }
    } catch {}

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-secret-audit', handleCustomTrigger);
    };
  }, []);

  return (
    <>
      {/* Toast Notification when entering Colleague's Schedule */}
      {sharedLoadStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] px-5 py-3 rounded-2xl bg-slate-900/95 text-white shadow-2xl border border-indigo-500/60 backdrop-blur-md flex items-center gap-3 text-xs font-bold animate-in slide-in-from-top-4">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{sharedLoadStatus}</span>
        </div>
      )}

      <Layout currentSection={currentSection} onNavigate={setCurrentSection}>
        {currentSection === 'dashboard' && <DashboardPage onNavigate={setCurrentSection} />}
        {currentSection === 'schedule' && <SchedulePage />}
        {currentSection === 'observer' && <ObserverPage onNavigate={setCurrentSection} />}
        {currentSection === 'teachers' && <TeachersPage />}
        {currentSection === 'classes' && <ClassesPage />}
        {currentSection === 'subjects' && <SubjectsPage />}
        {currentSection === 'rooms' && <ClassroomsPage />}
        {currentSection === 'settings' && <SettingsPage />}
      </Layout>

      {/* Secret Stealth Auditor Modal (Only opened via secret triggers) */}
      <SecretAuditModal
        isOpen={isSecretAuditOpen}
        onClose={() => setIsSecretAuditOpen(false)}
      />
    </>
  );
}

export default App;
