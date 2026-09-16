-- Ensure account_number and ifsc_code exist in bills table (might already exist from code)
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

-- Ensure account_number and ifsc_code exist in quotations table
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.bills.account_number IS 'Bank account number for payment';
COMMENT ON COLUMN public.bills.ifsc_code IS 'IFSC code for bank transfer';
COMMENT ON COLUMN public.bills.account_holder_name IS 'Name of the bank account holder';
COMMENT ON COLUMN public.quotations.account_number IS 'Bank account number for payment';
COMMENT ON COLUMN public.quotations.ifsc_code IS 'IFSC code for bank transfer';
COMMENT ON COLUMN public.quotations.account_holder_name IS 'Name of the bank account holder';
