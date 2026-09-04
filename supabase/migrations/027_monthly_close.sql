-- ============================================================
-- APURAPE · 027 · Cierre automático del día 3
-- ============================================================
-- El día 3 de cada mes, a las 00:00 de Lima, se cierran los concursos del
-- mes anterior. Los 3 días de margen dejan entrar las confirmaciones
-- tardías: un trabajo hecho el 30 y confirmado el 2 cuenta para el mes en
-- que se hizo (ver 022).
--
-- El correo NO se manda desde aquí. pg_net está disponible, pero enviarlo
-- desde la base obligaría a guardar la API key de Brevo dentro de
-- Postgres. En su lugar la base marca el ganador y crea el aviso interno;
-- un cron de Vercel recoge después los que tienen winner_email_sent_at
-- nulo y manda el correo con la key que ya vive en las variables de
-- entorno. Si el correo falla, el concurso queda cerrado igual.
-- ============================================================

create extension if not exists pg_cron;

-- ── Rastro del cierre ────────────────────────────────────────
alter table public.raffles
  add column winner_notified_at   timestamptz,
  add column winner_email_sent_at timestamptz;

-- Denormalizado en el perfil para pintar la insignia en resultados de
-- búsqueda sin una consulta extra por proveedor.
alter table public.profiles
  add column last_award_period      date,
  add column last_award_category_id uuid references public.service_categories(id);

create index profiles_award_idx on public.profiles (last_award_period desc)
  where last_award_period is not null;

-- ── El candado de perfil tiene que cubrir la insignia ────────
-- Sin esto, cualquiera podría escribir last_award_period en su propia
-- fila y aparecer como ganador del mes en su perfil y en las búsquedas.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if auth.uid() is null or auth.uid() <> new.id then
    return new;
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return new;
  end if;

  new.role                 := old.role;
  new.plan                 := old.plan;
  new.plan_status          := old.plan_status;
  new.plan_started_at      := old.plan_started_at;
  new.plan_expires_at      := old.plan_expires_at;
  new.trial_ends_at        := old.trial_ends_at;
  new.free_months_granted  := old.free_months_granted;
  new.culqi_subscription_id:= old.culqi_subscription_id;
  new.quote_credits        := old.quote_credits;
  new.verified             := old.verified;
  new.suspended            := old.suspended;
  new.flagged              := old.flagged;
  new.flag_reason          := old.flag_reason;
  new.rating               := old.rating;
  new.ratings_count        := old.ratings_count;
  new.five_star_count      := old.five_star_count;
  new.confirmed_jobs_count := old.confirmed_jobs_count;
  new.points               := old.points;
  new.level                := old.level;
  new.became_provider_at   := old.became_provider_at;
  new.last_award_period      := old.last_award_period;
  new.last_award_category_id := old.last_award_category_id;

  return new;
end;
$$;

-- ── Cerrar un concurso y avisar al ganador ───────────────────
create or replace function public.close_raffle(p_raffle_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rf       public.raffles%rowtype;
  v_winner uuid;
  v_cat    text;
  v_mes    text;
begin
  -- auth.uid() nulo = pg_cron o service_role. Con sesión, solo admin.
  if auth.uid() is not null
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Solo un administrador puede cerrar un concurso';
  end if;

  select * into rf from public.raffles where id = p_raffle_id for update;
  if not found then raise exception 'Concurso no encontrado'; end if;
  if rf.status <> 'abierto' then return rf.winner_profile_id; end if;

  perform public.compute_raffle_entries(p_raffle_id);

  select profile_id into v_winner
    from public.raffle_entries where raffle_id = p_raffle_id and rank = 1;

  update public.raffles
     set status            = case when v_winner is null then 'anulado' else 'premiado' end,
         winner_profile_id = v_winner,
         closed_at         = now(),
         awarded_at        = case when v_winner is null then null else now() end
   where id = p_raffle_id;

  if v_winner is null then return null; end if;

  select name into v_cat from public.service_categories where id = rf.category_id;
  v_mes := trim(to_char(rf.period, 'TMMonth'));

  -- La insignia del perfil y de los resultados de búsqueda.
  update public.profiles
     set last_award_period      = rf.period,
         last_award_category_id = rf.category_id
   where id = v_winner;

  perform public.notify(
    v_winner,
    'concurso_ganado',
    '¡Ganaste el concurso de ' || coalesce(v_cat, 'tu categoría') || '!',
    'Cerraste ' || v_mes || ' con el mejor Índice de Excelencia de tu categoría. '
      || coalesce(rf.prize_description, 'Te contactamos para coordinar el premio.'),
    '/dashboard/sorteo'
  );

  update public.raffles set winner_notified_at = now() where id = p_raffle_id;

  return v_winner;
end;
$$;

revoke execute on function public.close_raffle(uuid) from public;
grant  execute on function public.close_raffle(uuid) to authenticated;  -- valida admin por dentro

-- ── El cierre mensual ────────────────────────────────────────
-- Cierra TODO concurso abierto de un periodo anterior al actual, no solo
-- el del mes pasado: si un mes se saltó (base caída, job desactivado), la
-- siguiente corrida lo recoge en vez de dejarlo abierto para siempre.
create or replace function public.close_previous_month()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.raffles
     where status = 'abierto'
       and period < public.current_period()
     order by period, audience, participant_type
  loop
    perform public.close_raffle(r.id);
    n := n + 1;
  end loop;

  -- Y deja abiertos los del mes que corre.
  perform public.open_monthly_raffles(public.current_period());

  return n;
end;
$$;

revoke execute on function public.close_previous_month() from public;

-- ── El job ───────────────────────────────────────────────────
-- pg_cron trabaja en UTC. Lima es UTC-5 todo el año (no hay horario de
-- verano), así que el día 3 a las 00:00 de Lima son las 05:00 UTC.
select cron.schedule(
  'apurape-cierre-mensual',
  '0 5 3 * *',
  $cron$ select public.close_previous_month(); $cron$
);

comment on column public.raffles.winner_email_sent_at is
  'Lo marca el cron de Vercel tras enviar el correo. NULL con winner_notified_at puesto = pendiente de enviar.';
comment on column public.profiles.last_award_period is
  'Último mes en que este perfil ganó su concurso. Solo lo escribe close_raffle(); el usuario no puede tocarlo.';
