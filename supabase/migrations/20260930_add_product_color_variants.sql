ALTER TABLE public.purifier_models
ADD COLUMN IF NOT EXISTS color_variants JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.purifier_models
ALTER COLUMN category SET DEFAULT 'Purifier';