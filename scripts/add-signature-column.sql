-- Add signature_data column to job_cards table
-- This column stores the client signature as Base64 data

ALTER TABLE job_cards 
ADD COLUMN IF NOT EXISTS signature_data TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN job_cards.signature_data IS 'Base64 encoded signature image from client';
