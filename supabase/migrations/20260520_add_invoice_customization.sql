-- Add custom invoice number field to bills table
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS custom_bill_number TEXT;

-- Add custom quotation number field to quotations table
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS custom_quotation_number TEXT;

-- Update the bill number trigger to respect custom numbers
CREATE OR REPLACE FUNCTION public.set_bill_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- If custom_bill_number is provided, use it instead
  IF NEW.custom_bill_number IS NOT NULL AND NEW.custom_bill_number != '' THEN
    NEW.bill_number := NEW.custom_bill_number;
  -- Otherwise, if bill_number is not set, auto-generate it
  ELSIF NEW.bill_number IS NULL OR NEW.bill_number = '' THEN
    NEW.bill_number := 'SPAG-B-' || LPAD(nextval('public.bill_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create sequence for quotation numbers (if not exists)
CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq START 1;

-- Auto-generate quotation_number like SPAG-Q-0001
CREATE OR REPLACE FUNCTION public.set_quotation_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- If custom_quotation_number is provided, use it instead
  IF NEW.custom_quotation_number IS NOT NULL AND NEW.custom_quotation_number != '' THEN
    NEW.quotation_number := NEW.custom_quotation_number;
  -- Otherwise, if quotation_number is not set, auto-generate it
  ELSIF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := 'SPAG-Q-' || LPAD(nextval('public.quotation_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_set_quotation_number ON public.quotations;
CREATE TRIGGER trg_set_quotation_number
BEFORE INSERT ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.set_quotation_number();

-- Add comments for clarity
COMMENT ON COLUMN public.bills.custom_bill_number IS 'Custom bill number if user wants to override auto-generated one';
COMMENT ON COLUMN public.quotations.custom_quotation_number IS 'Custom quotation number if user wants to override auto-generated one';
