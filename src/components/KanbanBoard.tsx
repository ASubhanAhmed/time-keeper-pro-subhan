import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { KanbanTask, KanbanStatus } from '@/types/kanbanTask';
import { useKanbanTasks } from '@/hooks/useKanbanTasks';
import { Plus, Trash2, ArrowRight, ArrowLeft, LayoutGrid } from 'lucide-react';

const COLUMNS: { status: KanbanStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'bg-chart-4' },
  { status: 'in-progress', label: 'In Progress', color: 'bg-primary' },
  { status: 'finished', label: 'Finished', color: 'bg-chart-1' },
];

function AddTaskDialog({ onAdd }: { onAdd: (title: string, desc: string, status: KanbanStatus, date?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<KanbanStatus>('todo');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title, desc, status, date || undefined);
    setTitle(''); setDesc(''); setStatus('todo'); setDate('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />Add Task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" required />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as KanbanStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date (optional)</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskCard({ task, onMove, onDelete }: {
  task: KanbanTask;
  onMove: (id: string, status: KanbanStatus) => void;
  onDelete: (id: string) => void;
}) {
  const colIdx = COLUMNS.findIndex(c => c.status === task.status);
  const canMoveLeft = colIdx > 0;
  const canMoveRight = colIdx < COLUMNS.length - 1;

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm">{task.title}</p>
        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
        <p className="text-[10px] text-muted-foreground">{task.createdAt}</p>
        <div className="flex items-center gap-1 pt-1">
          {canMoveLeft && (
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onMove(task.id, COLUMNS[colIdx - 1].status)}>
              <ArrowLeft className="h-3 w-3" />
            </Button>
          )}
          {canMoveRight && (
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onMove(task.id, COLUMNS[colIdx + 1].status)}>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-60 hover:opacity-100" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function KanbanBoard() {
  const { tasks, addTask, updateTaskStatus, deleteTask } = useKanbanTasks();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Tasks</h2>
        </div>
        <AddTaskDialog onAdd={addTask} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status);
          return (
            <Card key={col.status} className="border-none shadow-md">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.color}`} />
                    <h3 className="font-semibold text-sm">{col.label}</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2 min-h-[120px]">
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border/50">
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task} onMove={updateTaskStatus} onDelete={deleteTask} />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
