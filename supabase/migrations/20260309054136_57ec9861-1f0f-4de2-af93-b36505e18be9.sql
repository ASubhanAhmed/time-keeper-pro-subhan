-- Fix RLS policies: restrict to authenticated role only (currently allows anon)

-- timetrack_entries: drop and recreate with authenticated role
DROP POLICY IF EXISTS "Users can delete own entries" ON public.timetrack_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON public.timetrack_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON public.timetrack_entries;
DROP POLICY IF EXISTS "Users can view own entries" ON public.timetrack_entries;

CREATE POLICY "Users can view own entries" ON public.timetrack_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.timetrack_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.timetrack_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.timetrack_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- kanban_tasks: drop and recreate with authenticated role
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.kanban_tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.kanban_tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.kanban_tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.kanban_tasks;

CREATE POLICY "Users can view own tasks" ON public.kanban_tasks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.kanban_tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.kanban_tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.kanban_tasks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);