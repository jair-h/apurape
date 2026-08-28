-- ============================================================
-- APURAPE · 018 · El plan Básico queda en 3 cotizaciones al mes
-- ============================================================
-- Cambio de negocio, no de lógica: el límite ya vivía en config y lo lee
-- provider_quotes_left(). Aquí solo se baja el número de 5 a 3.
--
-- Importante: 3 al mes es el límite PERMANENTE del plan gratuito, no un
-- periodo de prueba. El contador se reinicia cada mes calendario (hora de
-- Lima) porque quotes.period se calcula así, y no vence nunca.
--
-- El mes de prueba sigue funcionando aparte: mientras plan_status = 'trial'
-- provider_quotes_left() devuelve NULL (ilimitadas) y este límite no aplica.
-- Al terminar el trial, el proveedor cae a estas 3 al mes para siempre,
-- salvo que pase a Pro.
-- ============================================================

-- 014_seed.sql insertó '5' con ON CONFLICT DO NOTHING, así que hay que
-- actualizar la fila existente: un insert no la tocaría.
insert into public.config (key, value)
values ('quotes_free_per_month', '3')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Y se alinea el valor por defecto de la función, que solo se usaría si
-- alguien borrara la fila de config.
create or replace function public.provider_quotes_left(p_provider_id uuid)
returns int
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_role   text;
  v_plan   text;
  v_status text;
  v_credits int;
  v_limit  int;
  v_used   int;
begin
  select role, plan, plan_status, quote_credits
    into v_role, v_plan, v_status, v_credits
    from public.profiles where id = p_provider_id;

  if v_role is null then return 0; end if;
  if v_role = 'admin' then return null; end if;
  if v_plan = 'pro' and v_status in ('active','trial') then return null; end if;
  if v_status = 'trial' then return null; end if;   -- primer mes gratis

  v_limit := public.config_int('quotes_free_per_month', 3) + coalesce(v_credits, 0);

  select coalesce(count(*), 0) into v_used
    from public.quotes
   where provider_id = p_provider_id
     and period = public.current_period()
     and status <> 'cancelada';

  return greatest(v_limit - v_used, 0);
end;
$$;

revoke execute on function public.provider_quotes_left(uuid) from public;
grant  execute on function public.provider_quotes_left(uuid) to authenticated;
