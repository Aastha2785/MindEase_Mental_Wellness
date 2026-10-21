-- MindEase V3 only: consent-based counselling conversations.
CREATE TABLE IF NOT EXISTS public.counselling_sessions (
  session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.counselling_messages (
  message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.counselling_sessions(session_id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'admin')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_counselling_sessions_user_updated ON public.counselling_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_counselling_messages_session_created ON public.counselling_messages(session_id, created_at ASC);
ALTER TABLE public.counselling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselling_messages ENABLE ROW LEVEL SECURITY;
-- The backend uses DATABASE_URL and enforces ownership/role checks in API handlers.
-- Do not expose these tables to an anonymous client or run this migration on V2.
