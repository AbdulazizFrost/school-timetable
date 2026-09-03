import React from 'react';
import { CheckCircle2, Clock, Cpu, Sparkles, X } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const GenerationProgressModal: React.FC = () => {
  const { isGenerating, generationProgress } = useScheduleStore();

  if (!isGenerating && generationProgress.stage !== 'completed') {
    return null;
  }

  const stages = [
    { key: 'validating', label: 'Анализ данных и структуры' },
    { key: 'preparing', label: 'Инициализация CSP и доменов' },
    { key: 'solving', label: 'Распределение уроков без конфликтов' },
    { key: 'optimizing', label: 'Оптимизация окон и баланса предметов' },
    { key: 'completed', label: 'Готово!' },
  ];

  const getStageIndex = (stage: string) => {
    switch (stage) {
      case 'validating':
        return 0;
      case 'preparing':
        return 1;
      case 'solving':
        return 2;
      case 'optimizing':
        return 3;
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  const currentIdx = getStageIndex(generationProgress.stage);

  return (
    <Modal
      isOpen={isGenerating}
      onClose={() => {}}
      maxWidth="md"
      showCloseButton={false}
    >
      <div className="text-center py-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-4 animate-bounce">
          <Sparkles className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Составление школьного расписания
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Constraint Satisfaction Problem (CSP) + Forward Checking + Simulated Annealing
        </p>

        {/* Progress Bar */}
        <div className="mt-6 mb-2">
          <div className="flex justify-between items-center text-xs font-semibold mb-2">
            <span className="text-slate-700 dark:text-slate-300">
              {generationProgress.message || 'Обработка...'}
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-mono">
              {generationProgress.progress}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, generationProgress.progress)}%` }}
            />
          </div>
        </div>

        {/* Step checklist */}
        <div className="mt-6 text-left space-y-2.5 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          {stages.slice(0, 4).map((step, idx) => {
            const isDone = currentIdx > idx;
            const isCurrent = currentIdx === idx;
            return (
              <div key={step.key} className="flex items-center gap-3 text-xs">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={`${
                    isDone
                      ? 'text-slate-700 dark:text-slate-300 font-medium'
                      : isCurrent
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Metrics info */}
        {generationProgress.nodesVisited !== undefined && generationProgress.nodesVisited > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" /> Узлов CSP: {generationProgress.nodesVisited}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};
