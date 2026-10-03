-- ============================================================
-- APURAPE · 032 · Elección de premio, y el tipo de cuenta al registrarse
-- ============================================================
-- Dos cosas, y la segunda es prerrequisito de la primera.
--
-- EL TIPO DE CUENTA NO SE GUARDABA AL REGISTRARSE
-- El formulario leía 'rol' y 'plan' de la URL pero nunca 'tipo', y no
-- mandaba account_type: toda cuenta nacía como 'persona'. Las tarjetas de
-- precios ya enlazaban con ?tipo=negocio y ese dato se perdía. Sin esto no
-- se puede ofrecer tres opciones de premio para Persona y otras tres para
-- Negocio, porque en ese momento no se sabe cuál es — y tampoco servía de
-- nada la distinción Persona/Negocio de la 031.
--
-- LA ELECCIÓN ES ASPIRACIONAL
-- Indica qué le gustaría ganar, para saber qué premios conseguir. No
-- reserva ni garantiza nada, y nada la lee para decidir resultados:
-- raffles.prize_description lo sigue poniendo un administrador por
-- concurso. Si influyera en quién gana, el Índice de Excelencia dejaría de
-- ser lo que decide.
-- ============================================================

-- ── 1 · La preferencia ───────────────────────────────────────
alter table public.profiles add column prize_preference text
  check (prize_preference is null or prize_preference in (
    'curso','kit','mentoria',                 -- Persona
    'fondo','marketing','capacitacion'));     -- Negocio

comment on column public.profiles.prize_preference is
  'Qué premio le gustaría ganar. Aspiracional: no reserva ni garantiza nada y nada la lee para decidir resultados. Sirve para saber qué premios conseguir. El usuario puede cambiarla, así que NO va en guard_profile_columns.';

-- ── 2 · Coherencia con el tipo de cuenta ─────────────────────
-- Sustituye a clear_negocio_fields (031) y hace lo mismo más la
-- preferencia: si no corresponde al tipo de cuenta, se limpia. Patrón
-- autocurativo en vez de un CHECK cruzado, que haría fallar con error el
-- cambio de Negocio a Persona en lugar de dejar de aplicar.
create or replace function public.sync_account_type_fields()
returns trigger
language plpgsql
as $$
begin
  if new.account_type <> 'negocio' then
    new.logo_url         := null;
    new.promo_banner_url := null;
    new.promo_text       := null;
  end if;

  -- Una Persona no puede querer "campaña de marketing" ni un Negocio
  -- "mentoría 1 a 1": son listas distintas, no una sola con seis opciones.
  if new.prize_preference is not null then
    if new.account_type = 'negocio'
       and new.prize_preference not in ('fondo','marketing','capacitacion') then
      new.prize_preference := null;
    elsif new.account_type <> 'negocio'
       and new.prize_preference not in ('curso','kit','mentoria') then
      new.prize_preference := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_clear_negocio_fields on public.profiles;
drop trigger if exists profiles_sync_account_type on public.profiles;
create trigger profiles_sync_account_type
  before insert or update on public.profiles
  for each row execute function public.sync_account_type_fields();

drop function if exists public.clear_negocio_fields();

-- ── 3 · El alta guarda tipo de cuenta y preferencia ──────────
-- Los metadatos los controla quien se registra, así que se saneen aquí: un
-- valor inesperado violaría el CHECK y haría fallar el alta ENTERA, no solo
-- ese campo. Por eso no se pasa el texto crudo sino lo que se reconoce.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tipo  text := nullif(trim(coalesce(new.raw_user_meta_data->>'account_type', '')), '');
  v_premio text := nullif(trim(coalesce(new.raw_user_meta_data->>'prize_preference', '')), '');
begin
  insert into public.profiles (id, role, name, business_name, country,
                               account_type, prize_preference)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'cliente'),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'business_name', '')), ''),
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''), 'Perú'),
    case when v_tipo = 'negocio' then 'negocio' else 'persona' end,
    case when v_premio in ('curso','kit','mentoria','fondo','marketing','capacitacion')
         then v_premio else null end
  )
  on conflict (id) do nothing;

  insert into public.profile_private (id, phone)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''))
  on conflict (id) do nothing;

  return new;
end;
$$;
