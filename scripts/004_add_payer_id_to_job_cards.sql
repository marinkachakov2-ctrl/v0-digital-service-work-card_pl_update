-- Add payer_id column to job_cards table
-- This stores the billing entity/payer for the job card

ALTER TABLE public.job_cards 
ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add index for faster lookups by payer
CREATE INDEX IF NOT EXISTS idx_job_cards_payer_id ON public.job_cards(payer_id);

-- Add comment for documentation
COMMENT ON COLUMN public.job_cards.payer_id IS 'Reference to the billing entity (payer) for this job card';
