-- Add location columns to receipts table
ALTER TABLE receipts
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN location_name TEXT;

-- Add comments to the columns
COMMENT ON COLUMN receipts.latitude IS 'Latitude coordinate of where the receipt was taken';
COMMENT ON COLUMN receipts.longitude IS 'Longitude coordinate of where the receipt was taken';
COMMENT ON COLUMN receipts.location_name IS 'Human-readable location name (e.g. city, street)'; 