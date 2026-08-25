-- ============================================================
-- APURAPE · 010 · Conteos mensuales y sorteo
-- ============================================================
-- El diferencial del producto. Reglas:
--   · Entran ventas CONFIRMADAS por el Cliente (jobs.status =
--     'confirmado' y not flagged), nunca las marcadas por el
--     Proveedor.
--   · Califica quien tenga ≥ 3 calificaciones de 5 estrellas en
--     el mes, en esa categoría.
--   · Sorteo separado por categoría y por tipo (persona/negocio),
--     y con sorteo propio para Clientes.
--   · Ganador por RANKING AUTOMÁTICO, no por votación.
--
-- Las tablas *_monthly_stats son CACHÉ. La verdad son jobs y
-- ratings: rebuild_month() las reconstruye enteras en cualquier
-- momento, así que un ranking nunca queda roto sin arreglo.
-- ============================================================

-- ── Conteo del Proveedor, por mes y categoría ────────────────
-- La categoría entra en la clave porque el sorteo es por
-- categoría: el requisito de 3 cincos se evalúa dentro de ella.
create table public.provider_monthly_stats (
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  period          date not null,
  category_id     uuid not null references public.service_categories(id),

  confirmed_jobs  int not null default 0,
  gross_amount    numeric(12,2) not null default 0,
  ratings_count   int not null default 0,
  five_star_count int not null default 0,
  avg_stars       numeric(3,2) not null default 0,

  qualifies       boolean generated always as
                    (confirmed_jobs > 0 and five_star_count >= 3) stored,

  updated_at      timestamptz not null default now(),
  primary key (profile_id, period, category_id)
);

create index provider_monthly_stats_ranking_idx
  on public.provider_monthly_stats (period, category_id, five_star_count desc, confirmed_jobs desc);

-- ── Conteo del Cliente (no paga nada y también participa) ────
create table public.client_monthly_stats (
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  period           date not null,
  confirmed_jobs   int not null default 0,   -- servicios que confirmó
  ratings_given    int not null default 0,
  points_earned    int not null default 0,
  qualifies        boolean generated always as (confirmed_jobs > 0) stored,
  updated_at       timestamptz not null default now(),
  primary key (profile_id, period)
);

-- ── Ledger de puntos: de dónde salió cada punto ──────────────
create table public.point_events (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id     uuid references public.jobs(id) on delete set null,
  reason     text not null check (reason in
               ('confirmacion','calificacion_recibida','bono','ajuste_admin','premio')),
  points     int not null,
  period     date not null,
  note       text,
  created_at timestamptz not null default now()
);

create index point_events_profile_idx on public.point_events (profile_id, created_at desc);

-- ── Sorteos ──────────────────────────────────────────────────
create table public.raffles (
  id                uuid primary key default gen_random_uuid(),
  period            date not null,
  audience          text not null check (audience in ('proveedor','cliente')),
  category_id       uuid references public.service_categories(id),  -- null = general (clientes)
  participant_type  text not null check (participant_type in ('persona','negocio')),

  -- Arranca con premios internos gratis. Los de efectivo, cursos
  -- y financiamiento se habilitan cuando haya suscriptores.
  prize_type        text not null check (prize_type in
                      ('upgrade','destacado','badge','cotizaciones','efectivo','curso','financiamiento')),
  prize_description text,
  prize_value       numeric(10,2),

  status            text not null default 'abierto'
                      check (status in ('abierto','cerrado','premiado','anulado')),
  winner_profile_id uuid references public.profiles(id),
  entries_total     int not null default 0,
  closed_at         timestamptz,
  awarded_at        timestamptz,
  created_at        timestamptz not null default now(),

  unique (period, audience, category_id, participant_type)
);

