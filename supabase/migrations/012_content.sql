-- ============================================================
-- APURAPE · 012 · Contenido y páginas públicas
-- ============================================================
-- Portadas de MARKARU con los mismos nombres de columna para no
-- romper src/lib/blog.ts ni el panel Admin.
--
-- reclamaciones se conserva tal cual: el Libro de Reclamaciones
-- es obligatorio por ley en Perú (D.S. 011-2011-PCM) para todo
-- proveedor que ofrezca productos o servicios al consumidor.
-- ============================================================

create table public.banners (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  subtitle   text,
  image_url  text,
  link_url   text,
  button_text text,
  active     boolean not null default true,
  order_num  int not null default 0,
  created_at timestamptz not null default now()
);

create table public.blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  slug                text not null unique,
  summary             text,
  content             text,
  image_url           text,
  category            text,
  tags                text[] not null default '{}',
  status              text not null default 'draft' check (status in ('draft','published','archived')),
  published_at        timestamptz,
  author              text,
  meta_title          text,
  meta_description    text,
  focus_keyword       text,
  secondary_keywords  text[] not null default '{}',
  faqs                jsonb,
  cta_type            text,
  cta_link            text,
  related_ids         uuid[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index blog_posts_published_idx on public.blog_posts (published_at desc) where status = 'published';

create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  source     text,
  created_at timestamptz not null default now()
);

-- Libro de Reclamaciones (obligatorio en Perú)
create table public.reclamaciones (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique,                    -- correlativo visible al usuario
  nombre         text not null,
  documento      text,
  email          text not null,
  telefono       text,
  direccion      text,
  tipo           text not null check (tipo in ('queja','reclamo')),
  bien_servicio  text check (bien_servicio in ('producto','servicio')),
  monto          numeric(10,2),
  descripcion    text not null,
  pedido         text,
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente','en_proceso','resuelto','cerrado')),
  respuesta      text,
  notas_internas text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger reclamaciones_updated_at
  before update on public.reclamaciones
  for each row execute function public.set_updated_at();

-- Correlativo tipo APU-000001 exigido por la norma.
create sequence if not exists public.reclamaciones_seq;

create or replace function public.set_reclamacion_codigo()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null then
    new.codigo := 'APU-' || lpad(nextval('public.reclamaciones_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger reclamaciones_codigo
  before insert on public.reclamaciones
  for each row execute function public.set_reclamacion_codigo();
