-- ============================================================
-- APURAPE · 035 · Publicidad (Destacados pagados) — Fase 1 interna
-- ============================================================
-- Línea de ingreso APARTE de la membresía. No es comisión: el cliente nunca
-- paga y la venta proveedor–cliente sigue a 0%. La publicidad vive en un
-- mundo separado del mérito: NO toca jobs, ratings, concurso ni planes, y sus
-- impresiones/clics NO alimentan ninguna métrica del concurso.
--
-- MODELO: presupuesto + días. peso diario = presupuesto ÷ días. En cada carga
-- de página se eligen hasta N anuncios de esa categoría con probabilidad
-- proporcional al peso (rotación por peso). El gasto se descuenta por CPM, por
-- impresión REAL y deduplicada (un visitante por día cuenta una vez). Pagar
-- más NO crea tráfico ni da ranking: da mayor % de las vistas que haya.
--
-- PAGOS APAGADOS AL INICIO: ad_payment_required=false. El cobro con Culqi se
-- escribe aparte (código dormido). Mientras esté apagado, la campaña se crea
-- gratis y pasa a revisión del admin. Al prender la perilla, empieza a cobrar
-- sin reconstruir nada.
--
-- Externos (marcas de afuera) = Fase 2, inventario separado. Aquí solo interno.
-- ============================================================

-- ── 1 · Perillas (hoy Perú/PEN; multi-país se agrega luego con sufijo) ──
insert into public.config (key, value) values
  ('ads_enabled',                 to_jsonb(true)),   -- kill switch global
  ('ad_payment_required',         to_jsonb(false)),  -- cobro Culqi: apagado al inicio
  ('ad_currency',                 to_jsonb('PEN')),
  ('ad_min_budget',               to_jsonb(20)),     -- soles, sin máximo
  ('ad_budget_step',              to_jsonb(10)),     -- incrementos
  ('ad_min_days',                 to_jsonb(3)),      -- sugeridas 7/15/30
  ('ad_cpm',                      to_jsonb(15)),     -- soles por 1,000 impresiones
  ('ad_max_slots_per_placement',  to_jsonb(3)),
  ('ad_max_share_per_advertiser', to_jsonb(0.5)),    -- un grande no monopoliza
  ('ad_dedup_window_days',        to_jsonb(1)),      -- 1 impresión por visitante/día
  ('ad_extend_max_multiple',      to_jsonb(2))       -- saldo sobrante extiende, tope 2× los días
on conflict (key) do nothing;

-- Helper booleano sobre config (no existía; hermano de config_int/numeric).
create or replace function public.config_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select (value #>> '{}')::boolean from public.config where key = p_key),
    p_default);
$$;
grant execute on function public.config_bool(text, boolean) to anon, authenticated;

-- ── 2 · La campaña ───────────────────────────────────────────
create table public.promotions (
  id             uuid primary key default gen_random_uuid(),
  advertiser_id  uuid not null references public.profiles(id) on delete cascade,

  -- Qué se promociona. 'externo' queda para la Fase 2 (no se usa aún).
  kind           text not null check (kind in ('perfil','producto')),
  service_id     uuid references public.provider_services(id) on delete cascade,
  -- El anuncio está amarrado a una categoría: solo se muestra en la búsqueda
  -- que cae en esa categoría y en la página de esa categoría.
  category_id    uuid not null references public.service_categories(id),

  budget_cents   int  not null check (budget_cents > 0),
  days           int  not null check (days > 0),
  -- peso para la rotación = presupuesto por día. Lo fija create_promotion.
  daily_weight   numeric(12,4) not null default 0,

  spent_cents    int  not null default 0 check (spent_cents >= 0),
  impressions    int  not null default 0,
  clicks         int  not null default 0,

  status         text not null default 'pendiente' check (status in
                   ('pendiente','activa','pausada','vencida','rechazada')),
  reject_reason  text,

  starts_at      timestamptz,
  ends_at        timestamptz,
  base_days      int,                -- días originales, para el tope de extensión
  leftover_cents int not null default 0,  -- saldo no gastado al vencer (crédito futuro)

  -- Culqi: null mientras los pagos estén apagados.
  payment_id     text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- 'producto' exige un servicio; 'perfil' no lleva servicio.
  constraint promotions_producto_needs_service
    check ((kind = 'producto' and service_id is not null)
        or (kind <> 'producto' and service_id is null))
);

