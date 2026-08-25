-- ============================================================
-- APURAPE · 006 · Chat (heredado de MARKARU)
-- ============================================================
-- Portado con la MISMA forma que en MARKARU para que
-- src/lib/conversations.ts y la pantalla de mensajes sigan
-- funcionando: participant_1 / participant_2 / unread_count_p1 /
-- unread_count_p2 / last_message / last_message_at.
--
-- Único cambio: product_id / product_type (que apuntaban a
-- productos agro) pasan a subject_id / subject_type, porque una
-- conversación ahora nace de un servicio publicado o de una
-- solicitud del cliente.
--
-- Los participantes se guardan como auth.users.id, igual que
-- antes — y ahora eso coincide con profiles.id.
-- ============================================================

create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  participant_1    uuid not null references public.profiles(id) on delete cascade,
  participant_2    uuid not null references public.profiles(id) on delete cascade,

  subject_id       uuid,
  subject_type     text check (subject_type in ('service','request')),

  last_message     text,
  last_message_at  timestamptz,
  unread_count_p1  int not null default 0,
  unread_count_p2  int not null default 0,

  archived_by_p1   boolean not null default false,
  archived_by_p2   boolean not null default false,

  created_at       timestamptz not null default now(),

  constraint conversations_distinct_participants
    check (participant_1 <> participant_2)
);

create index conversations_p1_idx on public.conversations (participant_1, last_message_at desc);
create index conversations_p2_idx on public.conversations (participant_2, last_message_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text not null,
  attachments     text[] not null default '{}',
  -- 'quote' y 'system' permiten renderizar la cotización y los
  -- avisos de "servicio completado" dentro del hilo.
  kind            text not null default 'text'
                    check (kind in ('text','quote','system')),
  ref_id          uuid,          -- quote_id o job_id según kind
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index messages_conv_idx on public.messages (conversation_id, created_at desc);

-- ── Actualiza el resumen de la conversación al enviar mensaje ─
-- En MARKARU esto se hacía desde el cliente con dos escrituras;
-- aquí es un trigger, así el contador de no leídos no se
-- desincroniza si el navegador se cierra a medio camino.
create or replace function public.bump_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.conversations c
     set last_message    = left(new.content, 140),
         last_message_at = new.created_at,
         unread_count_p1 = c.unread_count_p1 + case when new.sender_id = c.participant_1 then 0 else 1 end,
         unread_count_p2 = c.unread_count_p2 + case when new.sender_id = c.participant_2 then 0 else 1 end
   where c.id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- ── Marcar como leído ────────────────────────────────────────
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.conversations
     set unread_count_p1 = case when participant_1 = auth.uid() then 0 else unread_count_p1 end,
         unread_count_p2 = case when participant_2 = auth.uid() then 0 else unread_count_p2 end
   where id = p_conversation_id
     and auth.uid() in (participant_1, participant_2);

  update public.messages
     set read = true
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and read = false;
end;
$$;
