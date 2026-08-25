-- ============================================================
-- APURAPE · 013 · Row Level Security
-- ============================================================
-- Principio: lo público es el catálogo y la reputación; lo
-- privado es la conversación, el dinero y los datos de contacto.
-- ============================================================

-- SECURITY DEFINER para que la política de profiles no se
-- consulte a sí misma (recursión infinita).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.conversations c
     where c.id = p_conversation_id
       and auth.uid() in (c.participant_1, c.participant_2)
  );
$$;

-- ── Vistas: que respeten la RLS de las tablas base ───────────
alter view public.provider_quote_usage  set (security_invoker = on);
alter view public.suspicious_job_pairs  set (security_invoker = on);
revoke all on public.suspicious_job_pairs from anon, authenticated;

-- ============================================================
alter table public.profiles                enable row level security;
alter table public.profile_private         enable row level security;
alter table public.service_categories      enable row level security;
alter table public.service_subcategories   enable row level security;
alter table public.provider_services       enable row level security;
alter table public.service_requests        enable row level security;
alter table public.conversations           enable row level security;
alter table public.messages                enable row level security;
alter table public.quotes                  enable row level security;
alter table public.jobs                    enable row level security;
alter table public.ratings                 enable row level security;
alter table public.provider_monthly_stats  enable row level security;
alter table public.client_monthly_stats    enable row level security;
alter table public.point_events            enable row level security;
alter table public.raffles                 enable row level security;
alter table public.raffle_entries          enable row level security;
alter table public.payments                enable row level security;
alter table public.config                  enable row level security;
alter table public.banners                 enable row level security;
alter table public.blog_posts              enable row level security;
alter table public.newsletter_subscribers  enable row level security;
alter table public.reclamaciones           enable row level security;

-- ── profiles ─────────────────────────────────────────────────
create policy "Perfiles visibles para todos"
  on public.profiles for select using (true);

create policy "Cada quien crea su perfil"
  on public.profiles for insert with check (id = auth.uid());

create policy "Cada quien edita su perfil"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Admin edita cualquier perfil"
  on public.profiles for update using (public.is_admin());

-- La política de arriba deja al usuario editar SU fila, y eso
-- incluiría role='admin', plan='pro', verified=true o inflar sus
-- contadores del sorteo. RLS no distingue columnas, así que el
-- candado va en trigger: si el que edita es el propio dueño (y
-- no un admin), las columnas sensibles se revierten al valor
-- anterior en silencio. Solo cambian por funciones SECURITY
-- DEFINER (activate_pro_plan, become_provider, confirm_job…) o
-- por service_role, donde auth.uid() es null.
-- Deliberadamente NO es SECURITY DEFINER: necesita ver el rol de
-- conexión real. Una escritura directa desde el navegador llega
-- como 'authenticated'; una que viene de nuestras funciones
-- SECURITY DEFINER corre como el dueño de la función, y el
-- service_role como 'service_role'. Solo la primera se filtra.
-- (Si fuera DEFINER, refresh_client_level revertiría los puntos
--  del propio Cliente, porque auth.uid() ahí sigue siendo el suyo.)
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

  return new;
end;
$$;

create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ── profile_private (documento, teléfono, dirección) ─────────
create policy "Solo el dueño ve sus datos privados"
  on public.profile_private for select using (id = auth.uid() or public.is_admin());
create policy "Solo el dueño escribe sus datos privados"
  on public.profile_private for insert with check (id = auth.uid());
create policy "Solo el dueño actualiza sus datos privados"
  on public.profile_private for update using (id = auth.uid()) with check (id = auth.uid());

-- ── Taxonomía: lectura pública, escritura admin ──────────────
create policy "Categorías públicas"
  on public.service_categories for select using (true);
create policy "Admin gestiona categorías"
  on public.service_categories for all using (public.is_admin()) with check (public.is_admin());

create policy "Subcategorías públicas"
  on public.service_subcategories for select using (true);
create policy "Admin gestiona subcategorías"
  on public.service_subcategories for all using (public.is_admin()) with check (public.is_admin());

-- ── provider_services ────────────────────────────────────────
create policy "Servicios activos son públicos"
  on public.provider_services for select using (status = 'activo' or provider_id = auth.uid() or public.is_admin());
create policy "El proveedor publica sus servicios"
  on public.provider_services for insert with check (provider_id = auth.uid());
create policy "El proveedor edita sus servicios"
  on public.provider_services for update using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "El proveedor borra sus servicios"
  on public.provider_services for delete using (provider_id = auth.uid());
create policy "Admin gestiona servicios"
  on public.provider_services for all using (public.is_admin()) with check (public.is_admin());

-- ── service_requests ─────────────────────────────────────────
-- Abiertas visibles para usuarios autenticados (un proveedor
-- necesita verlas para cotizar); no para anónimos, para no
-- exponer necesidades y ubicaciones al scraping público.
create policy "Solicitudes abiertas visibles a usuarios"
  on public.service_requests for select
  to authenticated
  using (status in ('abierta','en_proceso') or client_id = auth.uid() or public.is_admin());

create policy "El cliente crea sus solicitudes"
  on public.service_requests for insert to authenticated with check (client_id = auth.uid());
create policy "El cliente edita sus solicitudes"
  on public.service_requests for update using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "El cliente borra sus solicitudes"
  on public.service_requests for delete using (client_id = auth.uid());
create policy "Admin gestiona solicitudes"
  on public.service_requests for all using (public.is_admin()) with check (public.is_admin());

