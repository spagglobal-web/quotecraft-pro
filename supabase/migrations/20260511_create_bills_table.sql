-- Create bill status enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.bill_status AS ENUM ('draft', 'issued', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create bills table if not exists
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 18,
  gst_enabled BOOLEAN NOT NULL DEFAULT true,
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type public.discount_type NOT NULL DEFAULT 'percentage',
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.bill_status NOT NULL DEFAULT 'draft',
  buyer_gst_number TEXT,
  notes TEXT,
  payment_terms TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bill_items table if not exists
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.purifier_models(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sequence for bill numbers (if not exists)
CREATE SEQUENCE IF NOT EXISTS public.bill_number_seq START 1;

-- Auto-generate bill_number like SPAG-B-0001
CREATE OR REPLACE FUNCTION public.set_bill_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.bill_number IS NULL OR NEW.bill_number = '' THEN
    NEW.bill_number := 'SPAG-B-' || LPAD(nextval('public.bill_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_set_bill_number ON public.bills;
CREATE TRIGGER trg_set_bill_number
BEFORE INSERT ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.set_bill_number();

-- Update trigger for bills
DROP TRIGGER IF EXISTS trg_bills_updated ON public.bills;
CREATE TRIGGER trg_bills_updated
BEFORE UPDATE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS if not already enabled
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "public all" ON public.bills;
DROP POLICY IF EXISTS "public all" ON public.bill_items;

CREATE POLICY "public all" ON public.bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.bill_items FOR ALL USING (true) WITH CHECK (true);
