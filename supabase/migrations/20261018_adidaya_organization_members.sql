-- Adidaya only. Organization roles are separate from operational user_roles.
-- Run once in the Adidaya project's Supabase SQL Editor as database owner.
BEGIN;
CREATE TABLE IF NOT EXISTS public.adidaya_organization_members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('superadmin','admin','member','viewer','system')),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.adidaya_organization_members(user_id, role, status)
SELECT p.id,
 CASE WHEN lower(u.email) = 'adi@adidayastudio.id' THEN 'superadmin'
      WHEN lower(ur.role::text) IN ('superadmin','admin','administrator','supervisor','owner','ceo') THEN 'admin'
      WHEN lower(ur.role::text) IN ('viewer','system') THEN lower(ur.role::text)
      ELSE 'member' END,
 CASE WHEN lower(p.status) IN ('inactive','archived') THEN lower(p.status) ELSE 'active' END
FROM public.profiles p JOIN auth.users u ON u.id=p.id
LEFT JOIN public.user_roles ur ON ur.user_id=p.id
ON CONFLICT (user_id) DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.adidaya_organization_members m JOIN auth.users u ON u.id=m.user_id
                WHERE lower(u.email)='adi@adidayastudio.id' AND m.role='superadmin' AND m.status='active')
 THEN RAISE EXCEPTION 'Adi superadmin initialization was not confirmed; migration rolled back'; END IF;
END $$;
ALTER TABLE public.adidaya_organization_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.adidaya_organization_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.adidaya_organization_members FROM authenticated;
GRANT SELECT ON public.adidaya_organization_members TO authenticated;
DROP POLICY IF EXISTS authenticated_read ON public.adidaya_organization_members;
CREATE POLICY authenticated_read ON public.adidaya_organization_members FOR SELECT TO authenticated USING (true);
CREATE OR REPLACE FUNCTION public.adidaya_save_organization_member(target_user_id uuid, new_role text, new_status text)
RETURNS public.adidaya_organization_members
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE actor_role text; saved public.adidaya_organization_members;
BEGIN
 -- Serialize role changes so simultaneous demotions cannot remove the last superadmin.
 PERFORM pg_advisory_xact_lock(1820261018);
 SELECT role INTO actor_role FROM public.adidaya_organization_members WHERE user_id=auth.uid() AND status='active';
 IF actor_role IS NULL OR actor_role NOT IN ('superadmin','admin') THEN RAISE EXCEPTION 'Organization administrator access required'; END IF;
 IF new_role NOT IN ('superadmin','admin','member','viewer','system') OR new_status NOT IN ('active','inactive','archived')
 THEN RAISE EXCEPTION 'Invalid organization role or status'; END IF;
 IF actor_role <> 'superadmin' AND (new_role='superadmin' OR EXISTS (
 SELECT 1 FROM public.adidaya_organization_members WHERE user_id=target_user_id AND role='superadmin'))
 THEN RAISE EXCEPTION 'Only Super Admin can modify Super Admin accounts'; END IF;
 IF EXISTS (SELECT 1 FROM public.adidaya_organization_members WHERE user_id=target_user_id AND role='superadmin' AND status='active')
 AND (new_role <> 'superadmin' OR new_status <> 'active')
 AND NOT EXISTS (SELECT 1 FROM public.adidaya_organization_members WHERE user_id<>target_user_id AND role='superadmin' AND status='active')
 THEN RAISE EXCEPTION 'Keep at least one active Super Admin'; END IF;
 UPDATE public.adidaya_organization_members SET role=new_role,status=new_status,updated_at=now()
 WHERE user_id=target_user_id RETURNING * INTO saved;
 IF NOT FOUND THEN RAISE EXCEPTION 'Adidaya member not found'; END IF;
 UPDATE public.profiles SET status=initcap(new_status) WHERE id=target_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Adidaya profile not found'; END IF;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.adidaya_save_organization_member(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adidaya_save_organization_member(uuid,text,text) TO authenticated;
COMMIT;
