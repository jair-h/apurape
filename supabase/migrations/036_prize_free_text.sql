-- ============================================================
-- APURAPE · 036 · Premio "Otro" (texto libre) en la preferencia
-- ============================================================
-- Suma una opción "otro" a la elección de premio: además de las 3 por tipo
-- (Persona / Negocio), el usuario puede escribir libremente qué le gustaría
-- ganar. Sigue siendo ASPIRACIONAL: no reserva ni garantiza nada, nada la lee
-- para decidir resultados. El texto libre vive en una columna aparte.
-- ============================================================

-- 1 · Columna para el texto libre.
alter table public.profiles add column if not exists prize_preference_other text;

-- 2 · Permitir 'otro' en el CHECK (se busca el nombre real del constraint).
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.profiles'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%prize_preference%'
     and pg_get_constraintdef(oid) not ilike '%prize_preference_other%';
  if c is not null then execute format('alter table public.profiles drop constraint %I', c); end if;
end $$;

alter table public.profiles add constraint profiles_prize_preference_check
  check (prize_preference is null or prize_preference in (
    'curso','kit','mentoria',              -- Persona
    'fondo','marketing','capacitacion',    -- Negocio
    'otro'));                              -- Texto libre (ambos)

-- 3 · Coherencia: 'otro' vale para los dos tipos; el texto libre solo se
-- guarda si la elección es 'otro'.
create or replace function public.sync_account_type_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.account_type <> 'negocio' then
    new.logo_url         := null;
    new.promo_banner_url := null;
    new.promo_text       := null;
  end if;

  if new.prize_preference is not null and new.prize_preference <> 'otro' then
    if new.account_type = 'negocio'
       and new.prize_preference not in ('fondo','marketing','capacitacion') then
      new.prize_preference := null;
    elsif new.account_type <> 'negocio'
       and new.prize_preference not in ('curso','kit','mentoria') then
      new.prize_preference := null;
    end if;
  end if;

  -- El texto libre solo tiene sentido con la opción 'otro'.
  if new.prize_preference is distinct from 'otro' then
    new.prize_preference_other := null;
  else
    new.prize_preference_other := nullif(trim(coalesce(new.prize_preference_other, '')), '');
  end if;

  return new;
end;
$$;

-- 4 · El alta reconoce 'otro' y guarda el texto libre.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tipo   text := nullif(trim(coalesce(new.raw_user_meta_data->>'account_type', '')), '');
  v_premio text := nullif(trim(coalesce(new.raw_user_meta_data->>'prize_preference', '')), '');
  v_otro   text := nullif(trim(coalesce(new.raw_user_meta_data->>'prize_preference_other', '')), '');
begin
  insert into public.profiles (id, role, name, business_name, country,
                               account_type, prize_preference, prize_preference_other)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'cliente'),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'business_name', '')), ''),
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''), 'Perú'),
    case when v_tipo = 'negocio' then 'negocio' else 'persona' end,
    case when v_premio in ('curso','kit','mentoria','fondo','marketing','capacitacion','otro')
         then v_premio else null end,
    case when v_premio = 'otro' then v_otro else null end
  )
  on conflict (id) do nothing;

  insert into public.profile_private (id, phone)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on column public.profiles.prize_preference_other is
  'Texto libre cuando prize_preference = ''otro''. Aspiracional, igual que la preferencia.';
