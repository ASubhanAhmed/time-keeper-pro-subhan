export type KanbanStatus = 'todo' | 'in-progress' | 'finished';

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: KanbanStatus;
  createdAt: string; // ISO date
  completedAt?: string;
}
