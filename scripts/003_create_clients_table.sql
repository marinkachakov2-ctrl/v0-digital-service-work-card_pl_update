-- Create clients table with financial status fields
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  vat_number TEXT,
  -- Financial status fields
  is_blocked BOOLEAN DEFAULT FALSE,
  credit_limit NUMERIC(12, 2) DEFAULT 0,
  current_balance NUMERIC(12, 2) DEFAULT 0,
  payment_terms_days INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add owner_id and payer_id columns to machines table
-- owner_id: The client who owns the machine
-- payer_id: The client responsible for payment (can be different from owner)
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_machines_owner_id ON public.machines(owner_id);
CREATE INDEX IF NOT EXISTS idx_machines_payer_id ON public.machines(payer_id);
CREATE INDEX IF NOT EXISTS idx_machines_serial_number ON public.machines(serial_number);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_blocked ON public.clients(is_blocked);

-- Insert some sample clients with different financial statuses
INSERT INTO public.clients (id, name, address, city, is_blocked, credit_limit, current_balance, payment_terms_days) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Агро Фарм ООД', 'ул. Индустриална 15', 'Пловдив', FALSE, 50000.00, 12500.00, 30),
  ('22222222-2222-2222-2222-222222222222', 'Зърнени Култури ЕООД', 'бул. България 42', 'София', FALSE, 100000.00, 85000.00, 45),
  ('33333333-3333-3333-3333-333333333333', 'БЛОКИРАН Клиент АД', 'ул. Спряна 1', 'Варна', TRUE, 25000.00, 30000.00, 15),
  ('44444444-4444-4444-4444-444444444444', 'Надвишен Лимит ЕООД', 'ул. Дългове 99', 'Бургас', FALSE, 20000.00, 25000.00, 30),
  ('55555555-5555-5555-5555-555555555555', 'Добър Платец ООД', 'ул. Редовна 7', 'Русе', FALSE, 75000.00, 5000.00, 60)
ON CONFLICT (id) DO NOTHING;

-- Update existing machines to link to sample clients
UPDATE public.machines 
SET owner_id = '11111111-1111-1111-1111-111111111111',
    payer_id = '11111111-1111-1111-1111-111111111111'
WHERE client_name ILIKE '%агро%' AND owner_id IS NULL;

UPDATE public.machines 
SET owner_id = '22222222-2222-2222-2222-222222222222',
    payer_id = '22222222-2222-2222-2222-222222222222'
WHERE client_name ILIKE '%зърн%' AND owner_id IS NULL;

-- For testing: Create a machine with a blocked payer
UPDATE public.machines 
SET payer_id = '33333333-3333-3333-3333-333333333333'
WHERE serial_number LIKE '%TEST%' AND payer_id IS NULL
LIMIT 1;
