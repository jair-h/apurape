-- ============================================================
-- APURAPE · 028 · El límite del Básico pasa a conversaciones
-- ============================================================
-- Antes el plan Básico se medía en cotizaciones enviadas. Ahora se mide en
-- CONVERSACIONES NUEVAS respondidas por mes calendario (hora Lima). Las ya
-- abiertas siguen normales, con cotizaciones ilimitadas dentro.
--
-- POR QUÉ NO ALCANZA first_provider_reply_at
-- Esa columna (025) solo se llena si el cliente escribió primero, porque
-- mide velocidad de respuesta y no se puede responder a nada. Como medidor
-- de cupo dejaría pasar el flujo entero de solicitudes publicadas, donde el
-- proveedor escribe primero: abriría conversaciones sin límite. Va entonces
-- una columna aparte, provider_first_message_at, que marca el primer
-- mensaje del proveedor sin importar quién empezó. Dos medidores con dos
-- significados distintos, cada uno con su nombre.
-- ============================================================

-- ── 1 · El medidor del cupo ──────────────────────────────────
alter table public.conversations
  add column provider_first_message_at timestamptz;

comment on column public.conversations.provider_first_message_at is
  'Primer mensaje del proveedor, sin importar quién escribió primero. Mide el cupo del plan Básico. Para la velocidad de respuesta, ver first_provider_reply_at.';

create index conversations_provider_period_idx
  on public.conversations (provider_id, provider_first_message_at)
  where provider_first_message_at is not null;

update public.conversations c
   set provider_first_message_at = (
         select min(m.created_at) from public.messages m
          where m.conversation_id = c.id
            and m.sender_id = c.provider_id
            and m.kind <> 'system')
 where c.provider_id is not null;

-- ── 2 · El número, en config ─────────────────────────────────
insert into public.config (key, value) values ('conversations_free_per_month', to_jsonb(3))
  on conflict (key) do update set value = excluded.value;

-- Se va el medidor viejo: dos fuentes de verdad es como se cuelan las
-- contradicciones.
delete from public.config where key = 'quotes_free_per_month';

comment on column public.profiles.quote_credits is
  'Conversaciones nuevas EXTRA (promos y premios), además del cupo mensual. Conserva el nombre por compatibilidad: desde la 028 el cupo se mide en conversaciones, no en cotizaciones.';

-- ── 3 · ¿Cuántas conversaciones nuevas le quedan? ────────────
-- NULL = ilimitadas (Pro, mes de prueba, admin).
create or replace function public.provider_conversations_left(p_provider_id uuid)
returns int
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_role    text;
  v_plan    text;
  v_status  text;
  v_credits int;
  v_limit   int;
  v_used    int;
begin
  select role, plan, plan_status, quote_credits
    into v_role, v_plan, v_status, v_credits
    from public.profiles where id = p_provider_id;

  if v_role is null then return 0; end if;
  if v_role = 'admin' then return null; end if;
  if v_plan = 'pro' and v_status in ('active','trial') then return null; end if;
  if v_status = 'trial' then return null; end if;   -- el mes de prueba

  v_limit := public.config_int('conversations_free_per_month', 3) + coalesce(v_credits, 0);

  select count(*) into v_used
    from public.conversations
   where provider_id = p_provider_id
     and provider_first_message_at is not null
     and public.period_of(provider_first_message_at) = public.current_period();

  return greatest(v_limit - coalesce(v_used, 0), 0);
end;
$$;

revoke execute on function public.provider_conversations_left(uuid) from public;
grant  execute on function public.provider_conversations_left(uuid) to authenticated;

-- ── 4 · El candado ───────────────────────────────────────────
-- BEFORE INSERT, así que lee provider_first_message_at todavía en nulo y
-- decide; el AFTER la sella. Sin carrera y sin columna auxiliar.
create or replace function public.guard_conversation_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_provider uuid;
  v_abierta  timestamptz;
  v_left     int;
