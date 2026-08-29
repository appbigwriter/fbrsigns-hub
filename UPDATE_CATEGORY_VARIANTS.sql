-- Update Wear and Signature Wear categories to have sizes and colors enabled
UPDATE categories
SET 
  has_sizes = true,
  has_colors = true
WHERE 
  name ILIKE '%Wear%' OR 
  name ILIKE '%Signature%';

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
