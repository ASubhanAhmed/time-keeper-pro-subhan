import { useState, useEffect } from 'react';
import { KanbanTask, KanbanStatus } from '@/types/kanbanTask';

const STORAGE_KEY = 'timetrack-kanban';

export function useKanbanTasks() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTasks(JSON.parse(stored));
  }, []);

  const save = (t: KanbanTask[]) => {
    setTasks(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  };

  const addTask = (title: string, description: string, status: KanbanStatus = 'todo', createdAt?: string) => {
    const task: KanbanTask = {
      id: Math.random().toString(36).substring(2, 15),
      title,
      description,
      status,
      createdAt: createdAt || new Date().toISOString().split('T')[0],
      completedAt: status === 'finished' ? (createdAt || new Date().toISOString().split('T')[0]) : undefined,
    };
    save([...tasks, task]);
  };

  const updateTaskStatus = (id: string, status: KanbanStatus) => {
    save(tasks.map(t => t.id === id ? {
      ...t,
      status,
      completedAt: status === 'finished' ? new Date().toISOString().split('T')[0] : undefined,
    } : t));
  };

  const updateTask = (id: string, updates: Partial<KanbanTask>) => {
    save(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id: string) => {
    save(tasks.filter(t => t.id !== id));
  };

  return { tasks, addTask, updateTaskStatus, updateTask, deleteTask };
}
