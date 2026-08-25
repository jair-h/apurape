-- ============================================================
-- APURAPE · 008 · Trabajos y confirmación de venta
-- ============================================================
-- Reemplaza operations (32 columnas de comercio exterior).
--
-- LA REGLA DEL NEGOCIO, EN LA BASE:
--   El Proveedor marca "servicio completado"  → pendiente_confirmar
--   El Cliente confirma y califica            → confirmado
--   Solo 'confirmado' cuenta para el sorteo.
-- Que el proveedor marque completado NO suma nada, nunca.
-- Esto no se deja al frontend: el trigger de abajo rechaza
-- cualquier intento de escribir confirmed_at si quien lo hace no
-- es el client_id del trabajo.
-- ============================================================

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),

  provider_id     uuid not null references public.profiles(id) on delete restrict,
  client_id       uuid not null references public.profiles(id) on delete restrict,

  category_id     uuid references public.service_categories(id),
  quote_id        uuid references public.quotes(id) on delete set null,
  service_id      uuid references public.provider_services(id) on delete set null,
  request_id      uuid references public.service_requests(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,

  title           text not null,
  amount          numeric(10,2) not null default 0 check (amount >= 0),
  currency        text not null default 'PEN' check (currency in ('PEN','USD')),

  status          text not null default 'agendado' check (status in (
                    'agendado',             -- cotización aceptada
                    'pendiente_confirmar',  -- el Proveedor marcó completado
                    'confirmado',           -- el Cliente confirmó → cuenta
                    'cancelado',
                    'disputa'
                  )),

  scheduled_for   timestamptz,
  completed_at    timestamptz,     -- lo escribe el Proveedor
  completed_by    uuid references public.profiles(id),
  confirmed_at    timestamptz,     -- lo escribe el Cliente (única vía que suma)
  confirmed_by    uuid references public.profiles(id),
  cancelled_at    timestamptz,
  cancel_reason   text,

  -- Periodo de imputación al sorteo: se fija al confirmar.
  period          date,

  -- Antifraude: se marca para revisión y se excluye del conteo.
  flagged         boolean not null default false,
  flag_reason     text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint jobs_distinct_parties check (provider_id <> client_id),
  constraint jobs_confirmed_needs_stamp
    check (status <> 'confirmado' or (confirmed_at is not null and confirmed_by is not null))
);

create index jobs_provider_idx  on public.jobs (provider_id, created_at desc);
create index jobs_client_idx    on public.jobs (client_id, created_at desc);
create index jobs_status_idx    on public.jobs (status);
create index jobs_period_idx    on public.jobs (period, provider_id) where status = 'confirmado' and not flagged;
create unique index jobs_quote_uniq on public.jobs (quote_id) where quote_id is not null;

alter table public.quotes
  add constraint quotes_job_fk foreign key (job_id)
  references public.jobs(id) on delete set null;

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ── Guardia de transiciones y de autoría ─────────────────────
create or replace function public.guard_job_transition()
returns trigger
language plpgsql
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- Sin sesión (service_role / cron) no se aplican los controles
  -- de autoría, pero sí los de transición.
  if old.status is distinct from new.status then
    if not (
         (old.status = 'agendado'            and new.status in ('pendiente_confirmar','cancelado','disputa'))
      or (old.status = 'pendiente_confirmar' and new.status in ('confirmado','disputa','cancelado'))
      or (old.status = 'disputa'             and new.status in ('confirmado','cancelado'))
    ) then
      raise exception 'Transición de estado inválida: % → %', old.status, new.status;
    end if;
  end if;

  -- Marcar completado: solo el Proveedor.
  if new.completed_at is distinct from old.completed_at and new.completed_at is not null then
    if v_actor is not null and v_actor <> new.provider_id then
      raise exception 'Solo el Proveedor puede marcar el servicio como completado';
    end if;
    new.completed_by := coalesce(new.completed_by, new.provider_id);
  end if;

  -- Confirmar: SOLO el Cliente. Esta es la regla que sostiene
  -- todo el ranking del sorteo.
  if new.confirmed_at is distinct from old.confirmed_at and new.confirmed_at is not null then
    if v_actor is not null and v_actor <> new.client_id then
      raise exception 'Solo el Cliente puede confirmar el servicio';
    end if;
    new.confirmed_by := new.client_id;
    new.period       := public.period_of(new.confirmed_at);
  end if;

  -- Una vez confirmado, el monto y las partes quedan congelados.
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

create trigger jobs_guard_transition
  before update on public.jobs
  for each row execute function public.guard_job_transition();

-- ── Aceptar cotización → crea el trabajo ─────────────────────
-- Solo el Cliente de la cotización puede aceptarla.
create or replace function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  q public.quotes%rowtype;
  v_job_id uuid;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Cotización no encontrada';
  end if;
  if auth.uid() is not null and auth.uid() <> q.client_id then
    raise exception 'Solo el Cliente puede aceptar la cotización';
  end if;
  if q.status <> 'pendiente' then
    raise exception 'La cotización ya no está pendiente (estado: %)', q.status;
  end if;

  insert into public.jobs (
    provider_id, client_id, category_id, quote_id, service_id,
    request_id, conversation_id, title, amount, currency, status
  )
  select q.provider_id, q.client_id,
         coalesce(s.category_id, r.category_id),
         q.id, q.service_id, q.request_id, q.conversation_id,
         coalesce(s.title, r.title, 'Servicio'),
         q.amount, q.currency, 'agendado'
    from (select 1) x
    left join public.provider_services s on s.id = q.service_id
    left join public.service_requests  r on r.id = q.request_id
  returning id into v_job_id;

  update public.quotes
     set status = 'aceptada', job_id = v_job_id, responded_at = now()
   where id = q.id;

  -- El resto de cotizaciones de esa solicitud quedan cerradas.
  if q.request_id is not null then
    update public.quotes
       set status = 'rechazada', responded_at = now()
     where request_id = q.request_id and id <> q.id and status = 'pendiente';
    update public.service_requests
       set status = 'en_proceso'
     where id = q.request_id;
  end if;

  insert into public.messages (conversation_id, sender_id, content, kind, ref_id)
  values (q.conversation_id, q.client_id, 'Cotización aceptada. Servicio agendado.', 'system', v_job_id);

  return v_job_id;
end;
$$;

-- ── El Proveedor marca "servicio completado" ─────────────────
-- Notifica al Cliente por el chat. NO suma nada al sorteo.
create or replace function public.mark_job_completed(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  j public.jobs%rowtype;
begin
  select * into j from public.jobs where id = p_job_id for update;
  if not found then
    raise exception 'Trabajo no encontrado';
  end if;
  if auth.uid() is not null and auth.uid() <> j.provider_id then
    raise exception 'Solo el Proveedor puede marcar el servicio como completado';
  end if;
  if j.status <> 'agendado' then
    raise exception 'El trabajo no está agendado (estado: %)', j.status;
  end if;

  update public.jobs
     set status       = 'pendiente_confirmar',
         completed_at = now(),
         completed_by = j.provider_id
   where id = j.id;

  if j.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, content, kind, ref_id)
    values (j.conversation_id, j.provider_id,
            'El proveedor marcó el servicio como completado. Confirma y califica para cerrarlo.',
            'system', j.id);
  end if;
end;
$$;

comment on column public.jobs.confirmed_at is
  'Solo lo escribe el Cliente. Único evento que alimenta el ranking del sorteo.';
