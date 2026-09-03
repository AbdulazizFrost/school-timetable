import React from 'react';
import {
  Calendar,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  BookOpen,
} from 'lucide-react';
import { NavSection } from './Sidebar';
import { cn } from '../common/Button';
import { useScheduleStore } from '../../store/useScheduleStore';

export interface MobileNavProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentSection, onNavigate }) => {
  const { schedule } = useScheduleStore();

  const items = [
    { id: 'dashboard' as NavSection, label: 'Дашборд', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'schedule' as NavSection,
      label: 'Расписание',
      icon: <Calendar className="w-5 h-5" />,
      hasAlert: schedule && schedule.conflicts.length > 0,
    },
    { id: 'teachers' as NavSection, label: 'Учителя', icon: <Users className="w-5 h-5" /> },
    { id: 'classes' as NavSection, label: 'Классы', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'subjects' as NavSection, label: 'Предметы', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'settings' as NavSection, label: 'Настройки', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 flex items-center justify-around px-2 no-print shadow-lg">
      {items.map((item) => {
        const isActive = currentSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer relative',
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            {item.icon}
            <span className="text-[9px] mt-0.5">{item.label}</span>
            {item.hasAlert && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        );
      })}
    </div>
  );
};
