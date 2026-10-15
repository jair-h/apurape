-- ============================================================
-- APURAPE · 037 · Antifraude Fase 2 (Opción A)
-- ============================================================
-- Endurece el Concurso SIN pedir todavía huella de dispositivo ni IP (eso
-- queda para cuando haya premios en efectivo y cientos de usuarios). Tres
-- piezas, todas apoyadas en datos que ya existen:
--
--   1. CORREO VERIFICADO, LEÍDO EN VIVO. El gate pregunta directamente a
--      auth.users.email_confirmed_at del Cliente. No se copia a una columna
--      ni se sincroniza con un trigger sobre auth.users: un DDL sobre esa
--      tabla toma lock exclusivo y se queda esperando detrás del servicio
--      de Auth. Las funciones del conteo ya son SECURITY DEFINER, así que
--      pueden leer auth.users sin exponerla a nadie. Es fiable: con
--      "Confirm email" activo, nadie confirma un trabajo sin haber
--      confirmado su correo, así que para un usuario real siempre es true.
--
--   2. VENTA DE GRADO VERIFICADO. El Concurso deja de contar cualquier
--      trabajo confirmado y pasa a contar solo los que parecen reales:
--      correo del Cliente confirmado + chat de dos partes (el Cliente
--      escribió y el Proveedor respondió) + no marcado. Un trabajo
--      confirmado entre dos cuentas que nunca se escribieron deja de sumar.
--      Todo detrás de config_bool('contest_verified_grade_only', true): si
--      alguna vez excluye de más, se apaga con una fila de config, sin
--      migrar. La regla del par recíproco (010) NO cambia: sigue siendo
--      exclusión dura.
--
--   3. REVISIÓN MANUAL DEL GANADOR. contest_winner_review() (solo admin)
--      resume, para cada concurso premiado, con cuántos clientes distintos
--      ganó, qué tan concentradas están sus ventas en un solo cliente, su
--      día más cargado y cuántos trabajos quedaron marcados. needs_review
--      enciende la bandera cuando conviene mirar antes de entregar un
--      premio. NO decide nada por sí sola: el ranking lo sigue decidiendo
--      el Índice de Excelencia; esto solo es una red para el ojo humano.
--
-- Nada de esto es azar ni cambia el carácter de concurso por mérito.
-- ============================================================

-- ── 1 · Parámetros (en config, afinables sin migrar) ─────────
insert into public.config (key, value) values
  ('contest_verified_grade_only', to_jsonb(true)),   -- gate de venta verificada
  ('review_min_distinct_clients', to_jsonb(2)),      -- ≤ esto → revisar
  ('review_max_client_share',     to_jsonb(0.6))     -- ≥ esto de un solo cliente → revisar
on conflict (key) do nothing;

-- ── 2 · La regla de "venta de grado verificado", en un solo sitio ─
-- Lee el correo del Cliente en vivo de auth.users y exige los dos tiempos
-- del chat. Con el gate apagado devuelve siempre true (comportamiento
-- anterior, exacto). NO se concede a authenticated: solo la llaman las
-- funciones de conteo, que corren como definidor (postgres) y sí pueden.
create or replace function public.job_verified_grade(
  p_client_id    uuid,
  p_first_client timestamptz,
  p_first_reply  timestamptz
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select not public.config_bool('contest_verified_grade_only', true)
      or (exists (select 1 from auth.users u
                   where u.id = p_client_id and u.email_confirmed_at is not null)
          and p_first_client is not null
          and p_first_reply  is not null);
$$;

revoke execute on function public.job_verified_grade(uuid, timestamptz, timestamptz) from public;

-- ── 3 · El conteo del Proveedor aplica el gate ───────────────
-- Igual que la versión de la 029 (velocidad + was_pro), sumando el join a
-- la conversación y la condición de grado verificado. Todas las métricas
-- del mes (calidad, volumen, etc.) pasan a reflejar solo las ventas que
-- cuentan.
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
     avg_response_minutes, quality_score, speed_score, was_pro, updated_at)
  select p_profile_id, p_period, p_category_id,
         count(distinct j.id),
         coalesce(sum(j.amount), 0),
         count(r.id),
         count(r.id) filter (where r.stars = 5),
         coalesce(round(avg(r.stars)::numeric, 2), 0),
         round(v_avg_resp, 2),
         coalesce(round(avg(r.stars)::numeric / 5, 4), 0),
         round(v_speed, 4),
         coalesce(bool_or(j.provider_was_pro), false),
         now()
    from public.jobs j
    left join public.conversations cv on cv.id = j.conversation_id
    left join public.ratings r
           on r.job_id = j.id and r.direction = 'cliente_a_proveedor'
   where j.provider_id = p_profile_id
     and j.period      = p_period
     and j.category_id = p_category_id
     and j.status      = 'confirmado'
     and j.flagged     = false
     and public.job_verified_grade(j.client_id,
           cv.first_client_message_at, cv.first_provider_reply_at)
  on conflict (profile_id, period, category_id) do update
    set confirmed_jobs       = excluded.confirmed_jobs,
        gross_amount         = excluded.gross_amount,
        ratings_count        = excluded.ratings_count,
        five_star_count      = excluded.five_star_count,
        avg_stars            = excluded.avg_stars,
        avg_response_minutes = excluded.avg_response_minutes,
        quality_score        = excluded.quality_score,
        speed_score          = excluded.speed_score,
        was_pro              = excluded.was_pro,
        updated_at           = now();

  perform public.recalc_category_index(p_period, p_category_id);
