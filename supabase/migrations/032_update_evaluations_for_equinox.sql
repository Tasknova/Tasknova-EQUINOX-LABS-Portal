ALTER TABLE public.ai_evaluations
ADD COLUMN IF NOT EXISTS information_captured JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS data_capture_completeness_score FLOAT;
