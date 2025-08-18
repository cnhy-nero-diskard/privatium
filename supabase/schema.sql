-- Create journals table
CREATE TABLE public.journals (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    folder TEXT NOT NULL,
    mood TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- No need for user_id or RLS policies since you are the sole user

-- Remove user_id column and related index/policies
-- (No RLS, no user_id column, no index, no policies needed)
