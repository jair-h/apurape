-- ============================================================
-- APURAPE · 017 · Los triggers de contadores necesitan SECURITY DEFINER
-- ============================================================
-- Detectado probando el flujo real: un Proveedor cotizaba una solicitud y
-- service_requests.quotes_count se quedaba en 0.
--
-- Motivo: un trigger normal corre con los privilegios de quien disparó la
-- sentencia. bump_quote_counters actualizaba service_requests siendo el
-- Proveedor, y la política de UPDATE de esa tabla solo permite al Cliente
-- dueño. RLS no lanza error en un UPDATE: simplemente no toca ninguna fila.
-- El contador quedaba mal sin ningún síntoma visible.
--
-- Mismo caso en bump_profile_rating: escribe en el perfil del CALIFICADO,
-- que nunca es quien califica. Hoy no se nota porque solo se llega ahí
-- desde confirm_job()/rate_client(), que son SECURITY DEFINER y arrastran
-- sus privilegios al trigger. Pero la política de INSERT de ratings permite
-- insertar directamente, y por esa vía el rating del perfil no se
-- actualizaría. Se blinda igual.
-- ============================================================

create or replace function public.bump_quote_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.request_id is not null then
    update public.service_requests
       set quotes_count = quotes_count + 1
     where id = new.request_id;
  end if;
  if new.service_id is not null then
    update public.provider_services
       set quotes_count = quotes_count + 1
     where id = new.service_id;
  end if;
  return new;
end;
$$;

create or replace function public.bump_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
     set ratings_count   = p.ratings_count + 1,
         five_star_count = p.five_star_count + case when new.stars = 5 then 1 else 0 end,
         rating = round(
           ((p.rating * p.ratings_count) + new.stars)::numeric / (p.ratings_count + 1), 2)
   where p.id = new.rated_id;
  return new;
end;
$$;

-- Ninguno de los dos se llama por RPC: son solo triggers.
revoke execute on function public.bump_quote_counters()  from public;
revoke execute on function public.bump_profile_rating()  from public;
