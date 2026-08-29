-- --- PASSO 1: DIAGNÓSTICO (Veja o que está no banco agora) ---
SELECT 
    id, 
    provider, 
    updated_at,
    CASE 
        WHEN api_key LIKE '%njds' THEN '❌ CORROMPIDA (Termina com njds)'
        ELSE '✅ PARECE OK (Não termina com njds)'
    END as status_chave,
    LEFT(api_key, 15) || '...' || RIGHT(api_key, 5) as visualizacao_chave
FROM public.integrations 
WHERE provider = 'stripe';

-- --- PASSO 2: CORREÇÃO (Edite a linha abaixo!) ---
-- SUBSTITUA 'sk_live_SUA_CHAVE_REAL_AQUI' PELA SUA CHAVE DO DASHBOARD DO STRIPE
-- MANTENHA AS ASPAS SIMPLES!

UPDATE public.integrations
SET 
    api_key = 'sk_live_SUA_CHAVE_REAL_AQUI', 
    updated_at = NOW()
WHERE 
    provider = 'stripe';

-- --- PASSO 3: VERIFICAÇÃO FINAL ---
SELECT 
    id, 
    provider, 
    updated_at,
    CASE 
        WHEN api_key LIKE '%njds' THEN '❌ AINDA CORROMPIDA'
        ELSE '✅ AGORA ESTÁ OK!'
    END as status_final,
    LEFT(api_key, 15) || '...' || RIGHT(api_key, 5) as chave_final
FROM public.integrations 
WHERE provider = 'stripe';
