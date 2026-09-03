import React from 'react';
import { Calendar, Sparkles, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { ScheduleToolbar } from './ScheduleToolbar';
import { ClassScheduleView } from './ClassScheduleView';
import { TeacherScheduleView } from './TeacherScheduleView';
import { RoomScheduleView } from './RoomScheduleView';
import { Card, CardContent } from '../common/Card';
import { Button } from '../common/Button';

export const SchedulePage: React.FC = () => {
  const { schedule, viewMode, selectedEntityId, showAllInGrid, filterDay, generateSchedule, isGenerating } =
    useScheduleStore();
  const { classes, teachers, rooms, loadDemoData } = useSchoolStore();

  if (!schedule) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <Card className="p-12 text-center max-w-xl mx-auto my-12">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-4 shadow-md shadow-blue-500/10">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Расписание еще не составлено
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Нажмите кнопку «Составить расписание», и интеллектуальный алгоритм распределит уроки для всех классов и преподавателей без конфликтов и окон.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="primary"
              onClick={() => generateSchedule()}
              isLoading={isGenerating}
              disabled={isGenerating}
              className="w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Составить расписание сейчас
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={loadDemoData}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Загрузить пример школы
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Schedule Action Toolbar */}
      <ScheduleToolbar />

      {/* View Modes */}
      {viewMode === 'classes' && (
        <ClassScheduleView
          schedule={schedule}
          selectedClassId={selectedEntityId || classes[0]?.id}
          showAll={showAllInGrid}
          filterDay={filterDay}
        />
      )}

      {viewMode === 'teachers' && (
        <TeacherScheduleView
          schedule={schedule}
          selectedTeacherId={selectedEntityId || teachers[0]?.id}
          showAll={showAllInGrid}
          filterDay={filterDay}
        />
      )}

      {viewMode === 'classrooms' && (
        <RoomScheduleView
          schedule={schedule}
          selectedRoomId={selectedEntityId || rooms[0]?.id}
          showAll={showAllInGrid}
          filterDay={filterDay}
        />
      )}
    </div>
  );
};