create index promotions_serve_idx
  on public.promotions (category_id, status) where status = 'activa';
create index promotions_advertiser_idx
  on public.promotions (advertiser_id, created_at desc);

create trigger promotions_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

-- ── 3 · Eventos (impresiones y clics), con dedup en la propia tabla ──
-- El UNIQUE (promotion_id, kind, viewer_hash, day) hace que insertar con
-- ON CONFLICT DO NOTHING deduplique por visitante y día sin lógica extra.
create table public.promotion_events (
  id            uuid primary key default gen_random_uuid(),
  promotion_id  uuid not null references public.promotions(id) on delete cascade,
  kind          text not null check (kind in ('impresion','clic')),
  viewer_hash   text not null,          -- marca anónima del visitante (no es login)
  day           date not null,
  placement     text,                   -- 'busqueda' | 'categoria' (informativo)
  created_at    timestamptz not null default now(),
  unique (promotion_id, kind, viewer_hash, day)
);

create index promotion_events_promo_idx on public.promotion_events (promotion_id, kind, day);

-- ── 4 · Crear campaña (valida y deja en 'pendiente' de revisión) ──
-- El cobro NO vive aquí: si ad_payment_required=true, el endpoint cobra ANTES
-- y pasa p_payment_id. Aquí solo se valida y se registra.
create or replace function public.create_promotion(
  p_kind        text,
  p_service_id  uuid,
  p_category_id uuid,
  p_budget      int,          -- en soles (entero)
  p_days        int,
  p_payment_id  text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid     uuid := auth.uid();
  v_prof    public.profiles%rowtype;
  v_min     int    := public.config_int('ad_min_budget', 20);
  v_step    int    := public.config_int('ad_budget_step', 10);
  v_mindays int    := public.config_int('ad_min_days', 3);
  v_needpay boolean;
  v_budget_cents int;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if not public.config_bool('ads_enabled', true) then
    raise exception 'La publicidad no está disponible por ahora';
  end if;

  select * into v_prof from public.profiles where id = v_uid;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if v_prof.role <> 'proveedor' then
    raise exception 'Solo un proveedor puede anunciar';
  end if;
  -- Solo Pro (el trial ES Pro). is_pro() ya resuelve plan+estado.
  if not public.is_pro(v_uid) then
    raise exception 'La publicidad es un beneficio del plan Pro';
  end if;

  if p_kind not in ('perfil','producto') then
    raise exception 'Tipo de anuncio no válido';
  end if;

  -- Validación del monto: mínimo y múltiplos del incremento.
  if p_budget is null or p_budget < v_min then
    raise exception 'El mínimo de publicidad es % soles', v_min;
  end if;
  if ((p_budget - v_min) % v_step) <> 0 then
    raise exception 'El monto sube de % en % soles', v_step, v_step;
  end if;
  if p_days is null or p_days < v_mindays then
    raise exception 'La duración mínima es de % días', v_mindays;
  end if;

  -- Persona anuncia su perfil; Negocio su perfil o un producto del catálogo.
  if p_kind = 'producto' then
    if v_prof.account_type <> 'negocio' then
      raise exception 'Solo una cuenta Negocio puede anunciar un producto';
    end if;
    if not exists (
      select 1 from public.provider_services
       where id = p_service_id and provider_id = v_uid and status = 'activo'
    ) then
      raise exception 'El servicio no existe, no es tuyo o está pausado';
    end if;
  end if;

  if not exists (select 1 from public.service_categories where id = p_category_id and active) then
    raise exception 'Categoría no válida';
  end if;

  -- Si los pagos están prendidos, exige el id del cobro ya hecho.
  v_needpay := public.config_bool('ad_payment_required', false);
  if v_needpay and (p_payment_id is null or p_payment_id = '') then
    raise exception 'Falta el pago de la campaña';
  end if;

  v_budget_cents := p_budget * 100;

  insert into public.promotions
    (advertiser_id, kind, service_id, category_id, budget_cents, days,
     daily_weight, status, starts_at, ends_at, base_days, payment_id)
  values
    (v_uid, p_kind, case when p_kind = 'producto' then p_service_id end, p_category_id,
     v_budget_cents, p_days,
     round(v_budget_cents::numeric / p_days, 4),   -- peso = presupuesto/día
     'pendiente', now(), now() + (p_days || ' days')::interval, p_days, p_payment_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_promotion(text, uuid, uuid, int, int, text) from public;
grant  execute on function public.create_promotion(text, uuid, uuid, int, int, text) to authenticated;

-- ── 5 · Elegir qué mostrar: rotación por peso ────────────────
-- Devuelve hasta N anuncios ACTIVOS de la categoría, elegidos al azar con
-- probabilidad proporcional al peso (muestreo ponderado de Efraimidis-Spirakis:
-- clave = random()^(1/peso), se toman las mayores). Respeta el tope por
-- anunciante (ad_max_share_per_advertiser): nadie ocupa más de floor(N*share)
-- slots, con mínimo 1.
create or replace function public.ad_pick(p_category_id uuid, p_placement text default 'busqueda')
returns setof public.promotions
language sql
stable
security definer
set search_path to 'public'
as $$
  with n as (
    select public.config_int('ad_max_slots_per_placement', 3) as slots,
           greatest(1, floor(public.config_int('ad_max_slots_per_placement', 3)
                           * public.config_numeric('ad_max_share_per_advertiser', 0.5))::int) as per_adv
  ),
  cand as (
    select p.*,
           power(random(), 1.0 / greatest(p.daily_weight, 0.0001)) as k
      from public.promotions p
     where p.category_id = p_category_id
       and p.status = 'activa'
       and (p.ends_at is null or p.ends_at > now())
  ),
  capped as (
    select c.*,
           row_number() over (partition by c.advertiser_id order by c.k desc) as rn_adv
      from cand c
  )
  select id, advertiser_id, kind, service_id, category_id, budget_cents, days,
         daily_weight, spent_cents, impressions, clicks, status, reject_reason,
         starts_at, ends_at, base_days, leftover_cents, payment_id, created_at, updated_at
    from capped, n
   where capped.rn_adv <= n.per_adv
   order by capped.k desc
   limit (select slots from n);
$$;
grant execute on function public.ad_pick(uuid, text) to anon, authenticated;

-- ── 6 · Registrar evento y descontar presupuesto ────────────
-- Lo llama el endpoint con service-role (no anon directo), para que no se
-- puedan inflar vistas/clics a mano. El UNIQUE deduplica por visitante/día:
-- si ON CONFLICT no inserta, no se cuenta ni se gasta. El clic NO gasta (es
-- modelo CPM: se paga la vista, el clic es gratis y solo se mide).
create or replace function public.ad_record_event(
  p_promotion_id uuid, p_kind text, p_viewer_hash text, p_placement text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_new    boolean := false;
  v_cpm    int := public.config_int('ad_cpm', 15);      -- soles / 1000
  v_promo  public.promotions%rowtype;
begin
  if p_kind not in ('impresion','clic') then return false; end if;

  insert into public.promotion_events (promotion_id, kind, viewer_hash, day, placement)
  values (p_promotion_id, p_kind, coalesce(p_viewer_hash, 'anon'),
          (now() at time zone 'America/Lima')::date, p_placement)
  on conflict (promotion_id, kind, viewer_hash, day) do nothing;

  get diagnostics v_new = row_count;   -- 1 = evento nuevo (no duplicado)
  if not v_new then return false; end if;

  if p_kind = 'impresion' then
    -- El gasto se DERIVA del conteo exacto para no arrastrar redondeo por
    -- impresión: spent = round(impresiones × CPM ÷ 10) céntimos
    -- (CPM soles/1000 → céntimos/impresión = CPM×100/1000 = CPM/10).
    update public.promotions
       set impressions = impressions + 1,
           spent_cents = round(((impressions + 1) * v_cpm)::numeric / 10)::int
     where id = p_promotion_id
     returning * into v_promo;
    -- Presupuesto agotado (tope de impresiones = budget×10÷CPM) → se apaga
    -- aunque queden días.
    if found and v_promo.impressions >= (v_promo.budget_cents * 10 / v_cpm) then
      update public.promotions
         set status = 'vencida',
             leftover_cents = greatest(budget_cents - spent_cents, 0)
       where id = p_promotion_id and status = 'activa';
    end if;
  else
    update public.promotions set clicks = clicks + 1 where id = p_promotion_id;
  end if;

  return true;
end;
$$;
revoke execute on function public.ad_record_event(uuid, text, text, text) from public, anon, authenticated;
-- Solo service-role (desde el endpoint) la ejecuta.

-- ── 7 · Vencimiento diario + extensión por saldo (tope 2×) ──
create or replace function public.expire_promotions()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.promotions%rowtype;
  v_mult int := public.config_int('ad_extend_max_multiple', 2);
  n int := 0;
begin
  for r in
    select * from public.promotions
     where status = 'activa' and ends_at is not null and ends_at <= now()
  loop
    if r.spent_cents < r.budget_cents
       and now() < r.starts_at + ((r.base_days * v_mult) || ' days')::interval then
      -- Queda saldo y aún no se llega al tope: se extiende la vigencia.
      update public.promotions
         set ends_at = least(now() + (r.base_days || ' days')::interval,
                             r.starts_at + ((r.base_days * v_mult) || ' days')::interval)
       where id = r.id;
    else
      -- Se acabó el tiempo (o el tope): vence y guarda el saldo como crédito.
      update public.promotions
         set status = 'vencida',
             leftover_cents = greatest(budget_cents - spent_cents, 0)
       where id = r.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke execute on function public.expire_promotions() from public;

-- Diario a las 05:20 UTC = 00:20 de Lima (Perú no tiene horario de verano).
select cron.schedule(
  'apurape-publicidad-vencimientos',
  '20 5 * * *',
  $cron$ select public.expire_promotions(); $cron$
);

-- ── 8 · RLS ──────────────────────────────────────────────────
alter table public.promotions       enable row level security;
alter table public.promotion_events enable row level security;

-- El anunciante ve y maneja lo suyo; el admin, todo.
create policy "Anuncios: dueño o admin" on public.promotions
  for select using (advertiser_id = auth.uid() or public.is_admin());
create policy "Anuncios: el dueño pausa/edita lo suyo" on public.promotions
  for update using (advertiser_id = auth.uid() or public.is_admin())
  with check (advertiser_id = auth.uid() or public.is_admin());
-- El alta va SIEMPRE por create_promotion() (valida Pro, mínimo, etc.), nunca
-- por INSERT directo: no se crea policy de INSERT a propósito.
create policy "Anuncios admin manda" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- Los eventos solo los lee el dueño del anuncio o el admin; se insertan por
-- service-role (ad_record_event), nunca directo.
create policy "Eventos: dueño del anuncio o admin" on public.promotion_events
  for select using (
    public.is_admin()
    or exists (select 1 from public.promotions pr
                where pr.id = promotion_id and pr.advertiser_id = auth.uid()));

comment on table public.promotions is
  'Publicidad interna (Fase 1). Mundo separado del concurso: no toca jobs/ratings/mérito.';
comment on column public.promotions.daily_weight is
  'Presupuesto por día (céntimos/día). Base de la rotación por peso: más peso = más veces mostrado.';
comment on column public.promotions.leftover_cents is
  'Saldo no gastado al vencer. Base del crédito al anunciante cuando los pagos estén activos.';
