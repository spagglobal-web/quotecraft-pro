-- Add bank_name and bank_branch to bills table
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS bank_branch TEXT;

-- Add bank_name and bank_branch to quotations table
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS bank_branch TEXT;
