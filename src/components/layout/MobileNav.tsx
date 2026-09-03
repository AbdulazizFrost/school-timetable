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
import { useSchoolStore } from '../../store/useSchoolStore';

export interface MobileNavProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentSection, onNavigate }) => {
  const { schedule } = useScheduleStore();
  const { language } = useSchoolStore();

  const isUz = language === 'uz';

  const items = [
    { id: 'dashboard' as NavSection, label: isUz ? 'Asosiy' : 'Главная', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'schedule' as NavSection,
      label: isUz ? 'Jadval' : 'Расписание',
      icon: <Calendar className="w-5 h-5" />,
      hasAlert: schedule && schedule.conflicts.length > 0,
    },
    { id: 'teachers' as NavSection, label: isUz ? "O'qituvchi" : 'Учителя', icon: <Users className="w-5 h-5" /> },
    { id: 'classes' as NavSection, label: isUz ? 'Sinflar' : 'Классы', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'subjects' as NavSection, label: isUz ? 'Fanlar' : 'Предметы', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'settings' as NavSection, label: isUz ? 'Sozlama' : 'Настройки', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 z-40 flex items-center justify-around px-1 no-print shadow-xl">
      {items.map((item) => {
        const isActive = currentSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-14 rounded-xl transition-all cursor-pointer relative select-none py-1',
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 active:scale-95'
            )}
          >
            <div className="relative">
              {item.icon}
              {item.hasAlert && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </div>
            <span className="text-[9.5px] mt-0.5 whitespace-nowrap tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
