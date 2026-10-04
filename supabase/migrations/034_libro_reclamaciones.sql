-- ============================================================
-- APURAPE · 034 · Libro de Reclamaciones conforme a INDECOPI
-- ============================================================
-- La tabla `reclamaciones` existía desde la 012 con el correlativo y las
-- políticas correctas, pero el formulario público y el panel de admin
-- estaban escritos contra OTRO esquema, heredado de MARKARU:
--
--   el código mandaba        la tabla tiene
--   -----------------        --------------
--   dni                      documento
--   solicitud                pedido
--   status                   estado
--
-- Es decir: ningún reclamo se guardaba. Cada envío fallaba, y al consumidor
-- se le mostraba como "ticket" un UUID generado en el navegador en vez del
-- correlativo real (APU-000001) que genera el trigger. Una página de
-- cumplimiento legal que no cumplía nada.
--
-- Esta migración añade lo que el DS 011-2011-PCM exige y que faltaba, sin
-- tocar lo que ya estaba bien (correlativo, RLS, updated_at).
--
-- POR QUÉ EL ALTA PASA POR UN ENDPOINT Y NO POR EL NAVEGADOR
-- La política permite INSERT a cualquiera, como exige la norma, pero NO
-- SELECT: nadie puede leer los reclamos de otros. El problema es que sin
-- SELECT el navegador tampoco puede leer de vuelta su propio correlativo, y
-- el consumidor tiene derecho a conocerlo. Se resuelve en /api/reclamaciones
-- con la service role: inserta, lee el correlativo y lo devuelve, y de paso
-- manda los dos correos. La tabla no necesita abrir SELECT a nadie.
-- ============================================================

-- ── 1 · Documento: tipo y número separados ───────────────────
-- La norma pide el tipo de documento, no solo el número. `documento` ya
-- existía y se conserva como el número.
alter table public.reclamaciones
  add column doc_tipo text check (doc_tipo in ('dni','ce','pasaporte'));

comment on column public.reclamaciones.documento is
  'Número del documento. El tipo va en doc_tipo.';

-- ── 2 · Menor de edad y apoderado ───────────────────────────
-- Si el consumidor es menor, la norma exige identificar al padre, madre o
-- apoderado. El CHECK lo vuelve obligatorio en ese caso: es un dato sin el
-- cual el reclamo no está bien presentado.
alter table public.reclamaciones
  add column es_menor  boolean not null default false,
  add column apoderado text;

alter table public.reclamaciones
  add constraint reclamaciones_apoderado_si_menor
  check (es_menor = false or (apoderado is not null and length(trim(apoderado)) > 0));

-- ── 3 · Descripción del bien contratado ─────────────────────
-- Distinta del detalle del reclamo: una dice QUÉ se contrató, la otra QUÉ
-- salió mal. La norma pide las dos. `bien_servicio` (producto/servicio) y
-- `monto` ya existían.
alter table public.reclamaciones
  add column bien_descripcion text;

-- ── 4 · Estado y rastro de la respuesta ─────────────────────
-- 'respondido' es el estado que importa para el plazo legal: 15 días
-- hábiles desde la presentación. Los otros se conservan para no invalidar
-- filas existentes.
alter table public.reclamaciones drop constraint if exists reclamaciones_estado_check;
alter table public.reclamaciones
  add constraint reclamaciones_estado_check
  check (estado in ('pendiente','en_proceso','respondido','resuelto','cerrado'));

alter table public.reclamaciones
  add column respondido_at timestamptz;

comment on column public.reclamaciones.respondido_at is
  'Cuándo se respondió. Con created_at permite verificar el plazo de 15 días hábiles del DS 011-2011-PCM.';

-- Sella la fecha sola al pasar a respondido, para que el plazo no dependa
-- de que alguien se acuerde de llenar el campo.
create or replace function public.stamp_reclamacion_respuesta()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'respondido' and old.estado <> 'respondido' and new.respondido_at is null then
    new.respondido_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists reclamaciones_stamp_respuesta on public.reclamaciones;
create trigger reclamaciones_stamp_respuesta
  before update on public.reclamaciones
  for each row execute function public.stamp_reclamacion_respuesta();

-- ── 5 · Índice para la bandeja del admin ────────────────────
create index if not exists reclamaciones_estado_fecha_idx
  on public.reclamaciones (estado, created_at desc);
