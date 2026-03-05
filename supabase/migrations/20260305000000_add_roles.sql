-- Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'guest';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'approved', 'guest'));

-- Update trigger: first user gets admin, everyone else gets guest
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count INTEGER;
    new_role TEXT;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    IF user_count = 0 THEN
        new_role := 'admin';
    ELSE
        new_role := 'guest';
    END IF;
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), new_role);
    RETURN NEW;
END;
$$;

-- RLS: admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- RLS: admins can update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- RLS: admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Seed existing user as admin (for current deployment)
UPDATE public.profiles SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'galaxy.paddock_5f@icloud.com'
);
