
-- Create kanban_tasks table
CREATE TABLE public.kanban_tasks (
  id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  created_at text NOT NULL,
  completed_at text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kanban_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own tasks" ON public.kanban_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.kanban_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.kanban_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.kanban_tasks FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_kanban_tasks_updated_at
BEFORE UPDATE ON public.kanban_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
