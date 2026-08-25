-- ============================================================
-- APURAPE · 005 · Solicitudes del Cliente
-- ============================================================
-- Reemplaza rfq_commercial + rfq_logistics de MARKARU.
--
-- SIN LÍMITE DE PLAN: el Cliente publica gratis e ilimitado.
-- El límite del plan Básico vive en las COTIZACIONES del
-- Proveedor (ver 007_quotes.sql). Modelo Thumbtack: paga quien
-- busca trabajo, no quien lo ofrece.
--
-- Cualquier perfil no-admin puede crear solicitudes, incluido un
-- proveedor (rol dual).
-- ============================================================

create table public.service_requests (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles(id) on delete cascade,
  category_id    uuid not null references public.service_categories(id),
  subcategory_id uuid references public.service_subcategories(id),

  title          text not null,
  description    text not null,
  photos         text[] not null default '{}',

  budget_min     numeric(10,2),
  budget_max     numeric(10,2),
  currency       text not null default 'PEN' check (currency in ('PEN','USD')),

  region         text,
  province       text,
  district       text,
  is_remote      boolean not null default false,

  needed_at      date,
  urgency        text not null default 'normal'
                   check (urgency in ('urgente','esta_semana','normal','flexible')),

  status         text not null default 'abierta'
                   check (status in ('abierta','en_proceso','cerrada','vencida','cancelada')),
  quotes_count   int not null default 0,
  views_count    int not null default 0,

  expires_at     timestamptz not null default now() + interval '30 days',
  closed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint service_requests_budget_order
    check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create index service_requests_client_idx on public.service_requests (client_id, created_at desc);
create index service_requests_open_idx   on public.service_requests (category_id, created_at desc)
  where status = 'abierta';
create index service_requests_zona_idx   on public.service_requests (region, district)
  where status = 'abierta';

create trigger service_requests_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

-- ── Vencimiento automático ───────────────────────────────────
-- Llamar desde el cron existente (src/app/api/cron/…), no hay
-- pg_cron habilitado en el proyecto.
create or replace function public.expire_service_requests()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n int;
begin
  update public.service_requests
     set status = 'vencida'
   where status = 'abierta' and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
