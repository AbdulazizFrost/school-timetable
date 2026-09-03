import React, { useEffect, useState } from 'react';
import { Classroom, ROOM_TYPE_LABELS } from '../../types';
import { useSchoolStore } from '../../store/useSchoolStore';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Input';
import { Button } from '../common/Button';

export interface ClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomToEdit?: Classroom | null;
}

export const ClassroomModal: React.FC<ClassroomModalProps> = ({
  isOpen,
  onClose,
  roomToEdit,
}) => {
  const { addClassroom, updateClassroom } = useSchoolStore();

  const [roomNumber, setRoomNumber] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('general');
  const [capacity, setCapacity] = useState<number>(30);
  const [floor, setFloor] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (roomToEdit) {
      setRoomNumber(roomToEdit.roomNumber || '');
      setName(roomToEdit.name || '');
      setType(roomToEdit.type || 'general');
      setCapacity(roomToEdit.capacity || 30);
      setFloor(roomToEdit.floor || 1);
    } else {
      setRoomNumber('');
      setName('');
      setType('general');
      setCapacity(30);
      setFloor(1);
    }
    setErrors({});
  }, [roomToEdit, isOpen]);

  const handleRoomNumberChange = (num: string) => {
    setRoomNumber(num);
    if (!name || name === `Кабинет ${roomNumber}`) {
      setName(`Кабинет ${num}`);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!roomNumber.trim()) newErrors.roomNumber = 'Введите номер кабинета';
    if (!name.trim()) newErrors.name = 'Введите название кабинета';
    if (capacity <= 0) newErrors.capacity = 'Вместимость должна быть больше 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const roomData = {
      roomNumber: roomNumber.trim(),
      name: name.trim(),
      type,
      capacity: Number(capacity),
      floor: Number(floor),
    };

    if (roomToEdit) {
      updateClassroom(roomToEdit.id, roomData);
    } else {
      addClassroom(roomData);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={roomToEdit ? 'Редактировать кабинет' : 'Добавить кабинет'}
      description="Укажите номер, тип (компьютерный, лаборатория, спортзал) и вместимость."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Номер кабинета *"
            placeholder="Например: 205"
            value={roomNumber}
            onChange={(e) => handleRoomNumberChange(e.target.value)}
            error={errors.roomNumber}
          />
          <Input
            label="Этаж"
            type="number"
            min={1}
            max={10}
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
          />
        </div>

        <Input
          label="Название кабинета *"
          placeholder="Например: Компьютерный класс 205"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Тип помещения *
            </label>
            <select
              className="w-full min-h-[44px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm sm:text-xs text-slate-900 dark:text-slate-100"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {Object.entries(ROOM_TYPE_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Вместимость (мест) *"
            type="number"
            min={5}
            max={100}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            error={errors.capacity}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="md" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} className="font-bold">
            {roomToEdit ? 'Сохранить изменения' : 'Добавить кабинет'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