create table public.raffle_entries (
  id              uuid primary key default gen_random_uuid(),
  raffle_id       uuid not null references public.raffles(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  entries         int not null default 0,
  confirmed_jobs  int not null default 0,
  five_star_count int not null default 0,
  score           numeric(10,2) not null default 0,
  rank            int,
  computed_at     timestamptz not null default now(),
  unique (raffle_id, profile_id)
);

create index raffle_entries_rank_idx on public.raffle_entries (raffle_id, rank);

-- ============================================================
-- Recálculo de conteos (idempotente)
-- ============================================================
create or replace function public.recalc_provider_month(
  p_profile_id uuid, p_period date, p_category_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_category_id is null or p_period is null then return; end if;

  insert into public.provider_monthly_stats as s
    (profile_id, period, category_id, confirmed_jobs, gross_amount,
     ratings_count, five_star_count, avg_stars, updated_at)
  select p_profile_id, p_period, p_category_id,
         count(distinct j.id),
         coalesce(sum(j.amount), 0),
         count(r.id),
         count(r.id) filter (where r.stars = 5),
         coalesce(round(avg(r.stars)::numeric, 2), 0),
         now()
    from public.jobs j
    left join public.ratings r
           on r.job_id = j.id and r.direction = 'cliente_a_proveedor'
   where j.provider_id = p_profile_id
     and j.period      = p_period
     and j.category_id = p_category_id
     and j.status      = 'confirmado'
     and j.flagged     = false
  on conflict (profile_id, period, category_id) do update
    set confirmed_jobs  = excluded.confirmed_jobs,
        gross_amount    = excluded.gross_amount,
        ratings_count   = excluded.ratings_count,
        five_star_count = excluded.five_star_count,
        avg_stars       = excluded.avg_stars,
        updated_at      = now();
end;
$$;

create or replace function public.recalc_client_month(p_profile_id uuid, p_period date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_period is null then return; end if;

  insert into public.client_monthly_stats as s
    (profile_id, period, confirmed_jobs, ratings_given, points_earned, updated_at)
  select p_profile_id, p_period,
         (select count(*) from public.jobs j
           where j.client_id = p_profile_id and j.period = p_period
             and j.status = 'confirmado' and j.flagged = false),
         (select count(*) from public.ratings r
           where r.rater_id = p_profile_id and r.period = p_period),
         (select coalesce(sum(pe.points), 0) from public.point_events pe
           where pe.profile_id = p_profile_id and pe.period = p_period),
         now()
  on conflict (profile_id, period) do update
    set confirmed_jobs = excluded.confirmed_jobs,
        ratings_given  = excluded.ratings_given,
        points_earned  = excluded.points_earned,
        updated_at     = now();
end;
$$;

-- ── Disparadores ─────────────────────────────────────────────
create or replace function public.on_job_confirmed_stats()
returns trigger
language plpgsql
as $$
begin
  -- Puntos del Cliente por confirmar (solo en la transición).
  if new.status = 'confirmado' and old.status is distinct from 'confirmado' then
    insert into public.point_events (profile_id, job_id, reason, points, period)
    values (new.client_id, new.id, 'confirmacion',
            public.config_int('points_per_confirmation', 10), new.period);
  end if;

  perform public.recalc_provider_month(new.provider_id, new.period, new.category_id);
  perform public.recalc_client_month(new.client_id, new.period);
  perform public.refresh_client_level(new.client_id);
  return null;
end;
$$;

create trigger jobs_stats_after_confirm
  after update of status, flagged on public.jobs
  for each row execute function public.on_job_confirmed_stats();

create or replace function public.on_rating_stats()
returns trigger
language plpgsql
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = new.job_id;

  if new.direction = 'cliente_a_proveedor' then
    perform public.recalc_provider_month(j.provider_id, j.period, j.category_id);
  else
    -- Estrellas recibidas por el Cliente → puntos.
    insert into public.point_events (profile_id, job_id, reason, points, period)
    values (new.rated_id, j.id, 'calificacion_recibida',
            new.stars * public.config_int('points_per_star', 2), new.period);
    perform public.refresh_client_level(new.rated_id);
  end if;

  perform public.recalc_client_month(j.client_id, j.period);
  return null;
end;
$$;

create trigger ratings_stats_after_insert
  after insert on public.ratings
  for each row execute function public.on_rating_stats();

-- ── Puntos y nivel del Cliente ───────────────────────────────
create or replace function public.refresh_client_level(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_points int;
begin
  select coalesce(sum(points), 0) into v_points
    from public.point_events where profile_id = p_profile_id;

  update public.profiles
     set points = v_points,
         level  = case
                    when v_points >= public.config_int('level_platino', 800) then 'platino'
                    when v_points >= public.config_int('level_oro',     300) then 'oro'
                    when v_points >= public.config_int('level_plata',   100) then 'plata'
                    else 'bronce'
                  end
   where id = p_profile_id;
end;
$$;

-- ============================================================
-- Antifraude: pares recíprocos
-- ============================================================
-- Con rol dual, dos proveedores pueden contratarse mutuamente y
-- generar entradas para ambos. Esta vista los expone y la
-- función los marca antes de cerrar el sorteo del mes.
create view public.suspicious_job_pairs as
  select a.id as job_a, b.id as job_b, a.period,
         a.provider_id as p1, a.client_id as p2
    from public.jobs a
    join public.jobs b
      on b.provider_id = a.client_id
     and b.client_id   = a.provider_id
     and b.period      = a.period
   where a.status = 'confirmado' and b.status = 'confirmado'
     and a.id < b.id;

create or replace function public.flag_reciprocal_jobs(p_period date)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  update public.jobs
     set flagged = true,
         flag_reason = coalesce(flag_reason, 'par recíproco en el mismo periodo')
   where period = p_period
     and flagged = false
     and id in (select job_a from public.suspicious_job_pairs where period = p_period
                union
                select job_b from public.suspicious_job_pairs where period = p_period);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ============================================================
-- Reconstrucción total de un mes (red de seguridad)
-- ============================================================
create or replace function public.rebuild_month(p_period date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare r record;
begin
  delete from public.provider_monthly_stats where period = p_period;
  delete from public.client_monthly_stats   where period = p_period;

  for r in
    select distinct provider_id, category_id from public.jobs
     where period = p_period and status = 'confirmado' and flagged = false
       and category_id is not null
  loop
    perform public.recalc_provider_month(r.provider_id, p_period, r.category_id);
  end loop;

  for r in
    select distinct client_id from public.jobs where period = p_period
  loop
    perform public.recalc_client_month(r.client_id, p_period);
  end loop;
end;
$$;

-- ============================================================
-- Cálculo y cierre del sorteo
-- ============================================================
-- Entradas = ventas confirmadas, pero SOLO si califica (≥3 cincos).
-- Score = five_star_count * peso + ventas confirmadas.
create or replace function public.compute_raffle_entries(p_raffle_id uuid)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rf public.raffles%rowtype;
  v_w int := public.config_int('raffle_five_star_weight', 10);
  n int;
begin
  select * into rf from public.raffles where id = p_raffle_id;
  if not found then raise exception 'Sorteo no encontrado'; end if;

  perform public.flag_reciprocal_jobs(rf.period);
  perform public.rebuild_month(rf.period);

  delete from public.raffle_entries where raffle_id = p_raffle_id;

  if rf.audience = 'proveedor' then
    insert into public.raffle_entries
      (raffle_id, profile_id, entries, confirmed_jobs, five_star_count, score)
    select p_raffle_id, s.profile_id, s.confirmed_jobs, s.confirmed_jobs,
           s.five_star_count, (s.five_star_count * v_w) + s.confirmed_jobs
      from public.provider_monthly_stats s
      join public.profiles p on p.id = s.profile_id
     where s.period       = rf.period
       and s.category_id  = rf.category_id
       and s.qualifies    = true
       and p.account_type = rf.participant_type
       and p.suspended    = false
       and p.flagged      = false;
  else
    insert into public.raffle_entries
      (raffle_id, profile_id, entries, confirmed_jobs, five_star_count, score)
    select p_raffle_id, c.profile_id, c.confirmed_jobs, c.confirmed_jobs, 0,
           c.points_earned
      from public.client_monthly_stats c
      join public.profiles p on p.id = c.profile_id
     where c.period       = rf.period
       and c.qualifies    = true
       and p.account_type = rf.participant_type
       and p.suspended    = false
       and p.flagged      = false;
  end if;

  -- Ranking automático. Desempate: más cincos, luego más ventas,
  -- luego quien llegó primero.
  with ranked as (
    select id, row_number() over (
             order by score desc, five_star_count desc, confirmed_jobs desc, computed_at asc
           ) as rn
      from public.raffle_entries where raffle_id = p_raffle_id
  )
  update public.raffle_entries e set rank = ranked.rn
    from ranked where ranked.id = e.id;

  select count(*) into n from public.raffle_entries where raffle_id = p_raffle_id;
  update public.raffles set entries_total = n where id = p_raffle_id;
  return n;
end;
$$;

create or replace function public.close_raffle(p_raffle_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_winner uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
     and auth.uid() is not null then
    raise exception 'Solo un administrador puede cerrar un sorteo';
  end if;

  perform public.compute_raffle_entries(p_raffle_id);

  select profile_id into v_winner
    from public.raffle_entries where raffle_id = p_raffle_id and rank = 1;

  update public.raffles
     set status            = case when v_winner is null then 'anulado' else 'premiado' end,
         winner_profile_id = v_winner,
         closed_at         = now(),
         awarded_at        = case when v_winner is null then null else now() end
   where id = p_raffle_id;

  return v_winner;
end;
$$;

comment on table public.provider_monthly_stats is
  'Caché reconstruible con rebuild_month(). La verdad son jobs + ratings.';
