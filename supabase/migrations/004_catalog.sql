-- ============================================================
-- APURAPE · 004 · Catálogo del Proveedor
-- ============================================================
-- Reemplaza products / exporter_products de MARKARU.
-- Fuera: hs_code, scientific_name, variety, available_months,
--        certifications, preferred_port, monthly_volume_tm, FOB.
-- Dentro: precio en soles, unidad de cobro y zona de cobertura.
-- ============================================================

create table public.provider_services (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references public.profiles(id) on delete cascade,
  category_id      uuid not null references public.service_categories(id),
  subcategory_id   uuid references public.service_subcategories(id),

  title            text not null,
  description      text,

  price_from       numeric(10,2),
  currency         text not null default 'PEN' check (currency in ('PEN','USD')),
  price_unit       text check (price_unit in ('hora','servicio','dia','m2','punto','mes')),
  price_note       text,                       -- "desde", "según evaluación", etc.

  -- Cobertura: arrays por ahora. Si LATAM crece, pasar a tabla
  -- service_coverage(service_id, region, district) e indexar.
  coverage_regions   text[] not null default '{}',
  coverage_districts text[] not null default '{}',
  works_remote       boolean not null default false,

  photos           text[] not null default '{}',
  years_experience int,

  status           text not null default 'activo'
                     check (status in ('activo','pausado','oculto')),
  featured_until   timestamptz,                -- premio "destacado" del sorteo

  views_count      int not null default 0,
  quotes_count     int not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index provider_services_provider_idx on public.provider_services (provider_id);
create index provider_services_cat_idx      on public.provider_services (category_id) where status = 'activo';
create index provider_services_regions_idx  on public.provider_services using gin (coverage_regions);
create index provider_services_districts_idx on public.provider_services using gin (coverage_districts);
create index provider_services_featured_idx on public.provider_services (featured_until desc nulls last)
  where status = 'activo';

create trigger provider_services_updated_at
  before update on public.provider_services
  for each row execute function public.set_updated_at();

-- ── Solo un proveedor publica servicios ──────────────────────
-- No se puede expresar con FK ni con CHECK (requiere leer otra
-- tabla), así que va en trigger. La RLS también lo valida, pero
-- esto protege también a inserts con service_role.
create or replace function public.assert_is_provider()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.provider_id and role = 'proveedor' and suspended = false
  ) then
    raise exception 'Solo un perfil con rol proveedor activo puede publicar servicios';
  end if;
  return new;
end;
$$;

create trigger provider_services_role_check
  before insert or update of provider_id on public.provider_services
  for each row execute function public.assert_is_provider();
