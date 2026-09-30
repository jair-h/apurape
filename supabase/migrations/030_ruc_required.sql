-- ============================================================
-- APURAPE · 030 · RUC obligatorio para el plan Negocio
-- ============================================================
-- El plan Negocio no se activa sin un RUC bien formado. La comprobación
-- ocurre DOS veces a propósito:
--
--   1. En /api/culqi/charge, ANTES de cobrar la tarjeta.
--   2. Aquí, en activate_pro_plan.
--
-- La primera es la que importa para el usuario: cobrar y después negarse a
-- activar es el peor resultado posible. La segunda es la red, porque
-- activate_pro_plan es invocable con service-role desde cualquier sitio y
-- no puede confiar en que alguien ya validó antes.
--
-- LO QUE ESTO NO PRUEBA
-- El dígito verificador rechaza números inventados. No demuestra que el
-- RUC exista en SUNAT ni que sea de quien lo escribe. Para eso hace falta
-- consultar a SUNAT o revisar un documento, y de eso se encarga la
-- verificación manual del panel de admin. Por eso la insignia "Negocio
-- Verificado" sigue siendo una decisión de un administrador y no se
-- concede sola por tener el RUC: si se concediera, solo diría "escribió
-- 11 dígitos con la aritmética correcta".
-- ============================================================

-- ── 1 · Validación por módulo 11 ─────────────────────────────
-- Pesos 5,4,3,2,7,6,5,4,3,2 sobre los 10 primeros dígitos; el resto de la
-- suma módulo 11 da el verificador (10 → 0, 11 → 1).
--
-- Se aceptan los prefijos 10, 15, 16, 17 y 20. El 10 es "persona natural
-- con negocio" —un gasfitero con RUC que factura—, así que exigir solo el
-- 20 dejaría fuera justo a los independientes formalizados que son el
-- cliente natural del plan Negocio.
--
-- Exige 11 dígitos exactos, sin espacios ni guiones: el valor guardado
-- queda canónico. La limpieza del texto se hace en el navegador (lib/ruc.ts).
create or replace function public.is_valid_ruc(p_ruc text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_pesos int[] := array[5,4,3,2,7,6,5,4,3,2];
  v_suma  int := 0;
  v_dv    int;
  i       int;
begin
  if p_ruc is null then return false; end if;
  if p_ruc !~ '^[0-9]{11}$' then return false; end if;
  if left(p_ruc, 2) not in ('10','15','16','17','20') then return false; end if;

  for i in 1..10 loop
    v_suma := v_suma + substr(p_ruc, i, 1)::int * v_pesos[i];
  end loop;

  v_dv := 11 - (v_suma % 11);
  if v_dv = 10 then v_dv := 0; end if;
  if v_dv = 11 then v_dv := 1; end if;

  return v_dv = substr(p_ruc, 11, 1)::int;
end;
$$;

-- authenticated NECESITA execute: la restricción de abajo se evalúa con el
-- rol de quien escribe, y sin este permiso cualquier guardado de datos
-- privados fallaría por permisos en vez de por el dato.
grant execute on function public.is_valid_ruc(text) to authenticated, service_role;

-- ── 2 · La restricción ───────────────────────────────────────
-- Posible porque la función es IMMUTABLE. No obliga a tener RUC: obliga a
-- que, si dice ser un RUC, lo sea.
alter table public.profile_private
  add constraint profile_private_ruc_valido
  check (doc_type is distinct from 'ruc'
         or doc_number is null
         or public.is_valid_ruc(doc_number));

-- ── 3 · La misma pregunta para el endpoint y para la función ─
create or replace function public.has_valid_ruc(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select doc_type = 'ruc' and public.is_valid_ruc(doc_number)
       from public.profile_private where id = p_profile_id),
    false);
$$;

-- Sin acceso para 'authenticated': revelaría si otro perfil tiene RUC. El
-- dueño lee su propia fila de profile_private por RLS, que ya se lo permite.
revoke execute on function public.has_valid_ruc(uuid) from public;
grant  execute on function public.has_valid_ruc(uuid) to service_role;

-- ── 4 · La red: activar Pro Negocio exige el RUC ─────────────
create or replace function public.activate_pro_plan(
  p_profile_id uuid,
  p_payment_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_bonus int := public.config_int('bonus_free_months', 1);
  v_base  timestamptz;
  v_type  text;
begin
  select account_type, greatest(coalesce(plan_expires_at, now()), now())
    into v_type, v_base
    from public.profiles where id = p_profile_id;

  if v_type is null then
    raise exception 'Perfil no encontrado';
  end if;

  if v_type = 'negocio' and not public.has_valid_ruc(p_profile_id) then
    raise exception 'El plan Negocio requiere un RUC válido registrado'
      using errcode = 'check_violation',
            hint    = 'Agrega tu RUC antes de completar el pago';
  end if;

  update public.profiles
     set plan                = 'pro',
         plan_status         = 'active',
         plan_started_at     = coalesce(plan_started_at, now()),
         plan_expires_at     = v_base + interval '12 months' + (v_bonus || ' months')::interval,
         free_months_granted = free_months_granted + v_bonus,
         trial_ends_at       = null
   where id = p_profile_id;

  if p_payment_id is not null then
    update public.payments
       set status       = 'pagado',
           period_start = now(),
           period_end   = (select plan_expires_at from public.profiles where id = p_profile_id)
     where id = p_payment_id;
  end if;
end;
$$;

revoke execute on function public.activate_pro_plan(uuid, uuid) from public;
