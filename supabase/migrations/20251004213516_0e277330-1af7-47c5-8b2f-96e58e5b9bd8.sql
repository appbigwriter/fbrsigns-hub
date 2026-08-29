-- Add is_taxable column to invoice_items
ALTER TABLE invoice_items 
ADD COLUMN is_taxable BOOLEAN DEFAULT true;

-- Update existing items to be taxable by default
UPDATE invoice_items 
SET is_taxable = true 
WHERE is_taxable IS NULL;