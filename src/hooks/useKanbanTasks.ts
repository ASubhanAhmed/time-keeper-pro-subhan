import { useState, useEffect } from 'react';
import { KanbanTask, KanbanStatus } from '@/types/kanbanTask';
import { supabase } from '@/integrations/supabase/client';

export function useKanbanTasks() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kanban_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        status: row.status as KanbanStatus,
        createdAt: row.created_at,
        completedAt: row.completed_at || undefined,
      })));
    }
    setLoading(false);
  };

  const addTask = async (title: string, description: string, status: KanbanStatus = 'todo', createdAt?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const task: KanbanTask = {
      id: Math.random().toString(36).substring(2, 15),
      title,
      description,
      status,
      createdAt: createdAt || new Date().toISOString().split('T')[0],
      completedAt: status === 'finished' ? (createdAt || new Date().toISOString().split('T')[0]) : undefined,
    };

    setTasks(prev => [task, ...prev]);

    await supabase.from('kanban_tasks').insert({
      id: task.id,
      user_id: user.id,
      title: task.title,
      description: task.description,
      status: task.status,
      created_at: task.createdAt,
      completed_at: task.completedAt || null,
    });
  };

  const updateTaskStatus = async (id: string, status: KanbanStatus) => {
    const completedAt = status === 'finished' ? new Date().toISOString().split('T')[0] : null;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, completedAt: completedAt || undefined } : t));

    await supabase.from('kanban_tasks').update({ status, completed_at: completedAt }).eq('id', id);
  };

  const updateTask = async (id: string, updates: Partial<KanbanTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt || null;

    await supabase.from('kanban_tasks').update(dbUpdates).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('kanban_tasks').delete().eq('id', id);
  };

  return { tasks, loading, addTask, updateTaskStatus, updateTask, deleteTask };
}
