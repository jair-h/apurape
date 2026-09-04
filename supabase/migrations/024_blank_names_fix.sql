-- ============================================================
-- APURAPE · 024 · Nombres vacíos: '' pasa a NULL
-- ============================================================
-- Detectado probando los avisos: un aviso salía como " aceptó tu
-- cotización", sin nombre.
--
-- handle_new_user() guardaba cadena vacía cuando el metadata no traía
-- nombre o razón social:
--     coalesce(new.raw_user_meta_data->>'business_name', '')
--
-- En el frontend nunca se vio porque JavaScript trata '' como falsy y
-- `business_name || name || "Usuario"` cae al siguiente. En SQL no:
-- coalesce() solo salta NULL, así que coalesce(business_name, name, ...)
-- devolvía '' para todo perfil sin razón social. Cualquier consulta SQL
-- que arme un nombre tenía el mismo problema.
--
-- Se corrige en tres frentes: el origen, los datos ya escritos y las tres
-- funciones de aviso.
-- ============================================================

-- ── 1. El origen ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, role, name, business_name, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'cliente'),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'business_name', '')), ''),
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''), 'Perú')
  )
  on conflict (id) do nothing;

  insert into public.profile_private (id, phone)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

-- ── 2. Lo ya escrito ─────────────────────────────────────────
update public.profiles
   set name          = nullif(trim(name), ''),
       business_name = nullif(trim(business_name), '')
 where (name is not null and trim(name) = '')
    or (business_name is not null and trim(business_name) = '');

update public.profile_private
   set phone    = nullif(trim(phone), ''),
       whatsapp = nullif(trim(whatsapp), '')
 where (phone is not null and trim(phone) = '')
    or (whatsapp is not null and trim(whatsapp) = '');

-- ── 3. Los avisos ────────────────────────────────────────────
-- nullif() dentro del coalesce: sin esto el fallback nunca se alcanza.
create or replace function public.display_name(p_profile_id uuid, p_fallback text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
           nullif(trim(coalesce(business_name, '')), ''),
           nullif(trim(coalesce(name, '')), ''),
           p_fallback)
    from public.profiles where id = p_profile_id;
$$;

revoke execute on function public.display_name(uuid, text) from public;

create or replace function public.notify_quote_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify(
    new.client_id,
    'cotizacion_recibida',
    'Nueva cotización de ' || public.display_name(new.provider_id, 'un proveedor'),
    'S/ ' || to_char(new.amount, 'FM999999990.00') || ' — ' || left(new.scope, 90),
    '/dashboard/mensajes?conv=' || new.conversation_id
  );
  return new;
end;
$$;

revoke execute on function public.notify_quote_created() from public;

-- accept_quote y mark_job_completed: solo cambia el armado del nombre.
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
  if not found then raise exception 'Cotización no encontrada'; end if;
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

  if q.request_id is not null then
    update public.quotes
       set status = 'rechazada', responded_at = now()
     where request_id = q.request_id and id <> q.id and status = 'pendiente';
    update public.service_requests set status = 'en_proceso' where id = q.request_id;
  end if;

  insert into public.messages (conversation_id, sender_id, content, kind, ref_id)
  values (q.conversation_id, q.client_id, 'Cotización aceptada. Servicio agendado.', 'system', v_job_id);

  perform public.notify(
    q.provider_id,
    'cotizacion_aceptada',
    public.display_name(q.client_id, 'Un cliente') || ' aceptó tu cotización',
    'S/ ' || to_char(q.amount, 'FM999999990.00') || '. El servicio quedó agendado.',
    '/dashboard/proveedor/trabajos'
  );

  return v_job_id;
end;
$$;

revoke execute on function public.accept_quote(uuid) from public;
grant  execute on function public.accept_quote(uuid) to authenticated;

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
  if not found then raise exception 'Trabajo no encontrado'; end if;
  if auth.uid() is not null and auth.uid() <> j.provider_id then
    raise exception 'Solo el Proveedor puede marcar el servicio como completado';
  end if;
  if j.status <> 'agendado' then
    raise exception 'El trabajo no está agendado (estado: %)', j.status;
  end if;

  update public.jobs
     set status = 'pendiente_confirmar', completed_at = now(), completed_by = j.provider_id
   where id = j.id;

  if j.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, content, kind, ref_id)
    values (j.conversation_id, j.provider_id,
            'El proveedor marcó el servicio como completado. Confirma y califica para cerrarlo.',
            'system', j.id);
  end if;

  perform public.notify(
    j.client_id,
    'trabajo_por_confirmar',
    public.display_name(j.provider_id, 'El proveedor') || ' terminó el servicio',
    'Confirma y califica «' || j.title || '» para cerrarlo. Ganas puntos por hacerlo.',
    '/dashboard/cliente/trabajos'
  );
end;
$$;

revoke execute on function public.mark_job_completed(uuid) from public;
grant  execute on function public.mark_job_completed(uuid) to authenticated;
