-- Optional explicit warranty end date; when null, dashboards may estimate from purchase_date.
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS warranty_expires_at date;

COMMENT ON COLUMN public.receipts.warranty_expires_at IS 'Warranty end date. If null and warranty is true, UI estimates twelve months from purchase_date.';
