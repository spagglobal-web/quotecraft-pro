-- Add custom date fields to bills table
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS bill_date TIMESTAMPTZ;

-- Add custom date fields to quotations table
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS quotation_date TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN public.bills.bill_date IS 'Custom invoice date (if not set, uses created_at)';
COMMENT ON COLUMN public.quotations.quotation_date IS 'Custom quotation date (if not set, uses created_at)';
