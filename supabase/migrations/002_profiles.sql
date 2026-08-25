-- ============================================================
-- APURAPE · 002 · Perfiles
-- ============================================================
-- Reemplaza los 7 roles B2B de MARKARU por 3.
--
-- MODELO DE ROL DUAL:
--   role = rol PRINCIPAL, no permiso exclusivo.
--   · Cualquier perfil no-admin puede actuar como CLIENTE:
--     publicar solicitudes, contratar, confirmar y calificar.
--   · Solo role='proveedor' publica servicios y envía cotizaciones.
--   · Un cliente que quiere ofrecer servicios CAMBIA de rol
--     (become_provider), no crea una segunda cuenta: conserva
--     historial, puntos y calificaciones.
--
-- IDENTIDAD: profiles.id ES auth.users.id. No hay columna user_id.
-- (En MARKARU convivían id y user_id y el chat usaba uno mientras
--  las operaciones usaban el otro. Aquí hay un solo identificador.)
-- ============================================================

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,

  -- ── Rol y tipo de cuenta ──────────────────────────────────
  role                  text not null default 'cliente'
                          check (role in ('proveedor','cliente','admin')),
  -- account_type decide el PRECIO del plan Pro, no el rol.
  -- El Cliente nunca paga; para él account_type solo separa el
  -- sorteo en Persona / Negocio.
  account_type          text not null default 'persona'
                          check (account_type in ('persona','negocio')),
  became_provider_at    timestamptz,

  -- ── Plan (solo relevante si role='proveedor') ─────────────
  plan                  text not null default 'basico'
                          check (plan in ('basico','pro')),
  plan_status           text not null default 'active'
                          check (plan_status in ('trial','active','expired','cancelled')),
  trial_ends_at         timestamptz,
  plan_started_at       timestamptz,
  plan_expires_at       timestamptz,
  free_months_granted   int  not null default 0,   -- 1er mes gratis + 1 bonus al pagar
  culqi_subscription_id text,
  quote_credits         int  not null default 0,   -- cotizaciones extra (promos / premios)

  -- ── Identidad pública ─────────────────────────────────────
  name                  text,
  business_name         text,
  avatar_url            text,
  bio                   text,
  country               text default 'Perú',
  region                text,
  province              text,
  district              text,

  -- ── Reputación (agregados; la verdad vive en ratings/jobs) ─
  verified              boolean not null default false,
  rating                numeric(3,2) not null default 0,
  ratings_count         int not null default 0,
  five_star_count       int not null default 0,
  confirmed_jobs_count  int not null default 0,

  -- ── Gamificación del Cliente ──────────────────────────────
  points                int not null default 0,
  level                 text not null default 'bronce'
                          check (level in ('bronce','plata','oro','platino')),

  -- ── Moderación ────────────────────────────────────────────
  suspended             boolean not null default false,
  flagged               boolean not null default false,  -- revisión antifraude
  flag_reason           text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Datos que NO deben ser públicos aunque el perfil sí lo sea.
-- (En MARKARU el teléfono estaba en profiles con SELECT abierto
--  a cualquiera; aquí el contacto ocurre por el chat.)
create table public.profile_private (
  id           uuid primary key references public.profiles(id) on delete cascade,
  doc_type     text check (doc_type in ('dni','ruc','ce','pasaporte')),
  doc_number   text,
  phone        text,
  whatsapp     text,
  address_ref  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_role_idx        on public.profiles (role) where suspended = false;
create index profiles_zona_idx        on public.profiles (region, district);
create index profiles_rating_idx      on public.profiles (rating desc, ratings_count desc);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profile_private_updated_at
  before update on public.profile_private
  for each row execute function public.set_updated_at();

-- ── Plan inicial según rol ───────────────────────────────────
-- Portado de handle_new_profile_trial() de MARKARU y adaptado:
--   cliente  → gratis para siempre, sin trial
--   proveedor→ 30 días de Pro gratis (1er mes gratis de la oferta)
--   admin    → Pro permanente
create or replace function public.handle_new_profile_plan()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' then
    new.plan                := 'pro';
    new.plan_status         := 'active';
    new.trial_ends_at       := null;

  elsif new.role = 'proveedor' then
    new.plan                := 'basico';
    new.plan_status         := 'trial';
    new.trial_ends_at       := now() + interval '30 days';
    new.free_months_granted := 1;
    new.became_provider_at  := coalesce(new.became_provider_at, now());

  else -- cliente: nunca paga
    new.plan                := 'basico';
    new.plan_status         := 'active';
    new.trial_ends_at       := null;
  end if;

  return new;
end;
$$;

create trigger on_profile_plan
  before insert on public.profiles
  for each row execute function public.handle_new_profile_plan();

-- ── Alta automática al registrarse ───────────────────────────
-- Portado de handle_new_user() de MARKARU. Cambios:
--   · rol por defecto 'cliente' (antes 'productor')
--   · ON CONFLICT DO NOTHING: la app también inserta el perfil
--     tras elegir rol; sin esto el registro falla con duplicado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, role, name, business_name, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'cliente'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    coalesce(new.raw_user_meta_data->>'country', 'Perú')
  )
  on conflict (id) do nothing;

  insert into public.profile_private (id, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Cambio de Cliente a Proveedor (no crea otra cuenta) ──────
create or replace function public.become_provider()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.profiles
     set role               = 'proveedor',
         became_provider_at = coalesce(became_provider_at, now()),
         plan_status        = case when plan_status = 'active' and plan = 'basico'
                                   then 'trial' else plan_status end,
         trial_ends_at      = case when trial_ends_at is null
                                   then now() + interval '30 days' else trial_ends_at end,
         free_months_granted= greatest(free_months_granted, 1)
   where id = auth.uid()
     and role = 'cliente';
end;
$$;

-- ── Emails de usuarios para el panel admin (portado tal cual) ─
create or replace function public.admin_get_user_emails(user_ids uuid[])
returns table(user_id uuid, email text)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Unauthorized';
  end if;
  return query
    select u.id, u.email::text from auth.users u where u.id = any(user_ids);
end;
$$;

comment on column public.profiles.role is
  'Rol principal. Cualquier no-admin puede actuar como cliente; solo proveedor publica servicios y cotiza.';
comment on column public.profiles.account_type is
  'persona | negocio. Define el precio del plan Pro (S/120 vs S/330) y separa los sorteos.';
