-- ============================================================
-- APURAPE · 031 · Diferencias Persona / Negocio
-- ============================================================
-- Dos cosas, más una tercera que se hace a mano:
--
--   1. El grupo de categoría, que es lo que hace medible "catálogo por
--      grupo": productos y servicios tienen límites distintos.
--
--   2. Lo que distingue a un Negocio: logo, equipo y banner.
--
--   3. El almacenamiento, que NO EXISTÍA: storage.buckets estaba vacío y
--      ImageUpload apuntaba a 'operation-docs', un nombre heredado de
--      MARKARU, así que toda subida de imagen de la app fallaba, incluidas
--      las del blog y los banners del admin. El bucket se crea desde el
--      panel; aquí solo queda documentado qué debe existir.
--
-- El banner de promoción se muestra SOLO en el perfil público, nunca en los
-- resultados de búsqueda: pagar no debe dar ventaja visual dentro del
-- buscador.
--
-- Sin sucursales: requisito explícito de no construirlas.
-- ============================================================

-- ── 1 · El bucket: SE CREA A MANO EN EL PANEL ────────────────
-- Esta migración NO toca el esquema storage. El bucket y sus políticas se
-- crean desde el panel de Supabase; se documentan aquí para que el repo
-- recuerde qué tiene que existir.
--
--   Bucket:  apurape
--   Público: sí (las fotos se ven en perfiles y búsquedas abiertas)
--   Tamaño:  5 MB por archivo
--   Tipos:   image/jpeg, image/png, image/webp, image/avif
--
--   Políticas sobre storage.objects, las cuatro con bucket_id = 'apurape':
--     SELECT  → sin más condición (lectura pública)
--     INSERT  → (storage.foldername(name))[1] = auth.uid()::text
--     UPDATE  → la misma condición, en USING y en WITH CHECK
--     DELETE  → la misma condición
--
-- La condición de carpeta es lo que impide que alguien con sesión
-- sobrescriba el logo de otro negocio: cada uno solo escribe bajo su
-- propio id. El convenio de rutas es <auth.uid()>/<carpeta>/<archivo>.

-- ── 2 · Grupo de categoría ───────────────────────────────────
alter table public.service_categories
  add column group_key text not null default 'servicios'
    check (group_key in ('productos','servicios'));

comment on column public.service_categories.group_key is
  'Decide qué límite de catálogo aplica. Hogar y Otros van a servicios: Hogar es limpieza y gasfitería, y un catálogo sin clasificar (Otros) recibe el límite más estrecho, no la cuota generosa de productos.';

update public.service_categories set group_key = 'productos'
 where slug in ('comida','belleza');

-- ── 3 · Los límites, en config ───────────────────────────────
insert into public.config (key, value) values
  ('catalog_max_productos_persona', to_jsonb(15)),
  ('catalog_max_productos_negocio', to_jsonb(40)),
  ('catalog_max_servicios_persona', to_jsonb(5)),
  ('catalog_max_servicios_negocio', to_jsonb(20)),
  ('photos_max_persona',            to_jsonb(3)),
  ('photos_max_negocio',            to_jsonb(8)),
  ('team_max',                      to_jsonb(12))
on conflict (key) do update set value = excluded.value;

-- ── 4 · Lo que distingue a un Negocio ────────────────────────
alter table public.profiles
  add column logo_url         text,
  add column promo_banner_url text,
  add column promo_text       text;

comment on column public.profiles.promo_banner_url is
  'Banner de promoción del Negocio. Se muestra SOLO en su perfil público, nunca en resultados de búsqueda: pagar no da ventaja visual dentro del buscador.';

-- Si deja de ser Negocio, estos campos se limpian solos. Con un CHECK en su
-- lugar, cambiar de Negocio a Persona fallaría con error en vez de
-- simplemente dejar de aplicar.
create or replace function public.clear_negocio_fields()
returns trigger
language plpgsql
as $$
begin
  if new.account_type <> 'negocio' then
    new.logo_url         := null;
    new.promo_banner_url := null;
    new.promo_text       := null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_clear_negocio_fields on public.profiles;
create trigger profiles_clear_negocio_fields
  before insert or update on public.profiles
  for each row execute function public.clear_negocio_fields();

