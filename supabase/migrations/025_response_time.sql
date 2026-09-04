-- ============================================================
-- APURAPE · 025 · Velocidad de respuesta (parte 1 del Índice)
-- ============================================================
-- Para medir cuánto tarda un Proveedor en responder hace falta saber, en
-- cada conversación, quién es el Proveedor. Hoy es imposible:
-- participant_1 y participant_2 son simétricos y, con el rol dual, ambos
-- pueden ser proveedor.
--
-- Por eso `provider_id`. Se llena al crear la conversación, donde sí se
-- sabe de quién es el servicio o la solicitud. Si queda NULL, la
-- conversación simplemente NO se mide, en vez de adivinar y ensuciar la
-- métrica con la que se reparten premios.
--
-- Los dos timestamps se llenan dentro de bump_conversation, que ya corría
-- en cada mensaje: un solo trigger y un solo UPDATE en vez de dos.
-- ============================================================

alter table public.conversations
  add column provider_id             uuid references public.profiles(id) on delete set null,
  add column first_client_message_at timestamptz,
  add column first_provider_reply_at timestamptz;

create index conversations_provider_idx on public.conversations (provider_id)
  where provider_id is not null;

-- Relleno de lo existente: solo cuando no hay ambigüedad, es decir cuando
-- exactamente uno de los dos participantes tiene rol proveedor.
update public.conversations c
   set provider_id = case
         when p1.role = 'proveedor' and p2.role is distinct from 'proveedor' then c.participant_1
         when p2.role = 'proveedor' and p1.role is distinct from 'proveedor' then c.participant_2
         else null
       end
  from public.profiles p1, public.profiles p2
 where p1.id = c.participant_1
   and p2.id = c.participant_2
   and c.provider_id is null;

-- ── bump_conversation, ahora también con los tiempos ─────────
-- SECURITY DEFINER a propósito. Antes funcionaba con permisos de
-- invocador porque quien manda el mensaje es participante y la política
-- de UPDATE se lo permite; pero un UPDATE bloqueado por RLS no lanza
-- error, solo no toca filas, y ya nos costó un contador silenciosamente
-- roto (ver 017). Aquí se cierra esa puerta de antemano.
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations c
     set last_message    = left(new.content, 140),
         last_message_at = new.created_at,
         unread_count_p1 = c.unread_count_p1 + case when new.sender_id = c.participant_1 then 0 else 1 end,
         unread_count_p2 = c.unread_count_p2 + case when new.sender_id = c.participant_2 then 0 else 1 end,

         -- Primer mensaje del Cliente. Los avisos automáticos ('system')
         -- no cuentan: no son alguien esperando respuesta.
         first_client_message_at = case
           when c.provider_id is not null
            and new.kind <> 'system'
            and new.sender_id <> c.provider_id
            and c.first_client_message_at is null
           then new.created_at
           else c.first_client_message_at
         end,

         -- Primera respuesta del Proveedor, solo si ya había algo que
         -- responder. Una cotización cuenta como respuesta.
         first_provider_reply_at = case
           when c.provider_id is not null
            and new.kind <> 'system'
            and new.sender_id = c.provider_id
            and c.first_client_message_at is not null
            and c.first_provider_reply_at is null
           then new.created_at
           else c.first_provider_reply_at
         end
   where c.id = new.conversation_id;

  return new;
end;
$$;

revoke execute on function public.bump_conversation() from public;

comment on column public.conversations.provider_id is
  'Quién debe responder en esta conversación. NULL = no se mide la velocidad de respuesta.';
comment on column public.conversations.first_provider_reply_at is
  'Primera respuesta del Proveedor al primer mensaje del Cliente. Base del componente de velocidad del Índice de Excelencia.';
