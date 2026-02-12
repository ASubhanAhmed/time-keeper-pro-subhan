
-- Add user_id column to timetrack_entries
ALTER TABLE public.timetrack_entries 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all delete access" ON public.timetrack_entries;
DROP POLICY IF EXISTS "Allow all insert access" ON public.timetrack_entries;
DROP POLICY IF EXISTS "Allow all read access" ON public.timetrack_entries;
DROP POLICY IF EXISTS "Allow all update access" ON public.timetrack_entries;

-- Create user-scoped policies
CREATE POLICY "Users can view own entries"
ON public.timetrack_entries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
ON public.timetrack_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
ON public.timetrack_entries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
ON public.timetrack_entries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
