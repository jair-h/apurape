-- ============================================================
-- APURAPE · 029 · El mes de prueba es Pro de verdad
-- ============================================================
-- Antes el trial dejaba plan='basico' y solo movía plan_status, así que
-- todo lo que pregunta `plan = 'pro'` —encabezado, beneficios, insignia,
-- concurso— le mostraba Básico. Ahora el trial nace con plan='pro' y
-- plan_status='trial': el trial ES Pro, y no hay que ir corrigiendo cada
-- comparación una por una (basta olvidar una para que deje de ser completo).
--
-- Al vencer sin pagar cae a Básico gratis PERMANENTE, con plan_status
-- 'active', no 'expired': gratis para siempre es un estado válido, no una
-- avería. 'expired' se reserva para quien pagó y dejó de pagar.
--
-- POR QUÉ LA MARCA VA EN EL TRABAJO
-- El concurso pasa a ser solo para Pro. Pero no se puede filtrar por el
-- plan al momento de cerrar: el cierre corre el día 3, y el trial que
-- venció el 25 del mes anterior ya es Básico para entonces, aunque haya
-- trabajado todo el mes siendo Pro. Y no sirve guardar la marca en las
-- estadísticas, porque rebuild_month las borra y las recalcula desde cero
-- en cada cierre. Va entonces en jobs, que es el dato inmutable: la
-- pregunta correcta es "¿era Pro cuando hizo el trabajo?", no "¿es Pro hoy?".
-- ============================================================

-- ── 1 · ¿Es Pro ahora? ───────────────────────────────────────
create or replace function public.is_pro(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select plan = 'pro' and plan_status in ('active','trial')
       from public.profiles where id = p_profile_id),
    false);
$$;

revoke execute on function public.is_pro(uuid) from public;
grant  execute on function public.is_pro(uuid) to authenticated;

-- ── 2 · El trial nace Pro ────────────────────────────────────
create or replace function public.handle_new_profile_plan()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' then
    new.plan                := 'pro';
    new.plan_status         := 'active';
    new.trial_ends_at       := null;

  elsif new.role = 'proveedor' then
    new.plan                := 'pro';          -- Pro completo, gratis
    new.plan_status         := 'trial';
    new.trial_ends_at       := now() + (public.config_int('trial_days', 30) || ' days')::interval;
    new.free_months_granted := 1;
    new.became_provider_at  := coalesce(new.became_provider_at, now());

  else -- cliente: nunca paga
    new.plan                := 'basico';
    new.plan_status         := 'active';
    new.trial_ends_at       := null;
  end if;

  return new;
end;
$$;

-- El Cliente que se vuelve Proveedor recibe el mismo mes completo.
create or replace function public.become_provider()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.profiles
     set role               = 'proveedor',
         became_provider_at = coalesce(became_provider_at, now()),
         plan               = case when plan_status = 'active' and plan = 'basico'
                                   then 'pro' else plan end,
         plan_status        = case when plan_status = 'active' and plan = 'basico'
                                   then 'trial' else plan_status end,
         trial_ends_at      = case when trial_ends_at is null
                                   then now() + (public.config_int('trial_days', 30) || ' days')::interval
                                   else trial_ends_at end,
         free_months_granted= greatest(free_months_granted, 1)
   where id = auth.uid()
     and role = 'cliente';
end;
$$;

-- Los trials que ya existían también reciben lo prometido.
update public.profiles
   set plan = 'pro'
 where role = 'proveedor' and plan_status = 'trial' and plan = 'basico';

-- ── 3 · Los vencimientos, que hasta hoy nadie ejecutaba ──────
create or replace function public.expire_plans()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  n int := 0;
begin
  -- Trial vencido → Básico gratis permanente. El perfil NO se oculta.
  for r in
    with vencidos as (
      update public.profiles
         set plan = 'basico', plan_status = 'active'
       where plan_status = 'trial'
         and trial_ends_at is not null
         and trial_ends_at < now()
      returning id
    ) select id from vencidos
  loop
    perform public.notify(r.id, 'plan',
      'Terminó tu mes de prueba Pro',
      'Sigues en Apurape gratis para siempre, con '
        || public.config_int('conversations_free_per_month', 3)
        || ' conversaciones nuevas al mes. Tu perfil y tus servicios siguen publicados.',
      '/dashboard/plan');
    n := n + 1;
  end loop;

  -- Pro pagado que venció → Básico, con 'expired' porque sí perdió algo.
  for r in
    with vencidos as (
      update public.profiles
         set plan = 'basico', plan_status = 'expired'
       where plan_status = 'active' and plan = 'pro'
         and plan_expires_at is not null
         and plan_expires_at < now()
      returning id
    ) select id from vencidos
  loop
    perform public.notify(r.id, 'plan',
      'Tu plan Pro venció',
      'Puedes renovarlo cuando quieras. Mientras tanto sigues en Básico y tu perfil sigue publicado.',
      '/dashboard/plan');
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke execute on function public.expire_plans() from public;

