-- ============================================================
-- APURAPE · 023 · Engancha los avisos a los eventos que ya existen
-- ============================================================
-- cotizacion_recibida  → al Cliente, cuando el Proveedor cotiza
-- cotizacion_aceptada  → al Proveedor, cuando el Cliente acepta
-- trabajo_por_confirmar→ al Cliente, cuando el Proveedor marca completado
--
-- Detalle importante: notify() está revocada para 'authenticated', así que
-- un trigger con permisos de invocador no podría llamarla — la inserción
-- de la cotización la hace el navegador. Por eso el trigger de quotes es
-- SECURITY DEFINER. accept_quote() y mark_job_completed() ya lo son.
-- ============================================================

-- ── Cotización recibida ──────────────────────────────────────
create or replace function public.notify_quote_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  select coalesce(business_name, name, 'Un proveedor') into v_nombre
    from public.profiles where id = new.provider_id;

  perform public.notify(
    new.client_id,
    'cotizacion_recibida',
    'Nueva cotización de ' || v_nombre,
    'S/ ' || to_char(new.amount, 'FM999999990.00') || ' — ' || left(new.scope, 90),
    '/dashboard/mensajes?conv=' || new.conversation_id
  );
  return new;
end;
$$;

revoke execute on function public.notify_quote_created() from public;

create trigger quotes_notify_client
  after insert on public.quotes
  for each row execute function public.notify_quote_created();

-- ── Cotización aceptada ──────────────────────────────────────
create or replace function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  q public.quotes%rowtype;
  v_job_id uuid;
  v_cliente text;
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

  select coalesce(business_name, name, 'Un cliente') into v_cliente
    from public.profiles where id = q.client_id;

  perform public.notify(
    q.provider_id,
    'cotizacion_aceptada',
    v_cliente || ' aceptó tu cotización',
    'S/ ' || to_char(q.amount, 'FM999999990.00') || '. El servicio quedó agendado.',
    '/dashboard/proveedor/trabajos'
  );

  return v_job_id;
end;
$$;

revoke execute on function public.accept_quote(uuid) from public;
grant  execute on function public.accept_quote(uuid) to authenticated;

-- ── Servicio por confirmar ───────────────────────────────────
create or replace function public.mark_job_completed(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  j public.jobs%rowtype;
  v_proveedor text;
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

  select coalesce(business_name, name, 'El proveedor') into v_proveedor
    from public.profiles where id = j.provider_id;

  perform public.notify(
    j.client_id,
    'trabajo_por_confirmar',
    v_proveedor || ' terminó el servicio',
    'Confirma y califica «' || j.title || '» para cerrarlo. Ganas puntos por hacerlo.',
    '/dashboard/cliente/trabajos'
  );
end;
$$;

revoke execute on function public.mark_job_completed(uuid) from public;
grant  execute on function public.mark_job_completed(uuid) to authenticated;
