-- MindEase V3 only. Persists one refreshed weekly snapshot per student/week.
CREATE TABLE IF NOT EXISTS public.weekly_analyses (
  weekly_analysis_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_analyses_valid_range CHECK (week_end >= week_start),
  CONSTRAINT weekly_analyses_user_week_unique UNIQUE (user_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_weekly_analyses_user_week
  ON public.weekly_analyses(user_id, week_start DESC);

-- Completion dates are required to count carry-over tasks on the day completed.
ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Existing completed tasks cannot be accurately backdated; leave completed_at NULL
-- rather than inventing a completion date. New completions are timestamped by the API.
