-- Remove o constraint existente
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_check;

-- Agora atualiza todos os produtos com unidades antigas
UPDATE products SET unit = 'sq ft' WHERE unit = 'm²';
UPDATE products SET unit = 'ft' WHERE unit = 'm';
UPDATE products SET unit = 'unit' WHERE unit = 'kg';
UPDATE products SET unit = 'unit' WHERE unit IS NULL OR unit NOT IN ('unit', 'sq ft', 'sq in', 'ft', 'in');

-- Adiciona o novo constraint
ALTER TABLE products ADD CONSTRAINT products_unit_check 
CHECK (unit IN ('unit', 'sq ft', 'sq in', 'ft', 'in'));