-- ============================================================
-- APURAPE · 007 · Cotizaciones (dentro del chat)
-- ============================================================
-- Adapta deal_proposals de MARKARU. Se van las 8 columnas de
-- comercio exterior (volume_tm, incoterm, origin_port,
-- destination_country, price_unit FOB, variety, delivery_date…).
--
-- AQUÍ VIVE EL LÍMITE DEL PLAN BÁSICO: X cotizaciones por mes
-- calendario (hora Lima). Pro = ilimitadas. El número está en
-- config.quotes_free_per_month, editable sin migrar.
-- profiles.quote_credits suma cotizaciones extra (promos y el
-- premio interno del sorteo).
-- ============================================================

create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  request_id      uuid references public.service_requests(id) on delete set null,
  service_id      uuid references public.provider_services(id) on delete set null,

  provider_id     uuid not null references public.profiles(id) on delete cascade,
  client_id       uuid not null references public.profiles(id) on delete cascade,

  amount          numeric(10,2) not null check (amount >= 0),
  currency        text not null default 'PEN' check (currency in ('PEN','USD')),
  scope           text not null,                  -- qué incluye el precio
  excludes        text,                           -- qué NO incluye
  estimated_days  int,
  valid_until     date,

  status          text not null default 'pendiente'
                    check (status in ('pendiente','aceptada','rechazada','vencida','cancelada')),
  job_id          uuid,                           -- se llena al aceptar (FK en 008)

  -- Periodo al que se imputa para el límite mensual. Se fija en
  -- el trigger porque period_of() no es IMMUTABLE y no puede ir
  -- en una columna generada.
  period          date not null,

  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint quotes_distinct_parties check (provider_id <> client_id)
);

create index quotes_provider_period_idx on public.quotes (provider_id, period);
create index quotes_client_idx          on public.quotes (client_id, created_at desc);
create index quotes_conversation_idx    on public.quotes (conversation_id, created_at desc);
create index quotes_request_idx         on public.quotes (request_id);

create trigger quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- ── Consumo mensual de cotizaciones por proveedor ────────────
create view public.provider_quote_usage as
  select provider_id,
         period,
         count(*)::int as quotes_sent
    from public.quotes
   where status <> 'cancelada'
   group by provider_id, period;

-- ── ¿Cuántas le quedan este mes? ─────────────────────────────
-- Pro / trial / admin: ilimitadas (devuelve NULL).
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

  v_limit := public.config_int('quotes_free_per_month', 5) + coalesce(v_credits, 0);

  select coalesce(count(*), 0) into v_used
    from public.quotes
   where provider_id = p_provider_id
     and period = public.current_period()
     and status <> 'cancelada';

  return greatest(v_limit - v_used, 0);
end;
$$;

-- ── Fija el periodo y hace cumplir el límite ─────────────────
create or replace function public.enforce_quote_limit()
returns trigger
language plpgsql
as $$
declare
  v_left int;
begin
  new.period := public.period_of(coalesce(new.created_at, now()));

  if not exists (
    select 1 from public.profiles
    where id = new.provider_id and role = 'proveedor' and suspended = false
  ) then
    raise exception 'Solo un proveedor activo puede enviar cotizaciones';
  end if;

  v_left := public.provider_quotes_left(new.provider_id);
  if v_left is not null and v_left <= 0 then
    raise exception 'Límite de cotizaciones del plan Básico alcanzado este mes'
      using errcode = 'check_violation',
            hint    = 'Suscríbete al plan Pro para cotizaciones ilimitadas';
  end if;

  return new;
end;
$$;

create trigger quotes_enforce_limit
  before insert on public.quotes
  for each row execute function public.enforce_quote_limit();

-- ── Contadores denormalizados ────────────────────────────────
create or replace function public.bump_quote_counters()
returns trigger
language plpgsql
as $$
begin
  if new.request_id is not null then
    update public.service_requests
       set quotes_count = quotes_count + 1
     where id = new.request_id;
  end if;
  if new.service_id is not null then
    update public.provider_services
       set quotes_count = quotes_count + 1
     where id = new.service_id;
  end if;
  return new;
end;
$$;

create trigger quotes_bump_counters
  after insert on public.quotes
  for each row execute function public.bump_quote_counters();

-- ── Vencimiento (llamar desde el cron de la app) ─────────────
create or replace function public.expire_quotes()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  update public.quotes
     set status = 'vencida'
   where status = 'pendiente' and valid_until is not null and valid_until < current_date;
  get diagnostics n = row_count;
  return n;
end;
$$;
