-- Add progress column to scans (records found so far)
ALTER TABLE public.scans ADD COLUMN progress INTEGER DEFAULT NULL;

-- Add 'cancelled' to scan_status enum
ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'cancelled';
