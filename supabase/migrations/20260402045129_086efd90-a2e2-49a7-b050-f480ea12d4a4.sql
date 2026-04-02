
-- Remove old admin
DELETE FROM public.user_roles WHERE user_id = '5a7a224e-0a26-418c-a8bf-67850c523f1b';

-- Add new admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('e4b9120c-ef34-4107-848f-a66993b8a76a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
