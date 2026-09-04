-- ============================================================
-- APURAPE · 019 · Favoritos del Cliente
-- ============================================================
-- El Cliente guarda proveedores para volver a encontrarlos.
--
-- Solo INSERT, SELECT y DELETE: un favorito no se "edita", se pone o se
-- quita. No hay política de lectura para el proveedor a propósito: nadie
-- puede ver quién lo guardó, tampoco él. Si más adelante se quiere mostrar
-- "12 clientes te guardaron", eso sale de un contador agregado, no de dar
-- acceso a las filas.
-- ============================================================

create table public.favorites (
  client_id   uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (client_id, provider_id),
  constraint favorites_distinct check (client_id <> provider_id)
);

create index favorites_client_idx   on public.favorites (client_id, created_at desc);
create index favorites_provider_idx on public.favorites (provider_id);

alter table public.favorites enable row level security;

create policy "Cada quien ve sus favoritos"
  on public.favorites for select using (client_id = auth.uid());

create policy "Cada quien guarda sus favoritos"
  on public.favorites for insert to authenticated with check (client_id = auth.uid());

create policy "Cada quien quita sus favoritos"
  on public.favorites for delete using (client_id = auth.uid());

comment on table public.favorites is
  'Proveedores guardados por un Cliente. Privado: solo su dueño los ve.';
