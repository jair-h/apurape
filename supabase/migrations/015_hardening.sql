-- ============================================================
-- APURAPE · 015 · Endurecimiento posterior a la aplicación
-- ============================================================
-- Corrige tres cosas detectadas al revisar la base ya creada.
-- ============================================================

-- ── 1. GRAVE: funciones SECURITY DEFINER expuestas por RPC ───
-- En Supabase, toda función de public es invocable por PostgREST
-- (/rest/v1/rpc/…) desde anon y authenticated. activate_pro_plan
-- es SECURITY DEFINER y no comprueba quién llama: cualquier
-- usuario con sesión podía regalarse el plan Pro con un POST.
-- Lo mismo valía para las funciones de conteo del sorteo, que
-- permitían recalcular o marcar trabajos a voluntad.
--
-- Regla: solo quedan expuestas las RPC que un usuario realmente
-- necesita llamar, y todas verifican auth.uid() por dentro.

revoke execute on function public.activate_pro_plan(uuid, uuid)          from anon, authenticated;
revoke execute on function public.expire_plans()                          from anon, authenticated;
revoke execute on function public.expire_quotes()                         from anon, authenticated;
revoke execute on function public.expire_service_requests()               from anon, authenticated;
revoke execute on function public.open_monthly_raffles(date)              from anon, authenticated;
revoke execute on function public.compute_raffle_entries(uuid)            from anon, authenticated;
revoke execute on function public.flag_reciprocal_jobs(date)              from anon, authenticated;
revoke execute on function public.rebuild_month(date)                     from anon, authenticated;
revoke execute on function public.recalc_provider_month(uuid, date, uuid) from anon, authenticated;
revoke execute on function public.recalc_client_month(uuid, date)         from anon, authenticated;
revoke execute on function public.refresh_client_level(uuid)              from anon, authenticated;
revoke execute on function public.handle_new_user()                       from anon, authenticated;

-- Estas sí las llama la app, pero nunca un visitante sin sesión.
revoke execute on function public.accept_quote(uuid)                      from anon;
revoke execute on function public.become_provider()                       from anon;
revoke execute on function public.confirm_job(uuid, int, text)            from anon;
revoke execute on function public.mark_job_completed(uuid)                from anon;
revoke execute on function public.mark_conversation_read(uuid)            from anon;
revoke execute on function public.rate_client(uuid, int, text)            from anon;
revoke execute on function public.provider_quotes_left(uuid)              from anon;
revoke execute on function public.close_raffle(uuid)                      from anon;
revoke execute on function public.admin_get_user_emails(uuid[])           from anon;

-- is_admin() e is_conversation_member() se quedan accesibles a
-- anon A PROPÓSITO: las evalúan las políticas RLS de las tablas
-- públicas (catálogo, banners, blog). Sin EXECUTE, un visitante
-- sin sesión recibiría "permission denied" al abrir la web.

-- ── 2. search_path fijo en el resto de funciones ─────────────
-- Sin él, quien pueda crear objetos en un esquema del search_path
-- podría secuestrar una llamada a función dentro del trigger.
alter function public.assert_is_provider()              set search_path = public;
alter function public.bump_conversation()               set search_path = public;
alter function public.bump_profile_rating()             set search_path = public;
alter function public.bump_quote_counters()             set search_path = public;
alter function public.config_int(text, int)             set search_path = public;
alter function public.current_period()                  set search_path = public;
alter function public.enforce_quote_limit()             set search_path = public;
alter function public.guard_job_transition()            set search_path = public;
alter function public.guard_profile_columns()           set search_path = public;
alter function public.handle_new_profile_plan()         set search_path = public;
alter function public.on_job_confirmed_stats()          set search_path = public;
alter function public.on_rating_stats()                 set search_path = public;
alter function public.period_of(timestamptz)            set search_path = public;
alter function public.plan_price_cents(text)            set search_path = public;
alter function public.set_reclamacion_codigo()          set search_path = public;
alter function public.set_updated_at()                  set search_path = public;
alter function public.validate_rating()                 set search_path = public;

-- ── 3. UNIQUE con NULL en los sorteos de Clientes ────────────
-- Los sorteos de Cliente llevan category_id NULL, y en Postgres
-- dos NULL no son iguales: la restricción no los distinguía y
-- open_monthly_raffles() habría creado sorteos duplicados de
-- Cliente en cada llamada. NULLS NOT DISTINCT lo cierra.
alter table public.raffles drop constraint raffles_period_audience_category_id_participant_type_key;
alter table public.raffles
  add constraint raffles_period_audience_category_type_key
  unique nulls not distinct (period, audience, category_id, participant_type);
