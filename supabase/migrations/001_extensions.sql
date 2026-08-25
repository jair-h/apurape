-- ============================================================
-- APURAPE · 001 · Extensiones y utilidades base
-- ============================================================
-- Marketplace de servicios (Perú). Proveedor / Cliente / Admin.
-- Todas las fechas de negocio se calculan en hora de Lima porque
-- el sorteo es mensual y un servicio confirmado el 31 a las 20:00
-- de Lima es 1ro del mes siguiente en UTC.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ── Periodo mensual (primer día del mes, hora Lima) ──────────
-- STABLE, no IMMUTABLE: 'at time zone' depende de la tzdata, así
-- que estas funciones NO pueden usarse en columnas generadas.
-- El periodo se calcula siempre en triggers, nunca en generated.
create or replace function public.current_period()
returns date
language sql
stable
as $$
  select date_trunc('month', (now() at time zone 'America/Lima'))::date;
$$;

create or replace function public.period_of(ts timestamptz)
returns date
language sql
stable
as $$
  select date_trunc('month', (ts at time zone 'America/Lima'))::date;
$$;

-- ── updated_at automático ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Configuración editable en caliente ───────────────────────
-- Vive aquí y no en 011_billing porque los límites de plan se
-- consultan desde 007_quotes. NUNCA guardar secretos: es de
-- lectura pública (ver 013_rls.sql).
create table public.config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger config_updated_at
  before update on public.config
  for each row execute function public.set_updated_at();

create or replace function public.config_int(p_key text, p_default int)
returns int
language sql
stable
as $$
  select coalesce((select (value #>> '{}')::int from public.config where key = p_key), p_default);
$$;

comment on function public.current_period() is
  'Primer día del mes actual en hora de Lima. Base de todos los conteos del sorteo.';
