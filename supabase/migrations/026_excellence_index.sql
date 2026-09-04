-- ============================================================
-- APURAPE · 026 · Índice de Excelencia (parte 2)
-- ============================================================
--   calidad   50%  = promedio de estrellas del mes / 5
--   volumen   30%  = confirmados / máximo de SU categoría ese mes
--   velocidad 20%  = 1.0 si respondió en ≤15 min, 0 si tardó ≥24 h
--
-- speed_score admite NULL a propósito: es lo que separa "respondió
-- lentísimo" (0.0) de "no tuvo a quién responder" (NULL). En el segundo
-- caso el 20% se reparte entre calidad y volumen, que pasan a pesar
-- 62,5% y 37,5%.
--
-- El volumen es lo único que NO depende solo del proveedor: al normalizar
-- contra el máximo de la categoría, un trabajo nuevo de cualquiera cambia
-- el índice de todos sus competidores. Por eso hay dos funciones: una por
-- proveedor y otra que recalcula la categoría entera.
--
-- Los pesos y los umbrales viven en config para poder afinarlos sin
-- migrar, igual que el resto de parámetros del concurso.
-- ============================================================

alter table public.provider_monthly_stats
  add column avg_response_minutes numeric(10,2),
  add column quality_score        numeric(5,4) not null default 0,
  add column volume_score         numeric(5,4) not null default 0,
  add column speed_score          numeric(5,4),
  add column excellence_index     numeric(5,4) not null default 0;

create index provider_monthly_stats_index_idx
  on public.provider_monthly_stats (period, category_id, excellence_index desc);

insert into public.config (key, value) values
  ('index_weight_quality', '50'),
  ('index_weight_volume',  '30'),
  ('index_weight_speed',   '20'),
  ('speed_fast_minutes',   '15'),
  ('speed_slow_minutes',   '1440')
on conflict (key) do nothing;

