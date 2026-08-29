-- Substitua o ID abaixo pelo seu User ID se for diferente
-- ID extraído dos logs anteriores: a0b3ac7c-ff6a-43b3-aee1-1ba8e9e3db45

INSERT INTO public.admins (user_id, email, full_name, active, role)
VALUES (
  'a0b3ac7c-ff6a-43b3-aee1-1ba8e9e3db45', 
  'admin@fbrsigns.com', -- Pode ajustar o email se quiser
  'System Admin', 
  true, 
  'super_admin'
)
ON CONFLICT (email) DO NOTHING; -- Evita erro se o email já existir (ajuste conforme a constraint)

-- Alternativa se você não souber o ID exato mas estiver rodando no SQL Editor logado:
-- O comando abaixo insere o usuário atual como admin (mas precisa do ID explícito se rodar como service_role)
-- INSERT INTO public.admins (user_id, email, full_name, active, role)
-- VALUES (auth.uid(), 'seu@email.com', 'Admin', true, 'admin');
