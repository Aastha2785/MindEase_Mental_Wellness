
-- MindEase V3: Store breathing exercise sessions

CREATE TABLE IF NOT EXISTS public.meditation_sessions (
    session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES public.users(user_id)
        ON DELETE CASCADE,

    duration_seconds INTEGER NOT NULL
        CHECK (duration_seconds BETWEEN 5 AND 86400),

    mode TEXT NOT NULL
        CHECK (mode IN ('timed', 'free')),

    completed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_created
    ON public.meditation_sessions (user_id, created_at DESC);

ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;
