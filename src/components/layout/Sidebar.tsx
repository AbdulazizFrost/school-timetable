import React from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Moon,
  Sparkles,
  Sun,
  Users,
  BookOpen,
  Settings,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { cn } from '../common/Button';

export type NavSection = 'dashboard' | 'schedule' | 'observer' | 'teachers' | 'classes' | 'subjects' | 'rooms' | 'settings';

export interface SidebarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, onNavigate, collapsed = false }) => {
  const { teachers, classes, subjects, rooms, theme, setTheme, t, language } = useSchoolStore();
  const { schedule, generateSchedule, isGenerating } = useScheduleStore();

  const navItems = [
    {
      id: 'dashboard' as NavSection,
      label: t('nav_dashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'schedule' as NavSection,
      label: t('nav_schedule'),
      icon: <Calendar className="w-5 h-5" />,
      badge: schedule ? `${schedule.entries.length} ${t('lesson')}` : undefined,
      alertBadge: schedule && schedule.conflicts.length > 0 ? schedule.conflicts.length : undefined,
    },
    {
      id: 'teachers' as NavSection,
      label: t('nav_teachers'),
      icon: <Users className="w-5 h-5" />,
      count: teachers.length,
    },
    {
      id: 'classes' as NavSection,
      label: t('nav_classes'),
      icon: <GraduationCap className="w-5 h-5" />,
      count: classes.length,
    },
    {
      id: 'subjects' as NavSection,
      label: t('nav_subjects'),
      icon: <BookOpen className="w-5 h-5" />,
      count: subjects.length,
    },
    {
      id: 'rooms' as NavSection,
      label: t('nav_rooms'),
      icon: <DoorOpen className="w-5 h-5" />,
      count: rooms.length,
    },
    {
      id: 'settings' as NavSection,
      label: t('nav_settings'),
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const clickCountRef = React.useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - clickCountRef.current.lastTime > 2500) {
      clickCountRef.current.count = 1;
    } else {
      clickCountRef.current.count += 1;
    }
    clickCountRef.current.lastTime = now;

    if (clickCountRef.current.count >= 5) {
      clickCountRef.current.count = 0;
      window.dispatchEvent(new CustomEvent('open-secret-audit'));
    }
  };

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none transition-all duration-200 z-30 no-print',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand / Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 dark:border-slate-800">
        <div
          onClick={handleLogoClick}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 cursor-pointer transition-transform active:scale-95"
        >
          <Clock className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none tracking-tight">
              {t('app_title')}
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-1 font-medium truncate">
              {t('app_subtitle')}
            </p>
          </div>
        )}
      </div>

      {/* Main Generator Action */}
      {!collapsed && (
        <div className="p-4">
          <button
            onClick={() => generateSchedule()}
            disabled={isGenerating}
            className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-semibold py-2.5 px-3.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 animate-pulse-subtle" />
            <span>{isGenerating ? t('generating') : t('generate_schedule')}</span>
          </button>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer group',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <div
                className={cn(
                  'transition-colors',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                )}
              >
                {item.icon}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.alertBadge !== undefined && (
                    <span className="flex items-center gap-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      {item.alertBadge}
                    </span>
                  )}
                  {item.badge && !item.alertBadge && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-medium">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && !item.alertBadge && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 font-mono">
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme & Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            {!collapsed && <span>{theme === 'dark' ? (language === 'uz' ? 'Tungi rejim' : 'Темная тема') : (language === 'uz' ? 'Kunduzgi rejim' : 'Светлая тема')}</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {theme}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
