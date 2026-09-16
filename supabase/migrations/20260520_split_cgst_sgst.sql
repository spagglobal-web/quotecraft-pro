-- Add CGST and SGST columns to bills table
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS cgst_percentage NUMERIC(5,2) NOT NULL DEFAULT 9;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS sgst_percentage NUMERIC(5,2) NOT NULL DEFAULT 9;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add CGST and SGST columns to quotations table
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS cgst_percentage NUMERIC(5,2) NOT NULL DEFAULT 9;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS sgst_percentage NUMERIC(5,2) NOT NULL DEFAULT 9;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.bills.cgst_percentage IS 'Central Goods and Services Tax percentage';
COMMENT ON COLUMN public.bills.sgst_percentage IS 'State Goods and Services Tax percentage';
COMMENT ON COLUMN public.bills.cgst_amount IS 'CGST amount calculated on taxable amount';
COMMENT ON COLUMN public.bills.sgst_amount IS 'SGST amount calculated on taxable amount';
COMMENT ON COLUMN public.quotations.cgst_percentage IS 'Central Goods and Services Tax percentage';
COMMENT ON COLUMN public.quotations.sgst_percentage IS 'State Goods and Services Tax percentage';
COMMENT ON COLUMN public.quotations.cgst_amount IS 'CGST amount calculated on taxable amount';
COMMENT ON COLUMN public.quotations.sgst_amount IS 'SGST amount calculated on taxable amount';
