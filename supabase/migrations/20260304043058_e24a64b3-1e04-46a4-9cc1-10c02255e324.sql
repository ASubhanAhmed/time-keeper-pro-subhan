
-- Fix anonymous access warnings by restricting policies to authenticated role

-- kanban_tasks
DROP POLICY "Users can view own tasks" ON public.kanban_tasks;
DROP POLICY "Users can insert own tasks" ON public.kanban_tasks;
DROP POLICY "Users can update own tasks" ON public.kanban_tasks;
DROP POLICY "Users can delete own tasks" ON public.kanban_tasks;

CREATE POLICY "Users can view own tasks" ON public.kanban_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.kanban_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.kanban_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.kanban_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- timetrack_entries
DROP POLICY "Users can delete own entries" ON public.timetrack_entries;
DROP POLICY "Users can insert own entries" ON public.timetrack_entries;
DROP POLICY "Users can update own entries" ON public.timetrack_entries;
DROP POLICY "Users can view own entries" ON public.timetrack_entries;

CREATE POLICY "Users can view own entries" ON public.timetrack_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.timetrack_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.timetrack_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.timetrack_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