begin
  if new.kind = 'system' then return new; end if;

  select provider_id, provider_first_message_at
    into v_provider, v_abierta
    from public.conversations where id = new.conversation_id;

  -- provider_id nulo = no se sabe quién es el proveedor (dos perfiles con
  -- rol dual). Ante la duda no se bloquea: cobrar cupo a quien no
  -- corresponde es peor que regalar uno.
  if v_provider is null or new.sender_id <> v_provider then
    return new;
  end if;

  -- Conversación ya abierta: sigue normal para siempre.
  if v_abierta is not null then return new; end if;

  v_left := public.provider_conversations_left(v_provider);
  if v_left is not null and v_left <= 0 then
    raise exception 'Alcanzaste las % conversaciones nuevas de tu plan Básico este mes',
                    public.config_int('conversations_free_per_month', 3)
      using errcode = 'check_violation',
            hint    = 'Actualiza a Pro para responder';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_guard_conversation_limit on public.messages;
create trigger messages_guard_conversation_limit
  before insert on public.messages
  for each row execute function public.guard_conversation_limit();

-- ── 5 · bump_conversation sella el medidor y avisa ───────────
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c                public.conversations%rowtype;
  v_del_proveedor  boolean;
  v_primer_cliente boolean;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then return new; end if;

  v_del_proveedor  := c.provider_id is not null
                      and new.kind <> 'system'
                      and new.sender_id = c.provider_id;
  v_primer_cliente := c.provider_id is not null
                      and new.kind <> 'system'
                      and new.sender_id <> c.provider_id
                      and c.first_client_message_at is null;

  update public.conversations
     set last_message    = left(new.content, 140),
         last_message_at = new.created_at,
         unread_count_p1 = unread_count_p1 + case when new.sender_id = participant_1 then 0 else 1 end,
         unread_count_p2 = unread_count_p2 + case when new.sender_id = participant_2 then 0 else 1 end,

         first_client_message_at = case
           when v_primer_cliente then new.created_at
           else first_client_message_at end,

         -- La velocidad solo se mide si hubo a quién responder.
         first_provider_reply_at = case
           when v_del_proveedor
            and first_client_message_at is not null
            and first_provider_reply_at is null
           then new.created_at
           else first_provider_reply_at end,

         -- El cupo se cobra igual, escriba quien escriba primero.
         provider_first_message_at = case
           when v_del_proveedor and provider_first_message_at is null
           then new.created_at
           else provider_first_message_at end

   where id = new.conversation_id;

  -- Un aviso por conversación, la primera vez que el cliente escribe. Si
  -- avisáramos de cada mensaje sería ruido y dejarían de mirarlos.
  if v_primer_cliente then
    perform public.notify(
      c.provider_id,
      'mensaje_nuevo',
      public.display_name(new.sender_id, 'Un cliente') || ' te escribió',
      'Tienes un mensaje nuevo esperando respuesta.',
      '/dashboard/mensajes?conv=' || new.conversation_id::text);
  end if;

  return new;
end;
$$;

-- ── 6 · El tipo de aviso nuevo ───────────────────────────────
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('concurso_ganado','trabajo_por_confirmar','cotizacion_recibida',
                  'cotizacion_aceptada','servicio_confirmado','mensaje_nuevo',
                  'plan','sistema'));

-- ── 7 · Las cotizaciones dejan de tener cupo ─────────────────
-- Conserva el sello del período y la validación de proveedor activo; el
-- cupo ahora se cobra al abrir la conversación, antes de poder cotizar.
create or replace function public.enforce_quote_limit()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.period := public.period_of(coalesce(new.created_at, now()));

  if not exists (
    select 1 from public.profiles
    where id = new.provider_id and role = 'proveedor' and suspended = false
  ) then
    raise exception 'Solo un proveedor activo puede enviar cotizaciones';
  end if;

  return new;
end;
$$;

drop function if exists public.provider_quotes_left(uuid);
