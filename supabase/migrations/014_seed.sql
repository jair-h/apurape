-- ============================================================
-- APURAPE · 014 · Configuración inicial y apertura de sorteos
-- ============================================================

-- ── Parámetros del negocio (editables sin migrar) ────────────
insert into public.config (key, value) values
  -- Precios del plan Pro de Proveedor, en céntimos de sol.
  ('price_pro_persona_cents',  '12000'),   -- S/120 / año
  ('price_pro_negocio_cents',  '33000'),   -- S/330 / año
  ('commission_pct',           '0'),       -- 0% sobre ventas, siempre
  ('bonus_free_months',        '1'),       -- mes gratis extra al pagar
  ('trial_days',               '30'),      -- primer mes gratis

  -- Límite del plan Básico: cotizaciones por mes. El Cliente
  -- publica solicitudes sin límite.
  ('quotes_free_per_month',    '5'),

  -- Sorteo
  ('raffle_min_five_stars',    '3'),       -- documenta la regla del generated column
  ('raffle_five_star_weight',  '10'),      -- peso del 5★ en el score

  -- Puntos del Cliente
  ('points_per_confirmation',  '10'),
  ('points_per_star',          '2'),
  ('level_plata',              '100'),
  ('level_oro',                '300'),
  ('level_platino',            '800')
on conflict (key) do nothing;

-- ── Apertura de los sorteos del mes ──────────────────────────
-- Proveedores: uno por categoría activa × persona/negocio.
-- Clientes: uno general × persona/negocio.
-- Premios internos gratis al arranque; los de efectivo, curso y
-- financiamiento se crean a mano cuando haya suscriptores.
create or replace function public.open_monthly_raffles(p_period date default null)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_period date := coalesce(p_period, public.current_period());
  n int;
begin
  insert into public.raffles
    (period, audience, category_id, participant_type, prize_type, prize_description)
  select v_period, 'proveedor', c.id, t.tipo, 'destacado',
         'Perfil destacado en ' || c.name || ' durante 30 días'
    from public.service_categories c
    cross join (values ('persona'), ('negocio')) as t(tipo)
   where c.active
  on conflict (period, audience, category_id, participant_type) do nothing;

  insert into public.raffles
    (period, audience, category_id, participant_type, prize_type, prize_description)
  select v_period, 'cliente', null, t.tipo, 'badge',
         'Insignia de Cliente Destacado del mes'
    from (values ('persona'), ('negocio')) as t(tipo)
  on conflict (period, audience, category_id, participant_type) do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

select public.open_monthly_raffles();

-- ============================================================
-- Admin inicial — EJECUTAR A MANO tras registrar la cuenta
-- ============================================================
-- No se puede crear aquí porque el perfil nace de auth.users.
-- Regístrate normalmente en la app y luego, una sola vez:
--
--   update public.profiles
--      set role = 'admin', plan = 'pro', plan_status = 'active', verified = true
--    where id = (select id from auth.users where email = 'tu-correo@dominio.com');
--
-- ============================================================
