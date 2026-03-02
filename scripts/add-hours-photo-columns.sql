-- Add hours_photo_url and missing_photo_reason columns to job_cards table
-- These columns support the mandatory engine hours photo requirement

ALTER TABLE job_cards
ADD COLUMN IF NOT EXISTS hours_photo_url TEXT,
ADD COLUMN IF NOT EXISTS missing_photo_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN job_cards.hours_photo_url IS 'URL to the engine hours photo uploaded to Supabase Storage';
COMMENT ON COLUMN job_cards.missing_photo_reason IS 'Reason provided by technician when skipping the mandatory photo';
