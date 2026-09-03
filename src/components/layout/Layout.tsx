import React, { useEffect, useState } from 'react';
import { NavSection, Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useScheduleStore } from '../../store/useScheduleStore';
import { GenerationProgressModal } from '../generator/GenerationProgressModal';
import { DiagnosticsModal } from '../generator/DiagnosticsModal';
import { BackupRestoreModal } from '../settings/BackupRestoreModal';
import { ConflictDrawer } from '../schedule/ConflictDrawer';
import { ManualEditModal } from '../schedule/ManualEditModal';
import { SwapModal } from '../schedule/SwapModal';

export interface LayoutProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentSection, onNavigate, children }) => {
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const { undo, redo, canUndo, canRedo } = useScheduleStore();

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (canRedo()) {
            e.preventDefault();
            redo();
          }
        } else {
          if (canUndo()) {
            e.preventDefault();
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (canRedo()) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar currentSection={currentSection} onNavigate={onNavigate} />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          onOpenBackup={() => setBackupModalOpen(true)}
          onOpenSettings={() => onNavigate('settings')}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Mobile Navigation */}
        <MobileNav currentSection={currentSection} onNavigate={onNavigate} />
      </div>

      {/* Modals & Drawers */}
      <GenerationProgressModal />
      <DiagnosticsModal />
      <BackupRestoreModal isOpen={backupModalOpen} onClose={() => setBackupModalOpen(false)} />
      <ConflictDrawer />
      <ManualEditModal />
      <SwapModal />
    </div>
  );
};
