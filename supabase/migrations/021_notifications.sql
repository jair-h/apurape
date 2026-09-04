-- ============================================================
-- APURAPE · 021 · Avisos dentro de la app
-- ============================================================
-- NO hay política de INSERT para el usuario, a propósito. Si cualquiera
-- pudiera escribir en esta tabla podría fabricarse un aviso de "Ganaste el
-- concurso del mes" o insertárselo a otra persona. Los avisos solo nacen
-- de funciones SECURITY DEFINER de la propia base.
--
-- El UPDATE sí se permite al dueño, pero solo sirve para marcar como leído:
-- el trigger de abajo revierte cualquier intento de cambiar el contenido.
-- ============================================================

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in (
               'concurso_ganado','trabajo_por_confirmar','cotizacion_recibida',
               'cotizacion_aceptada','servicio_confirmado','plan','sistema')),
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index notifications_unread_idx  on public.notifications (profile_id) where read = false;

alter table public.notifications enable row level security;

create policy "Cada quien ve sus avisos"
  on public.notifications for select using (profile_id = auth.uid());

create policy "Cada quien marca sus avisos"
  on public.notifications for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Lo único que el dueño puede cambiar es `read`. Sin esto, la política de
-- UPDATE le dejaría reescribir el titulo y el enlace de su propio aviso.
create or replace function public.guard_notification_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  new.profile_id := old.profile_id;
  new.kind       := old.kind;
  new.title      := old.title;
  new.body       := old.body;
  new.link       := old.link;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger notifications_guard_columns
  before update on public.notifications
  for each row execute function public.guard_notification_columns();

-- ── Crear un aviso ───────────────────────────────────────────
create or replace function public.notify(
  p_profile_id uuid,
  p_kind       text,
  p_title      text,
  p_body       text default null,
  p_link       text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (profile_id, kind, title, body, link)
  values (p_profile_id, p_kind, p_title, p_body, p_link)
  returning id into v_id;
  return v_id;
end;
$$;

-- Solo la llaman otras funciones de la base y el service_role.
revoke execute on function public.notify(uuid, text, text, text, text) from public;

-- ── Marcar todos como leídos ─────────────────────────────────
create or replace function public.mark_notifications_read()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  if auth.uid() is null then return 0; end if;
  update public.notifications set read = true
   where profile_id = auth.uid() and read = false;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.mark_notifications_read() from public;
grant  execute on function public.mark_notifications_read() to authenticated;

comment on table public.notifications is
  'Avisos dentro de la app. Solo los crea la base vía notify(); el usuario únicamente puede marcarlos como leídos.';
