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
import { useSchoolStore } from './store/useSchoolStore';

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [isSecretAuditOpen, setIsSecretAuditOpen] = useState<boolean>(false);
  const { theme, setTheme } = useSchoolStore();

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