-- ── Por proveedor: calidad y velocidad ───────────────────────
create or replace function public.recalc_provider_month(
  p_profile_id uuid, p_period date, p_category_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_avg_resp numeric;
  v_fast int := public.config_int('speed_fast_minutes', 15);
  v_slow int := public.config_int('speed_slow_minutes', 1440);
  v_speed numeric;
begin
  if p_category_id is null or p_period is null then return; end if;

  -- Velocidad: promedio de la primera respuesta en las conversaciones que
  -- ARRANCARON este mes. Se ancla al mensaje del cliente, no a la
  -- respuesta, para que responder tarde no mueva el dato a otro mes.
  select avg(extract(epoch from (first_provider_reply_at - first_client_message_at)) / 60)
    into v_avg_resp
    from public.conversations
   where provider_id = p_profile_id
     and first_client_message_at is not null
     and first_provider_reply_at is not null
     and public.period_of(first_client_message_at) = p_period;

  if    v_avg_resp is null   then v_speed := null;
  elsif v_avg_resp <= v_fast then v_speed := 1;
  elsif v_avg_resp >= v_slow then v_speed := 0;
  else  v_speed := (v_slow - v_avg_resp) / (v_slow - v_fast);
  end if;

  insert into public.provider_monthly_stats as s
    (profile_id, period, category_id, confirmed_jobs, gross_amount,
     ratings_count, five_star_count, avg_stars,
     avg_response_minutes, quality_score, speed_score, updated_at)
  select p_profile_id, p_period, p_category_id,
         count(distinct j.id),
         coalesce(sum(j.amount), 0),
         count(r.id),
         count(r.id) filter (where r.stars = 5),
         coalesce(round(avg(r.stars)::numeric, 2), 0),
         round(v_avg_resp, 2),
         coalesce(round(avg(r.stars)::numeric / 5, 4), 0),
         round(v_speed, 4),
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
    set confirmed_jobs       = excluded.confirmed_jobs,
        gross_amount         = excluded.gross_amount,
        ratings_count        = excluded.ratings_count,
        five_star_count      = excluded.five_star_count,
        avg_stars            = excluded.avg_stars,
        avg_response_minutes = excluded.avg_response_minutes,
        quality_score        = excluded.quality_score,
        speed_score          = excluded.speed_score,
        updated_at           = now();

  -- El volumen y el índice dependen de toda la categoría.
  perform public.recalc_category_index(p_period, p_category_id);
end;
$$;

revoke execute on function public.recalc_provider_month(uuid, date, uuid) from public;

-- ── Por categoría: volumen normalizado e índice final ────────
create or replace function public.recalc_category_index(p_period date, p_category_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_max int;
  wq numeric := public.config_int('index_weight_quality', 50) / 100.0;
  wv numeric := public.config_int('index_weight_volume',  30) / 100.0;
  ws numeric := public.config_int('index_weight_speed',   20) / 100.0;
begin
  if p_period is null or p_category_id is null then return; end if;

  select max(confirmed_jobs) into v_max
    from public.provider_monthly_stats
   where period = p_period and category_id = p_category_id;

  update public.provider_monthly_stats s
     set volume_score = case when coalesce(v_max, 0) = 0 then 0
                             else round(s.confirmed_jobs::numeric / v_max, 4) end,
         excellence_index = round(
           case
             -- Sin conversaciones medibles: el 20% de velocidad se reparte
             -- entre los otros dos, que pasan a 62,5% y 37,5%.
             when s.speed_score is null then
               (wq * s.quality_score
              + wv * (case when coalesce(v_max,0) = 0 then 0
                           else s.confirmed_jobs::numeric / v_max end)
               ) / (wq + wv)
             else
               wq * s.quality_score
             + wv * (case when coalesce(v_max,0) = 0 then 0
                          else s.confirmed_jobs::numeric / v_max end)
             + ws * s.speed_score
           end, 4),
         updated_at = now()
   where s.period = p_period and s.category_id = p_category_id;
end;
$$;

revoke execute on function public.recalc_category_index(date, uuid) from public;

-- ── rebuild_month: recalcula también los índices ─────────────
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

  -- Segunda pasada: al terminar de insertar todas las filas, el máximo de
  -- cada categoría ya es el definitivo. Sin esto, los proveedores
  -- procesados primero se quedarían con un volumen normalizado contra un
  -- máximo parcial.
  for r in
    select distinct category_id from public.provider_monthly_stats
     where period = p_period
  loop
    perform public.recalc_category_index(p_period, r.category_id);
  end loop;

  for r in
    select distinct client_id from public.jobs where period = p_period
  loop
    perform public.recalc_client_month(r.client_id, p_period);
  end loop;
end;
$$;

revoke execute on function public.rebuild_month(date) from public;

-- ── El ranking pasa a ordenarse por el índice ────────────────
create or replace function public.compute_raffle_entries(p_raffle_id uuid)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rf public.raffles%rowtype;
  n int;
begin
  select * into rf from public.raffles where id = p_raffle_id;
  if not found then raise exception 'Concurso no encontrado'; end if;

  perform public.flag_reciprocal_jobs(rf.period);
  perform public.rebuild_month(rf.period);

  delete from public.raffle_entries where raffle_id = p_raffle_id;

  if rf.audience = 'proveedor' then
    insert into public.raffle_entries
      (raffle_id, profile_id, entries, confirmed_jobs, five_star_count, score)
    select p_raffle_id, s.profile_id, s.confirmed_jobs, s.confirmed_jobs,
           s.five_star_count,
           -- score se guarda de 0 a 100 para que se lea como puntaje.
           round(s.excellence_index * 100, 2)
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

  -- Desempate: más calificaciones de 5★, luego más ventas, luego quien
  -- llegó primero.
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

revoke execute on function public.compute_raffle_entries(uuid) from public;

comment on column public.provider_monthly_stats.speed_score is
  'NULL = no hubo conversaciones medibles ese mes. Distinto de 0, que sí significa respuesta lenta.';
comment on column public.provider_monthly_stats.excellence_index is
  'Índice compuesto 0-1. 50% calidad, 30% volumen normalizado por categoría, 20% velocidad. Sin velocidad medible se reparte a 62,5/37,5.';
