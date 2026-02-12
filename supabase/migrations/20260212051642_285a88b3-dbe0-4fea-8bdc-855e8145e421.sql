
-- Create timetrack_entries table to store time tracking data
CREATE TABLE public.timetrack_entries (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('work', 'leave')),
  sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on date for fast lookups
CREATE INDEX idx_timetrack_entries_date ON public.timetrack_entries (date DESC);

-- Enable RLS but allow all access (no auth in this app)
ALTER TABLE public.timetrack_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access" ON public.timetrack_entries FOR SELECT USING (true);
CREATE POLICY "Allow all insert access" ON public.timetrack_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access" ON public.timetrack_entries FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access" ON public.timetrack_entries FOR DELETE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_timetrack_entries_updated_at
BEFORE UPDATE ON public.timetrack_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
