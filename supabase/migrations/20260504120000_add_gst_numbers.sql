-- Add GST number to customers table
ALTER TABLE public.customers ADD COLUMN gst_number TEXT;

-- Add GST number to quotations table to store buyer's GST at quotation time
ALTER TABLE public.quotations ADD COLUMN buyer_gst_number TEXT;
