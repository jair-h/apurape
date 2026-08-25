-- ============================================================
-- APURAPE · 016 · Corrige el revoke de 015
-- ============================================================
-- 015 hizo REVOKE ... FROM anon, authenticated y NO sirvió de nada:
-- en Postgres toda función se crea con EXECUTE concedido a PUBLIC,
-- y anon/authenticated seguían heredándolo por ahí. Verificado
-- llamando /rest/v1/rpc/activate_pro_plan con la anon key: respondía
-- 200 y activaba el plan.
--
-- Forma correcta: quitar el grant a PUBLIC y conceder explícitamente
-- solo a quien lo necesita.
-- ============================================================

-- ── Funciones privilegiadas: nadie las llama por RPC ─────────
-- Solo service_role (que ignora estos grants) y el propio motor
-- desde triggers y funciones SECURITY DEFINER.
revoke execute on function public.activate_pro_plan(uuid, uuid)          from public;
revoke execute on function public.expire_plans()                          from public;
revoke execute on function public.expire_quotes()                         from public;
revoke execute on function public.expire_service_requests()               from public;
revoke execute on function public.open_monthly_raffles(date)              from public;
revoke execute on function public.compute_raffle_entries(uuid)            from public;
revoke execute on function public.flag_reciprocal_jobs(date)              from public;
revoke execute on function public.rebuild_month(date)                     from public;
revoke execute on function public.recalc_provider_month(uuid, date, uuid) from public;
revoke execute on function public.recalc_client_month(uuid, date)         from public;
revoke execute on function public.refresh_client_level(uuid)              from public;
revoke execute on function public.handle_new_user()                       from public;
revoke execute on function public.plan_price_cents(text)                  from public;

-- ── RPC de usuario: solo con sesión iniciada ─────────────────
revoke execute on function public.accept_quote(uuid)                      from public;
revoke execute on function public.become_provider()                       from public;
revoke execute on function public.confirm_job(uuid, int, text)            from public;
revoke execute on function public.mark_job_completed(uuid)                from public;
revoke execute on function public.mark_conversation_read(uuid)            from public;
revoke execute on function public.rate_client(uuid, int, text)            from public;
revoke execute on function public.provider_quotes_left(uuid)              from public;
revoke execute on function public.close_raffle(uuid)                      from public;
revoke execute on function public.admin_get_user_emails(uuid[])           from public;

grant execute on function public.accept_quote(uuid)                       to authenticated;
grant execute on function public.become_provider()                        to authenticated;
grant execute on function public.confirm_job(uuid, int, text)             to authenticated;
grant execute on function public.mark_job_completed(uuid)                 to authenticated;
grant execute on function public.mark_conversation_read(uuid)             to authenticated;
grant execute on function public.rate_client(uuid, int, text)             to authenticated;
grant execute on function public.provider_quotes_left(uuid)               to authenticated;
grant execute on function public.close_raffle(uuid)                       to authenticated;  -- valida admin por dentro
grant execute on function public.admin_get_user_emails(uuid[])            to authenticated;  -- valida admin por dentro

-- ── Las que SÍ necesita anon ─────────────────────────────────
-- Las evalúan las políticas RLS de las tablas públicas (catálogo,
-- banners, blog). Sin EXECUTE, un visitante sin sesión recibiría
-- "permission denied for function is_admin" al abrir la web.
grant execute on function public.is_admin()                        to anon, authenticated;
grant execute on function public.is_conversation_member(uuid)      to anon, authenticated;
grant execute on function public.current_period()                  to anon, authenticated;
grant execute on function public.period_of(timestamptz)            to anon, authenticated;
grant execute on function public.config_int(text, int)             to anon, authenticated;
