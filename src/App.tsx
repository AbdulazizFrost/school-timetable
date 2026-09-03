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
import { useSchoolStore } from './store/useSchoolStore';

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const { theme, setTheme } = useSchoolStore();

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme);
  }, []);

  return (
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
  );
}

export default App;
