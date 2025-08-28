-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create junction table for journal_tags
CREATE TABLE IF NOT EXISTS public.journal_tags (
    journal_id INTEGER REFERENCES public.journals(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (journal_id, tag_id)
);

-- Create index for faster tag lookups
CREATE INDEX IF NOT EXISTS idx_journal_tags_journal_id ON public.journal_tags(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_tags_tag_id ON public.journal_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);

-- Add trigger to update journals.updated_at when tags are modified
CREATE OR REPLACE FUNCTION update_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.journals
    SET updated_at = now()
    WHERE id = NEW.journal_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_journal_updated_at
AFTER INSERT OR DELETE ON public.journal_tags
FOR EACH ROW
EXECUTE FUNCTION update_journal_updated_at();
