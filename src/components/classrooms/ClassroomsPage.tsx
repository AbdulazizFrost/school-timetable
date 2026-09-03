import React, { useState } from 'react';
import {
  DoorOpen,
  Edit2,
  Filter,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Classroom, ROOM_TYPE_LABELS } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Card, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ClassroomModal } from './ClassroomModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { pluralizeRu } from '../../utils/formatters';

export const ClassroomsPage: React.FC = () => {
  const { rooms, classes, deleteClassroom } = useSchoolStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || r.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleEdit = (room: Classroom) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingRoomId) {
      deleteClassroom(deletingRoomId);
      setDeletingRoomId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <DoorOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Кабинеты и лаборатории
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Всего: {pluralizeRu(rooms.length, 'кабинет', 'кабинета', 'кабинетов')} • Настройка типов и
            вместимости
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Добавить кабинет
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Поиск по номеру или названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-full sm:w-56">
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
              >
                <option value="all">Все типы помещений</option>
                {Object.entries(ROOM_TYPE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {filteredRooms.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <DoorOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Кабинеты не найдены
          </h3>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              Добавить кабинет
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const assignedClass = classes.find((c) => c.homeRoomId === room.id);

            return (
              <Card key={room.id} hoverEffect className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {room.roomNumber}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {room.name}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Этаж: {room.floor || 1} • {ROOM_TYPE_LABELS[room.type] || room.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(room)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingRoomId(room.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Вместимость:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {room.capacity} мест
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Домашний класс:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {assignedClass ? `Класс ${assignedClass.name}` : 'Не назначен'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Статус:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Доступен
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Classroom Modal */}
      <ClassroomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomToEdit={editingRoom}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingRoomId}
        onClose={() => setDeletingRoomId(null)}
        onConfirm={confirmDelete}
        title="Удалить кабинет?"
        message="Кабинет будет удален из фонда школы."
        confirmText="Удалить"
      />
    </div>
  );
};
