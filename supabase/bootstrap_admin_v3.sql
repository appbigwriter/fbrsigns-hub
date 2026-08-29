DO $$
BEGIN
    -- Verifica se o usuário já existe na tabela admins
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = 'a0b3ac7c-ff6a-43b3-aee1-1ba8e9e3db45') THEN
        -- Se não existir, insere gerando um ID novo explicitamente
        INSERT INTO public.admins (id, user_id, email, full_name, active, role)
        VALUES (
            gen_random_uuid(), -- IMPORTANTE: Gera o ID aqui para evitar erro de nulo
            'a0b3ac7c-ff6a-43b3-aee1-1ba8e9e3db45', 
            'admin@fbrsigns.com', 
            'System Admin', 
            true, 
            'super_admin'
        );
    ELSE
        -- Se existir, garante que está ativo
        UPDATE public.admins 
        SET active = true 
        WHERE user_id = 'a0b3ac7c-ff6a-43b3-aee1-1ba8e9e3db45';
    END IF;
END $$;
