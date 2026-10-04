-- ============================================================
-- APURAPE · 033 · Requisito del concurso: 3 trabajos + promedio ≥ 3.0
-- ============================================================
-- La regla era (confirmed_jobs > 0 AND five_star_count >= 3). La nueva es
-- (confirmed_jobs >= 3 AND avg_stars >= 3.0), y cambia en las DOS
-- direcciones: más exigente en volumen, más abierta en calidad. Un
-- proveedor con 3 trabajos y promedio 4.0 antes quedaba fuera por no tener
-- tres cincos; ahora entra. Uno con 1 trabajo y tres cincos, al revés.
--
-- POR QUÉ SALE DE LA COLUMNA GENERADA
-- `qualifies` era una columna generada, y una expresión generada no puede
-- llamar a config_int porque leer una tabla no es IMMUTABLE. Dejar la regla
-- ahí significaba el 3 y el 3.0 incrustados en el esquema, cambiables solo
-- con una migración — al revés de todo lo demás del proyecto (cupo de
-- conversaciones, pesos del índice, límites de catálogo, precios), que vive
-- en `config` y se edita sin desplegar.
--
-- El coste es perder una columna indexable y llamar una función por fila al
-- cerrar. Con 18 concursos al mes y decenas de filas, es irrelevante.
--
-- NO HAY ESTRELLA GRATIS AL SUSCRIBIRSE: verificado, las calificaciones
-- solo nacen de filas en `ratings` atadas a un trabajo confirmado. Ni el
-- alta ni el pago tocan los contadores. Nada que construir.
--
-- ── DOS IDEAS APLAZADAS, A PROPÓSITO ────────────────────────
-- Quedan fuera hasta después del lanzamiento, cuando haya premios en
-- efectivo y cientos de usuarios. Se anotan aquí porque este es el archivo
-- que leerá quien vuelva a tocar las reglas del concurso:
--
--   1. UN PREMIO POR PERFIL AL MES. Hoy un mismo proveedor puede ganar en
--      varias categorías el mismo mes. Con premios simbólicos no importa;
--      con dinero, concentrar los premios en una persona haría que el
--      concurso pareciera arreglado. Implicaría cerrar los concursos en un
--      orden definido y excluir a quien ya ganó.
--
--   2. MÍNIMO DE PARTICIPANTES POR CATEGORÍA. Hoy, con un solo
--      participante que clasifique, ese gana. Es correcto mientras los
--      premios sean simbólicos, pero con dinero un premio ganado sin
--      competencia es un regalo, no un concurso. Implicaría un umbral en
--      config y dejar el concurso en 'anulado' por debajo de él.
--
-- Ninguna de las dos está implementada. No deducir de este comentario que
-- existen.
-- ============================================================

-- ── 1 · El hermano decimal de config_int ─────────────────────
-- config.value es jsonb; '#>> {}' saca el escalar como texto, así que
-- funciona tanto si está guardado como número (3.0) como si está entre
-- comillas ("3.0").
create or replace function public.config_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select nullif(value #>> '{}', '')::numeric from public.config where key = p_key),
    p_default);
$$;

grant execute on function public.config_numeric(text, numeric) to anon, authenticated;

-- ── 2 · Los números ─────────────────────────────────────────
insert into public.config (key, value) values
  ('raffle_min_jobs',      to_jsonb(3)),
  ('raffle_min_avg_stars', to_jsonb(3.0))
on conflict (key) do update set value = excluded.value;

-- Config muerta. raffle_min_five_stars era el umbral viejo;
-- raffle_five_star_weight quedó sin uso desde la 026, cuando el puntaje
-- pasó a ser excellence_index * 100. Una clave que parece configurar algo y
-- no configura nada es peor que no tenerla.
delete from public.config where key in ('raffle_min_five_stars', 'raffle_five_star_weight');

-- ── 3 · La regla, en un solo sitio ───────────────────────────
create or replace function public.qualifies_for_raffle(p_jobs int, p_avg numeric)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(p_jobs, 0) >= public.config_numeric('raffle_min_jobs', 3)
     and coalesce(p_avg, 0) >= public.config_numeric('raffle_min_avg_stars', 3.0);
$$;

grant execute on function public.qualifies_for_raffle(int, numeric) to anon, authenticated;

-- ── 4 · Fuera la columna generada ───────────────────────────
-- Los índices que dependan de ella se van con ella.
alter table public.provider_monthly_stats drop column qualifies;

-- ── 5 · El cierre usa la función ────────────────────────────
-- Igual que la versión de la 029, cambiando solo s.qualifies por la
-- llamada. La rama de Cliente NO se toca: client_monthly_stats.qualifies
-- sigue siendo su propia regla (confirmed_jobs > 0), que es otro concurso.
create or replace function public.compute_raffle_entries(p_raffle_id uuid)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rf public.raffles%rowtype;
  n int;
begin
  select * into rf from public.raffles where id = p_raffle_id;
  if not found then raise exception 'Concurso no encontrado'; end if;

  perform public.flag_reciprocal_jobs(rf.period);
  perform public.rebuild_month(rf.period);

  delete from public.raffle_entries where raffle_id = p_raffle_id;

  if rf.audience = 'proveedor' then
    insert into public.raffle_entries
      (raffle_id, profile_id, entries, confirmed_jobs, five_star_count, score)
    select p_raffle_id, s.profile_id, s.confirmed_jobs, s.confirmed_jobs,
           s.five_star_count,
           round(s.excellence_index * 100, 2)
      from public.provider_monthly_stats s
      join public.profiles p on p.id = s.profile_id
     where s.period       = rf.period
       and s.category_id  = rf.category_id
       and public.qualifies_for_raffle(s.confirmed_jobs, s.avg_stars)
       and s.was_pro      = true          -- el concurso es beneficio Pro
       and p.account_type = rf.participant_type
       and p.suspended    = false
       and p.flagged      = false;
  else
    insert into public.raffle_entries
      (raffle_id, profile_id, entries, confirmed_jobs, five_star_count, score)
    select p_raffle_id, c.profile_id, c.confirmed_jobs, c.confirmed_jobs, 0,
           c.points_earned
      from public.client_monthly_stats c
      join public.profiles p on p.id = c.profile_id
     where c.period       = rf.period
       and c.qualifies    = true
       and p.account_type = rf.participant_type
       and p.suspended    = false
       and p.flagged      = false;
  end if;

  with ranked as (
    select id, row_number() over (
             order by score desc, five_star_count desc, confirmed_jobs desc, computed_at asc
           ) as rn
      from public.raffle_entries where raffle_id = p_raffle_id
  )
  update public.raffle_entries e set rank = ranked.rn
    from ranked where ranked.id = e.id;

  select count(*) into n from public.raffle_entries where raffle_id = p_raffle_id;
  update public.raffles set entries_total = n where id = p_raffle_id;
  return n;
end;
$$;

revoke execute on function public.compute_raffle_entries(uuid) from public;
grant  execute on function public.compute_raffle_entries(uuid) to authenticated;