-- Diario a las 05:10 UTC = 00:10 de Lima (Perú no tiene horario de verano).
select cron.schedule(
  'apurape-vencimientos',
  '10 5 * * *',
  $cron$ select public.expire_plans(); $cron$
);

-- ── 4 · La marca de "era Pro" vive en el trabajo ─────────────
alter table public.jobs
  add column provider_was_pro boolean not null default false;

comment on column public.jobs.provider_was_pro is
  'Si el proveedor era Pro cuando el trabajo se completó. Se sella una vez y nunca baja a false: es lo que permite que un mes de prueba que ya venció siga compitiendo en el concurso del mes que sí trabajó como Pro.';

create or replace function public.guard_job_transition()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_actor uuid := auth.uid();
begin
  if old.status is distinct from new.status then
    if not (
         (old.status = 'agendado'            and new.status in ('pendiente_confirmar','cancelado','disputa'))
      or (old.status = 'pendiente_confirmar' and new.status in ('confirmado','disputa','cancelado'))
      or (old.status = 'disputa'             and new.status in ('confirmado','cancelado'))
    ) then
      raise exception 'Transición de estado inválida: % → %', old.status, new.status;
    end if;
  end if;

  if new.completed_at is distinct from old.completed_at and new.completed_at is not null then
    if v_actor is not null and v_actor <> new.provider_id then
      raise exception 'Solo el Proveedor puede marcar el servicio como completado';
    end if;
    new.completed_by     := coalesce(new.completed_by, new.provider_id);
    -- El momento en que terminó el trabajo es el que define si era Pro.
    new.provider_was_pro := new.provider_was_pro or public.is_pro(new.provider_id);
  end if;

  if new.confirmed_at is distinct from old.confirmed_at and new.confirmed_at is not null then
    if v_actor is not null and v_actor <> new.client_id then
      raise exception 'Solo el Cliente puede confirmar el servicio';
    end if;
    new.confirmed_by     := new.client_id;
    new.period           := public.period_of(coalesce(new.completed_at, new.confirmed_at));
    -- Red de seguridad si el trabajo llegó a confirmado sin pasar por
    -- completed_at: la marca no se queda en false por un hueco del flujo.
    new.provider_was_pro := new.provider_was_pro or public.is_pro(new.provider_id);
  end if;

  if old.status = 'confirmado' then
    if new.amount      is distinct from old.amount
    or new.provider_id is distinct from old.provider_id
    or new.client_id   is distinct from old.client_id then
      raise exception 'Un trabajo confirmado no puede modificar monto ni partes';
    end if;
  end if;

  return new;
end;
$$;

-- ── 5 · La marca sube a las estadísticas, derivada ───────────
alter table public.provider_monthly_stats
  add column was_pro boolean not null default false;

comment on column public.provider_monthly_stats.was_pro is
  'Derivada de jobs.provider_was_pro. Sobrevive a rebuild_month porque se recalcula desde los trabajos, no se guarda a mano.';

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
        was_pro              = excluded.was_pro,
        updated_at           = now();

  perform public.recalc_category_index(p_period, p_category_id);
end;
$$;

-- ── 6 · El concurso queda para Pro ───────────────────────────
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
           round(s.excellence_index * 100, 2)
      from public.provider_monthly_stats s
      join public.profiles p on p.id = s.profile_id
     where s.period       = rf.period
       and s.category_id  = rf.category_id
       and s.qualifies    = true
       and s.was_pro      = true          -- el concurso es beneficio Pro
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
grant  execute on function public.compute_raffle_entries(uuid) to authenticated;
