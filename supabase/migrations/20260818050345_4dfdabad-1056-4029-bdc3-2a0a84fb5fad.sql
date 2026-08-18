ALTER TABLE public.codes
  ADD COLUMN IF NOT EXISTS market text,
  ADD COLUMN IF NOT EXISTS image_url text;