-- ── Chat (portado de MARKARU) ────────────────────────────────
create policy "Participantes ven la conversación"
  on public.conversations for select using (auth.uid() in (participant_1, participant_2) or public.is_admin());
create policy "Usuarios crean conversaciones"
  on public.conversations for insert to authenticated
  with check (auth.uid() in (participant_1, participant_2));
create policy "Participantes actualizan la conversación"
  on public.conversations for update using (auth.uid() in (participant_1, participant_2))
  with check (auth.uid() in (participant_1, participant_2));

create policy "Participantes ven los mensajes"
  on public.messages for select using (public.is_conversation_member(conversation_id) or public.is_admin());
create policy "Participantes envían mensajes"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "El receptor marca leído"
  on public.messages for update using (public.is_conversation_member(conversation_id))
  with check (public.is_conversation_member(conversation_id));

-- ── quotes ───────────────────────────────────────────────────
create policy "Partes ven la cotización"
  on public.quotes for select using (auth.uid() in (provider_id, client_id) or public.is_admin());
create policy "El proveedor cotiza"
  on public.quotes for insert to authenticated with check (provider_id = auth.uid());
create policy "Partes actualizan la cotización"
  on public.quotes for update using (auth.uid() in (provider_id, client_id))
  with check (auth.uid() in (provider_id, client_id));

-- ── jobs ─────────────────────────────────────────────────────
-- Nadie inserta jobs a mano: se crean con accept_quote().
create policy "Partes ven el trabajo"
  on public.jobs for select using (auth.uid() in (provider_id, client_id) or public.is_admin());
create policy "Partes actualizan el trabajo"
  on public.jobs for update using (auth.uid() in (provider_id, client_id))
  with check (auth.uid() in (provider_id, client_id));
create policy "Admin gestiona trabajos"
  on public.jobs for all using (public.is_admin()) with check (public.is_admin());

-- ── ratings ──────────────────────────────────────────────────
-- Públicas (son la reputación). El INSERT directo se permite
-- solo al propio calificador; el trigger validate_rating()
-- verifica parte, sentido y momento.
create policy "Calificaciones públicas"
  on public.ratings for select using (true);
create policy "Cada quien califica por sí mismo"
  on public.ratings for insert to authenticated with check (rater_id = auth.uid());
create policy "Admin gestiona calificaciones"
  on public.ratings for all using (public.is_admin()) with check (public.is_admin());

-- ── Conteos y sorteo ─────────────────────────────────────────
-- El ranking del proveedor es público: es parte del incentivo.
create policy "Ranking de proveedores público"
  on public.provider_monthly_stats for select using (true);
create policy "Admin escribe stats de proveedor"
  on public.provider_monthly_stats for all using (public.is_admin()) with check (public.is_admin());

create policy "El cliente ve sus propios conteos"
  on public.client_monthly_stats for select using (profile_id = auth.uid() or public.is_admin());
create policy "Admin escribe stats de cliente"
  on public.client_monthly_stats for all using (public.is_admin()) with check (public.is_admin());

create policy "Cada quien ve sus puntos"
  on public.point_events for select using (profile_id = auth.uid() or public.is_admin());
create policy "Admin gestiona puntos"
  on public.point_events for all using (public.is_admin()) with check (public.is_admin());

create policy "Sorteos públicos"
  on public.raffles for select using (true);
create policy "Admin gestiona sorteos"
  on public.raffles for all using (public.is_admin()) with check (public.is_admin());

create policy "Entradas de sorteo públicas"
  on public.raffle_entries for select using (true);
create policy "Admin gestiona entradas"
  on public.raffle_entries for all using (public.is_admin()) with check (public.is_admin());

-- ── payments ─────────────────────────────────────────────────
-- Solo lectura para el dueño. La escritura la hace el endpoint
-- de Culqi con service_role (que ignora RLS).
create policy "Cada quien ve sus pagos"
  on public.payments for select using (profile_id = auth.uid() or public.is_admin());
create policy "Admin gestiona pagos"
  on public.payments for all using (public.is_admin()) with check (public.is_admin());

-- ── config ───────────────────────────────────────────────────
-- Lectura pública a propósito (precios y límites se muestran en
-- la web). NUNCA guardar llaves ni secretos aquí.
create policy "Configuración legible"
  on public.config for select using (true);
create policy "Admin escribe configuración"
  on public.config for all using (public.is_admin()) with check (public.is_admin());

-- ── Contenido ────────────────────────────────────────────────
create policy "Banners activos públicos"
  on public.banners for select using (active or public.is_admin());
create policy "Admin gestiona banners"
  on public.banners for all using (public.is_admin()) with check (public.is_admin());

create policy "Posts publicados públicos"
  on public.blog_posts for select using (status = 'published' or public.is_admin());
create policy "Admin gestiona el blog"
  on public.blog_posts for all using (public.is_admin()) with check (public.is_admin());

create policy "Cualquiera se suscribe al newsletter"
  on public.newsletter_subscribers for insert with check (true);
create policy "Admin ve suscriptores"
  on public.newsletter_subscribers for select using (public.is_admin());

-- Libro de Reclamaciones: cualquiera presenta uno (incluso sin
-- cuenta, como exige la norma); solo el Admin los lee.
create policy "Cualquiera presenta un reclamo"
  on public.reclamaciones for insert with check (true);
create policy "Admin gestiona reclamos"
  on public.reclamaciones for all using (public.is_admin()) with check (public.is_admin());
