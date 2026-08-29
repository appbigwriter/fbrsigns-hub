-- INSTRUÇÕES PARA CORRIGIR A CHAVE DO STRIPE
-- 1. Obtenha sua Secret Key correta no Dashboard do Stripe (começa com sk_test_...)
-- 2. Substitua 'SUA_NOVA_CHAVE_AQUI' abaixo pela chave real.
-- 3. Rode este script no Editor SQL do Supabase.

UPDATE integrations
SET api_key = 'SUA_NOVA_CHAVE_AQUI'
WHERE provider = 'stripe';

-- Verifique se a atualização funcionou
SELECT id, provider, api_key, is_active FROM integrations WHERE provider = 'stripe';