end;
$$;

revoke execute on function public.recalc_provider_month(uuid, date, uuid) from public;

-- ── 4 · El conteo del Cliente aplica el mismo gate ───────────
-- Mismo criterio para el concurso del Cliente: su confirmación solo cuenta
-- si él tiene correo confirmado y hubo chat de dos partes.
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
            left join public.conversations cv on cv.id = j.conversation_id
           where j.client_id = p_profile_id and j.period = p_period
             and j.status = 'confirmado' and j.flagged = false
             and public.job_verified_grade(j.client_id,
                   cv.first_client_message_at, cv.first_provider_reply_at)),
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

revoke execute on function public.recalc_client_month(uuid, date) from public;

-- ── 5 · Revisión manual del ganador (solo admin) ─────────────
-- Para cada concurso premiado, un resumen de señales sobre el ganador. No
-- excluye a nadie: es lo que un administrador mira antes de entregar.
create or replace function public.contest_winner_review()
returns table (
  raffle_id          uuid,
  period             date,
  category_id        uuid,
  participant_type   text,
  winner_profile_id  uuid,
  confirmed_jobs     bigint,
  distinct_clients   bigint,
  top_client_jobs    bigint,
  top_client_share   numeric,
  busiest_day_jobs   bigint,
  flagged_jobs       bigint,
  needs_review       boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with wj as (
    select rf.id as raffle_id, rf.period, rf.category_id, rf.participant_type,
           rf.winner_profile_id, j.id as job_id, j.client_id,
           date(coalesce(j.confirmed_at, j.completed_at, j.created_at)) as day
      from public.raffles rf
      join public.jobs j
        on j.provider_id = rf.winner_profile_id
       and j.period      = rf.period
       and j.category_id = rf.category_id
       and j.status      = 'confirmado'
       and j.flagged     = false
     where rf.audience = 'proveedor'
       and rf.status   = 'premiado'
       and rf.winner_profile_id is not null
       and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ),
  per_client as (
    select raffle_id, client_id, count(*) as c from wj group by raffle_id, client_id
  ),
  per_day as (
    select raffle_id, day, count(*) as c from wj group by raffle_id, day
  ),
  agg as (
    select raffle_id, count(*) as confirmed_jobs, count(distinct client_id) as distinct_clients
      from wj group by raffle_id
  ),
  top_c as (
    select distinct on (raffle_id) raffle_id, c as top_client_jobs
      from per_client order by raffle_id, c desc
  ),
  top_d as (
    select distinct on (raffle_id) raffle_id, c as busiest_day_jobs
      from per_day order by raffle_id, c desc
  )
  select rf.id, rf.period, rf.category_id, rf.participant_type, rf.winner_profile_id,
         coalesce(a.confirmed_jobs, 0),
         coalesce(a.distinct_clients, 0),
         coalesce(tc.top_client_jobs, 0),
         case when coalesce(a.confirmed_jobs, 0) = 0 then 0
              else round(coalesce(tc.top_client_jobs, 0)::numeric / a.confirmed_jobs, 2) end,
         coalesce(td.busiest_day_jobs, 0),
         (select count(*) from public.jobs jf
           where jf.provider_id = rf.winner_profile_id
             and jf.period = rf.period and jf.category_id = rf.category_id
             and jf.flagged = true),
         (coalesce(a.distinct_clients, 0) <= public.config_int('review_min_distinct_clients', 2)
          or (coalesce(a.confirmed_jobs, 0) > 0
              and coalesce(tc.top_client_jobs, 0)::numeric / a.confirmed_jobs
                  >= public.config_numeric('review_max_client_share', 0.6)))
    from public.raffles rf
    left join agg   a  on a.raffle_id  = rf.id
    left join top_c tc on tc.raffle_id = rf.id
    left join top_d td on td.raffle_id = rf.id
   where rf.audience = 'proveedor'
     and rf.status   = 'premiado'
     and rf.winner_profile_id is not null
     and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
   order by rf.period desc;
$$;

revoke execute on function public.contest_winner_review() from public;
grant  execute on function public.contest_winner_review() to authenticated;

comment on function public.contest_winner_review() is
  'Resumen de señales de fraude por concurso premiado, para revisión manual del admin antes de entregar un premio. No excluye a nadie ni afecta el ranking.';