-- ── 5 · El equipo ────────────────────────────────────────────
-- Tabla y no jsonb: es una lista de entidades con foto propia y orden, no
-- una configuración de forma fija como business_hours.
-- Sin cuentas separadas: son fotos y nombres, no usuarios.
create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),
  role        text check (role is null or length(trim(role)) <= 60),
  photo_url   text,
  order_num   int  not null default 0,
  created_at  timestamptz not null default now()
);

create index team_members_provider_idx
  on public.team_members (provider_id, order_num);

alter table public.team_members enable row level security;

create policy "El equipo es publico"
  on public.team_members for select using (true);

create policy "Solo el dueno gestiona su equipo"
  on public.team_members for all to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

create policy "Admin gestiona equipos"
  on public.team_members for all using (public.is_admin());

create or replace function public.guard_team_size()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_max int := public.config_int('team_max', 12);
  v_n   int;
begin
  select count(*) into v_n from public.team_members where provider_id = new.provider_id;
  if v_n >= v_max then
    raise exception 'Tu equipo ya tiene % integrantes, el máximo', v_max
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger team_members_guard_size
  before insert on public.team_members
  for each row execute function public.guard_team_size();

-- ── 6 · Los límites del catálogo ─────────────────────────────
-- Cuenta solo los servicios ACTIVOS. Un servicio en pausa no lo ve ningún
-- cliente, así que no ocupa sitio en el marketplace y no debería gastar
-- cuota. La consecuencia es que se pueden guardar más de los permitidos en
-- pausa e irlos rotando; es deliberado.
--
-- Por eso el límite no se comprueba solo al crear: también al REACTIVAR un
-- servicio pausado, que es el otro momento en que el catálogo visible crece.
create or replace function public.catalog_max(p_account_type text, p_group text)
returns int
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.config_int(
    'catalog_max_' || coalesce(nullif(p_group,''), 'servicios')
                   || '_' || case when p_account_type = 'negocio' then 'negocio' else 'persona' end,
    case
      when p_group = 'productos' and p_account_type = 'negocio' then 40
      when p_group = 'productos'                                then 15
      when p_account_type = 'negocio'                           then 20
      else 5
    end);
$$;

grant execute on function public.catalog_max(text, text) to authenticated;

create or replace function public.guard_catalog_limits()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_type    text;
  v_group   text;
  v_max     int;
  v_n       int;
  v_fotos   int;
  v_fotomax int;
begin
  select account_type into v_type from public.profiles where id = new.provider_id;
  v_type := coalesce(v_type, 'persona');

  -- Fotos por ítem
  v_fotomax := public.config_int(
    case when v_type = 'negocio' then 'photos_max_negocio' else 'photos_max_persona' end,
    case when v_type = 'negocio' then 8 else 3 end);

  v_fotos := coalesce(cardinality(new.photos), 0);
  if v_fotos > v_fotomax then
    raise exception 'Tu plan permite % fotos por servicio y enviaste %', v_fotomax, v_fotos
      using errcode = 'check_violation',
            hint    = 'El plan Negocio permite 8 fotos por servicio';
  end if;

  -- Tamaño del catálogo, por grupo
  select group_key into v_group from public.service_categories where id = new.category_id;
  v_group := coalesce(v_group, 'servicios');
  v_max   := public.catalog_max(v_type, v_group);

  -- Solo si el servicio queda ACTIVO, y solo cuando eso hace crecer el
  -- catálogo visible: al crearlo activo, al reactivar uno en pausa, o al
  -- moverlo a otro grupo. Editar el título de uno que ya estaba activo en
  -- su grupo no debe chocar contra su propio límite.
  if new.status = 'activo'
     and (tg_op = 'INSERT'
          or old.status <> 'activo'
          or new.category_id is distinct from old.category_id) then

    select count(*) into v_n
      from public.provider_services s
      join public.service_categories c on c.id = s.category_id
     where s.provider_id = new.provider_id
       and c.group_key   = v_group
       and s.status      = 'activo'
       and (tg_op = 'INSERT' or s.id <> new.id);

    if v_n >= v_max then
      raise exception 'Tu catálogo de % ya tiene % activos de % permitidos', v_group, v_n, v_max
        using errcode = 'check_violation',
              hint    = 'Pausa uno, o pasa al plan Negocio para publicar más';
    end if;
  end if;

  return new;
end;
$$;

create trigger provider_services_guard_limits
  before insert or update on public.provider_services
  for each row execute function public.guard_catalog_limits();
