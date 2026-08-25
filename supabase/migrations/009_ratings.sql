-- ============================================================
-- APURAPE · 009 · Calificaciones (bidireccionales)
-- ============================================================
-- Adapta ratings de MARKARU (operation_id → job_id) y agrega
-- dirección + orden obligatorio:
--
--   Cliente → Proveedor : al confirmar, en UN SOLO PASO
--                         (confirm_job hace ambas cosas en una
--                          transacción: si falla la calificación,
--                          el trabajo NO queda confirmado).
--                         → cuenta para el ranking del sorteo.
--
--   Proveedor → Cliente : SOLO después de que el Cliente confirmó.
--                         → alimenta puntos y nivel del Cliente.
--
-- El orden importa: si el Proveedor pudiera calificar antes,
-- tendrías calificaciones de represalia y presión sobre el
-- Cliente justo en el momento en que debe confirmar.
-- ============================================================

create table public.ratings (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs(id) on delete cascade,
  rater_id   uuid not null references public.profiles(id) on delete cascade,
  rated_id   uuid not null references public.profiles(id) on delete cascade,
  direction  text not null check (direction in ('cliente_a_proveedor','proveedor_a_cliente')),
  stars      int  not null check (stars between 1 and 5),
  comment    text,
  -- Periodo de imputación al sorteo (fijado por trigger).
  period     date not null,
  created_at timestamptz not null default now(),

  constraint ratings_distinct check (rater_id <> rated_id),
  -- Una sola calificación por persona por trabajo.
  unique (job_id, rater_id)
);

create index ratings_rated_idx  on public.ratings (rated_id, created_at desc);
create index ratings_period_idx on public.ratings (period, rated_id, stars);

-- ── Validación: quién puede calificar, cuándo y en qué sentido ─
create or replace function public.validate_rating()
returns trigger
language plpgsql
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = new.job_id;
  if not found then
    raise exception 'Trabajo no encontrado';
  end if;

  if new.direction = 'cliente_a_proveedor' then
    if new.rater_id <> j.client_id or new.rated_id <> j.provider_id then
      raise exception 'La calificación cliente→proveedor no corresponde a las partes del trabajo';
    end if;
    -- Se inserta dentro de confirm_job, en la misma transacción
    -- en que el trabajo pasa a 'confirmado'.
    if j.status not in ('pendiente_confirmar','confirmado') then
      raise exception 'El servicio aún no fue marcado como completado';
    end if;

  else -- proveedor_a_cliente
    if new.rater_id <> j.provider_id or new.rated_id <> j.client_id then
      raise exception 'La calificación proveedor→cliente no corresponde a las partes del trabajo';
    end if;
    if j.status <> 'confirmado' then
      raise exception 'El Proveedor solo puede calificar después de que el Cliente confirmó';
    end if;
  end if;

  if auth.uid() is not null and auth.uid() <> new.rater_id then
    raise exception 'No puedes calificar en nombre de otro usuario';
  end if;

  new.period := public.period_of(coalesce(new.created_at, now()));
  return new;
end;
$$;

create trigger ratings_validate
  before insert on public.ratings
  for each row execute function public.validate_rating();

-- ── Agregados en el perfil calificado ────────────────────────
create or replace function public.bump_profile_rating()
returns trigger
language plpgsql
as $$
begin
  update public.profiles p
     set ratings_count   = p.ratings_count + 1,
         five_star_count = p.five_star_count + case when new.stars = 5 then 1 else 0 end,
         rating = round(
           ((p.rating * p.ratings_count) + new.stars)::numeric / (p.ratings_count + 1), 2)
   where p.id = new.rated_id;
  return new;
end;
$$;

create trigger ratings_bump_profile
  after insert on public.ratings
  for each row execute function public.bump_profile_rating();

-- ============================================================
-- confirm_job: confirmación + calificación en UN SOLO PASO
-- ============================================================
-- Es la única vía por la que un trabajo llega a 'confirmado'
-- desde la app. Ambas escrituras van en la misma transacción.
create or replace function public.confirm_job(
  p_job_id  uuid,
  p_stars   int,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  j public.jobs%rowtype;
begin
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'La calificación debe ser de 1 a 5 estrellas';
  end if;

  select * into j from public.jobs where id = p_job_id for update;
  if not found then
    raise exception 'Trabajo no encontrado';
  end if;
  if auth.uid() is not null and auth.uid() <> j.client_id then
    raise exception 'Solo el Cliente puede confirmar este servicio';
  end if;
  if j.status <> 'pendiente_confirmar' then
    raise exception 'El servicio no está pendiente de confirmación (estado: %)', j.status;
  end if;

  update public.jobs
     set status       = 'confirmado',
         confirmed_at = now(),
         confirmed_by = j.client_id
   where id = j.id;

  insert into public.ratings (job_id, rater_id, rated_id, direction, stars, comment)
  values (j.id, j.client_id, j.provider_id, 'cliente_a_proveedor', p_stars, p_comment);

  update public.profiles
     set confirmed_jobs_count = confirmed_jobs_count + 1
   where id = j.provider_id;

  if j.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, content, kind, ref_id)
    values (j.conversation_id, j.client_id,
            'El cliente confirmó el servicio y dejó ' || p_stars || ' estrellas.',
            'system', j.id);
  end if;
end;
$$;

-- ── El Proveedor califica al Cliente (después de confirmar) ──
create or replace function public.rate_client(
  p_job_id  uuid,
  p_stars   int,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = p_job_id;
  if not found then
    raise exception 'Trabajo no encontrado';
  end if;
  if auth.uid() is not null and auth.uid() <> j.provider_id then
    raise exception 'Solo el Proveedor puede calificar al Cliente';
  end if;

  insert into public.ratings (job_id, rater_id, rated_id, direction, stars, comment)
  values (j.id, j.provider_id, j.client_id, 'proveedor_a_cliente', p_stars, p_comment);
end;
$$;

comment on table public.ratings is
  'Solo direction=cliente_a_proveedor sobre jobs confirmados y no flagged alimenta el ranking del sorteo.';
