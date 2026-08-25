-- ============================================================
-- APURAPE · 011 · Cobros y planes
-- ============================================================
-- Sustituye subscriptions (Stripe, sin usar) y adapta payments.
--
-- QUIÉN PAGA: solo el Proveedor, y solo el plan Pro.
--   Persona  S/120/año   (12000 céntimos)
--   Negocio  S/330/año   (33000 céntimos)
-- El Cliente nunca paga. Comisión sobre ventas: 0%.
--
-- OFERTA: 1er mes gratis al registrarse (trial de 002) + 1 mes
-- gratis adicional al suscribirse y pagar → el primer año pagado
-- vence a los 13 meses.
-- ============================================================

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,

  provider       text not null default 'culqi' check (provider in ('culqi','manual','otro')),
  charge_id      text,
  subscription_id text,

  amount_cents   int  not null check (amount_cents >= 0),
  currency       text not null default 'PEN' check (currency in ('PEN','USD')),

  plan           text not null default 'pro' check (plan in ('pro')),
  account_type   text not null check (account_type in ('persona','negocio')),

  status         text not null default 'pendiente'
                   check (status in ('pendiente','pagado','fallido','reembolsado')),

  period_start   timestamptz,
  period_end     timestamptz,
  raw_response   jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index payments_profile_idx on public.payments (profile_id, created_at desc);
create unique index payments_charge_uniq on public.payments (charge_id) where charge_id is not null;

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ── Precio vigente según tipo de cuenta ──────────────────────
create or replace function public.plan_price_cents(p_account_type text)
returns int
language sql
stable
as $$
  select case p_account_type
           when 'negocio' then public.config_int('price_pro_negocio_cents', 33000)
           else                public.config_int('price_pro_persona_cents', 12000)
         end;
$$;

-- ── Activar Pro tras un pago confirmado ──────────────────────
-- SECURITY DEFINER: la llama el webhook/endpoint de Culqi con
-- service_role, nunca el navegador.
create or replace function public.activate_pro_plan(
  p_profile_id uuid,
  p_payment_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_bonus  int := public.config_int('bonus_free_months', 1);
  v_base   timestamptz;
begin
  select greatest(coalesce(plan_expires_at, now()), now()) into v_base
    from public.profiles where id = p_profile_id;

  update public.profiles
     set plan                = 'pro',
         plan_status         = 'active',
         plan_started_at     = coalesce(plan_started_at, now()),
         -- 12 meses pagados + el mes gratis adicional de la oferta
         plan_expires_at     = v_base + interval '12 months' + (v_bonus || ' months')::interval,
         free_months_granted = free_months_granted + v_bonus,
         trial_ends_at       = null
   where id = p_profile_id;

  if p_payment_id is not null then
    update public.payments
       set status       = 'pagado',
           period_start = now(),
           period_end   = (select plan_expires_at from public.profiles where id = p_profile_id)
     where id = p_payment_id;
  end if;
end;
$$;

-- ── Vencimientos (llamar desde el cron existente de la app) ──
create or replace function public.expire_plans()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  update public.profiles
     set plan_status = 'expired', plan = 'basico'
   where plan_status = 'active' and plan = 'pro'
     and plan_expires_at is not null and plan_expires_at < now();
  get diagnostics n = row_count;

  update public.profiles
     set plan_status = 'active'
   where plan_status = 'trial'
     and trial_ends_at is not null and trial_ends_at < now();

  return n;
end;
$$;
