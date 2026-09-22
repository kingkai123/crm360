ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_setup boolean NOT NULL DEFAULT false;

-- Admins can maintain any profile row (used when adding/removing members)
CREATE POLICY "admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
