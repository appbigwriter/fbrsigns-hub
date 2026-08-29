-- Script para atualizar a Chave Secreta do Stripe (Secret Key)
-- Substitua 'sk_live_SUA_CHAVE_AQUI' pela sua chave real do Dashboard do Stripe
-- A chave atual no banco parece terminar com 'njds' e está sendo rejeitada pelo Stripe.

UPDATE public.integrations
SET 
    api_key = 'sk_live_SUA_CHAVE_AQUI', -- <--- COLOCAR SUA CHAVE CORRETA AQUI
    updated_at = NOW()
WHERE 
    provider = 'stripe';

-- Verifica se a atualização foi feita (mostra apenas o início e fim da chave por segurança)
SELECT 
    provider, 
    LEFT(api_key, 12) as prefixo, 
    RIGHT(api_key, 6) as sufixo, 
    LENGTH(api_key) as tamanho_total 
FROM public.integrations 
WHERE provider = 'stripe';
