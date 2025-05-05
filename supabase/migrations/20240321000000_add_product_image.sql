-- Add product_image_path column to receipts table
ALTER TABLE receipts
ADD COLUMN product_image_path TEXT;

-- Add comment to the column
COMMENT ON COLUMN receipts.product_image_path IS 'Path to the product image in storage for receipts with warranty'; 