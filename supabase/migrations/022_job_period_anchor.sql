-- ============================================================
-- APURAPE · 022 · El mes de un trabajo se ancla a cuándo se hizo
-- ============================================================
-- Antes: period = period_of(confirmed_at).
-- Ahora: period = period_of(coalesce(completed_at, confirmed_at)).
--
-- Por qué. El cierre del concurso corre el día 3 del mes siguiente para
-- recoger las confirmaciones tardías. Con el ancla anterior eso no servía
-- de nada: un trabajo terminado el 30 de agosto y confirmado el 2 de
-- septiembre se contaba en SEPTIEMBRE, justo el caso que el margen
-- pretende capturar.
--
-- Efecto secundario buscado: el Proveedor ya no puede mover en qué mes
-- cuenta su venta pidiéndole al Cliente que confirme antes o después. El
-- mes lo fija el trabajo, no la confirmación.
--
-- El coalesce cubre un trabajo que llegue a 'confirmado' sin haber pasado
-- por 'pendiente_confirmar'. La máquina de estados no lo permite hoy, pero
-- service_role puede saltársela.
-- ============================================================

create or replace function public.guard_job_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if old.status is distinct from new.status then
    if not (
         (old.status = 'agendado'            and new.status in ('pendiente_confirmar','cancelado','disputa'))
      or (old.status = 'pendiente_confirmar' and new.status in ('confirmado','disputa','cancelado'))
      or (old.status = 'disputa'             and new.status in ('confirmado','cancelado'))
    ) then
      raise exception 'Transición de estado inválida: % → %', old.status, new.status;
    end if;
  end if;

  if new.completed_at is distinct from old.completed_at and new.completed_at is not null then
    if v_actor is not null and v_actor <> new.provider_id then
      raise exception 'Solo el Proveedor puede marcar el servicio como completado';
    end if;
    new.completed_by := coalesce(new.completed_by, new.provider_id);
  end if;

  if new.confirmed_at is distinct from old.confirmed_at and new.confirmed_at is not null then
    if v_actor is not null and v_actor <> new.client_id then
      raise exception 'Solo el Cliente puede confirmar el servicio';
    end if;
    new.confirmed_by := new.client_id;
    -- El mes es el del trabajo hecho, no el de la confirmación.
    new.period       := public.period_of(coalesce(new.completed_at, new.confirmed_at));
  end if;

  if old.status = 'confirmado' then
    if new.amount      is distinct from old.amount
    or new.provider_id is distinct from old.provider_id
    or new.client_id   is distinct from old.client_id then
      raise exception 'Un trabajo confirmado no puede modificar monto ni partes';
    end if;
  end if;

  return new;
end;
$$;

comment on column public.jobs.period is
  'Mes al que se imputa el trabajo para el concurso: el de completed_at (cuándo se hizo), no el de confirmed_at.';
