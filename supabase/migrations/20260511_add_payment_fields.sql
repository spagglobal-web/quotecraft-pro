-- Add account_number and ifsc_code to quotations table if they don't exist
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS ifsc_code TEXT;

-- Add buyer_gst_number to bills table if it doesn't exist (in case bills table was created differently)
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS buyer_gst_number TEXT;
