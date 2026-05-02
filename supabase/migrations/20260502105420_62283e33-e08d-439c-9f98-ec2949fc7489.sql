-- Quotation status enum
CREATE TYPE public.quotation_status AS ENUM ('draft', 'sent', 'approved');
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');

CREATE TABLE public.purifier_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'RO',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 18,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT,
  address TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence for quotation numbers
CREATE SEQUENCE public.quotation_number_seq START 1;

CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 18,
  gst_enabled BOOLEAN NOT NULL DEFAULT true,
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type public.discount_type NOT NULL DEFAULT 'percentage',
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  validity_days INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
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

-- Auto-generate quotation_number like SPAG-Q-0001
CREATE OR REPLACE FUNCTION public.set_quotation_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := 'SPAG-Q-' || LPAD(nextval('public.quotation_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_quotation_number
BEFORE INSERT ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.set_quotation_number();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_quotations_updated
BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS with permissive policies (no auth requested)
ALTER TABLE public.purifier_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.purifier_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.quotation_items FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for logos & product images
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read assets" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "Public upload assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets');
CREATE POLICY "Public update assets" ON storage.objects FOR UPDATE USING (bucket_id = 'assets');
CREATE POLICY "Public delete assets" ON storage.objects FOR DELETE USING (bucket_id = 'assets');