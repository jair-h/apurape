-- ============================================================
-- APURAPE · 003 · Taxonomía de servicios
-- ============================================================
-- Reemplaza products_category_check de MARKARU
--   ('fruta','verdura','grano','procesado','insumo','ganaderia','otro')
-- por tablas. Razón: con CHECK, agregar una categoría exige
-- migración; con tabla lo hace el Admin, y al expandir a LATAM
-- se agregan subcategorías por país sin tocar el schema.
-- ============================================================

create table public.service_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,                    -- nombre de icono lucide
  color       text,                    -- acento en UI
  order_num   int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.service_subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  slug        text not null,
  name        text not null,
  order_num   int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (category_id, slug)
);

create index service_subcategories_cat_idx on public.service_subcategories (category_id) where active;

create trigger service_categories_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

-- ── Las 8 categorías de lanzamiento ──────────────────────────
insert into public.service_categories (slug, name, description, icon, order_num) values
  ('hogar',        'Hogar',                 'Limpieza, mudanzas, jardinería, pintura, carpintería',        'house',        1),
  ('eventos',      'Eventos',               'Catering, fotografía, música, decoración, animación',         'party-popper', 2),
  ('tecnologia',   'Tecnología',            'Soporte técnico, desarrollo web, redes, diseño',              'laptop',       3),
  ('belleza',      'Belleza',               'Peluquería, maquillaje, uñas, barbería, masajes',             'sparkles',     4),
  ('reparaciones', 'Reparaciones',          'Gasfitería, electricidad, electrodomésticos, cerrajería',     'wrench',       5),
  ('educacion',    'Educación y Capacitación','Clases particulares, idiomas, cursos, asesorías',           'graduation-cap',6),
  ('comida',       'Comida',                'Chefs a domicilio, repostería, buffet, delivery propio',      'chef-hat',     7),
  ('otros',        'Otros',                 'Servicios que no encajan en las categorías anteriores',       'ellipsis',     8);

-- Subcategorías iniciales (ampliables desde el panel Admin).
insert into public.service_subcategories (category_id, slug, name, order_num)
select c.id, s.slug, s.name, s.ord
from public.service_categories c
join (values
  ('hogar','limpieza','Limpieza',1),
  ('hogar','mudanza','Mudanza y transporte',2),
  ('hogar','jardineria','Jardinería',3),
  ('hogar','pintura','Pintura',4),
  ('hogar','carpinteria','Carpintería',5),
  ('eventos','catering','Catering',1),
  ('eventos','fotografia','Fotografía y video',2),
  ('eventos','musica','Música y DJ',3),
  ('eventos','decoracion','Decoración',4),
  ('tecnologia','soporte','Soporte técnico',1),
  ('tecnologia','desarrollo','Desarrollo web y apps',2),
  ('tecnologia','redes','Redes e internet',3),
  ('tecnologia','diseno','Diseño gráfico',4),
  ('belleza','peluqueria','Peluquería',1),
  ('belleza','maquillaje','Maquillaje',2),
  ('belleza','unas','Uñas',3),
  ('belleza','masajes','Masajes',4),
  ('reparaciones','gasfiteria','Gasfitería',1),
  ('reparaciones','electricidad','Electricidad',2),
  ('reparaciones','electrodomesticos','Electrodomésticos',3),
  ('reparaciones','cerrajeria','Cerrajería',4),
  ('educacion','clases','Clases particulares',1),
  ('educacion','idiomas','Idiomas',2),
  ('educacion','asesorias','Asesorías profesionales',3),
  ('comida','chef','Chef a domicilio',1),
  ('comida','reposteria','Repostería',2),
  ('comida','buffet','Buffet y bocaditos',3)
) as s(cat, slug, name, ord) on s.cat = c.slug;
