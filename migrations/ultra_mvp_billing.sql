-- ============================================================================
-- ULTRA-MVP BILLING MIGRATION
-- ============================================================================
-- Purpose: Add billing, subscription, and usage tracking for Stripe integration
-- Approach: Trial via trial_usage table, no entitlement_overrides
-- Service role: All billing writes bypass RLS (users read-only)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS (source of truth for limits)
-- ----------------------------------------------------------------------------

create table if not exists public.subscription_plans (
  id text primary key check (id in ('free', 'starter', 'pro')),
  name text not null,
  price_monthly integer not null, -- pence (e.g., 2900 = £29.00)
  max_ai_generations_per_month integer not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed plans
insert into public.subscription_plans (id, name, price_monthly, max_ai_generations_per_month, is_active)
values
  ('free', 'Free', 0, 0, true),
  ('starter', 'Starter', 2900, 50, true),
  ('pro', 'Pro', 9900, 200, true)
on conflict (id) do update set
  price_monthly = excluded.price_monthly,
  max_ai_generations_per_month = excluded.max_ai_generations_per_month,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 2. PLAN PRICES (maps plan + cadence to Stripe price ID)
-- ----------------------------------------------------------------------------

create table if not exists public.plan_prices (
  plan_id text not null references public.subscription_plans(id) on delete cascade,
  cadence text not null check (cadence in ('monthly')), -- MVP: monthly only
  stripe_price_id text not null unique,
  amount integer not null, -- pence
  currency text not null default 'gbp',
  primary key (plan_id, cadence),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed prices (REAL STRIPE PRICE IDs - TEST MODE)
insert into public.plan_prices (plan_id, cadence, stripe_price_id, amount, currency)
values
  ('starter', 'monthly', 'price_1SHAhF2NFEywlXB6X3XqISK9', 2900, 'gbp'),
  ('pro', 'monthly', 'price_1SHAhQ2NFEywlXB6RO5wP7ia', 9900, 'gbp')
on conflict (plan_id, cadence) do update set
  stripe_price_id = excluded.stripe_price_id,
  amount = excluded.amount,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 3. USER SUBSCRIPTIONS (current subscription state, lean)
-- ----------------------------------------------------------------------------

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id) default 'free',
  status text not null default 'active' check (status in ('active', 'trialing', 'canceled', 'past_due')),
  stripe_customer_id text unique, -- NULL until first checkout
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for Stripe lookups
create index if not exists user_subscriptions_stripe_customer_idx on public.user_subscriptions(stripe_customer_id);
create index if not exists user_subscriptions_stripe_subscription_idx on public.user_subscriptions(stripe_subscription_id);

-- ----------------------------------------------------------------------------
-- 4. TRIAL USAGE (tracks 14-day, 10-gen card-less trial)
-- ----------------------------------------------------------------------------

create table if not exists public.trial_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null, -- started_at + 14 days
  generations_used integer not null default 0,
  max_generations integer not null default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 5. USAGE COUNTERS (atomic, per-metric, per-period)
-- ----------------------------------------------------------------------------

create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('ai_generations')),
  period_start date not null, -- UTC month bucket (YYYY-MM-01)
  used integer not null default 0,
  primary key (user_id, metric, period_start),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookups
create index if not exists usage_counters_period_idx on public.usage_counters(user_id, period_start);

-- ----------------------------------------------------------------------------
-- 6. BILLING TRANSACTIONS (audit trail for invoices)
-- ----------------------------------------------------------------------------

create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_invoice_id text unique not null,
  amount integer not null, -- pence
  currency text not null default 'gbp',
  status text not null check (status in ('paid', 'open', 'void', 'uncollectible')),
  invoice_pdf_url text,
  billing_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for user lookups
create index if not exists billing_transactions_user_idx on public.billing_transactions(user_id);

-- ----------------------------------------------------------------------------
-- 7. STRIPE EVENTS (webhook idempotency)
-- ----------------------------------------------------------------------------

create table if not exists public.stripe_events (
  id text primary key, -- Stripe event ID (e.g., evt_xxx)
  received_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. RLS POLICIES (users read-only, service role writes)
-- ----------------------------------------------------------------------------

-- Subscription plans (public read)
alter table public.subscription_plans enable row level security;
create policy "subscription_plans_public_read" on public.subscription_plans
  for select using (is_active = true);

-- Plan prices (public read)
alter table public.plan_prices enable row level security;
create policy "plan_prices_public_read" on public.plan_prices
  for select using (true);

-- User subscriptions (users read their own)
alter table public.user_subscriptions enable row level security;
create policy "user_subscriptions_own_read" on public.user_subscriptions
  for select using (user_id = auth.uid());

-- Trial usage (users read their own)
alter table public.trial_usage enable row level security;
create policy "trial_usage_own_read" on public.trial_usage
  for select using (user_id = auth.uid());

-- Usage counters (users read their own)
alter table public.usage_counters enable row level security;
create policy "usage_counters_own_read" on public.usage_counters
  for select using (user_id = auth.uid());

-- Billing transactions (users read their own)
alter table public.billing_transactions enable row level security;
create policy "billing_transactions_own_read" on public.billing_transactions
  for select using (user_id = auth.uid());

-- Stripe events (no user access)
alter table public.stripe_events enable row level security;
create policy "stripe_events_no_access" on public.stripe_events
  for select using (false);

-- ⚠️ NO INSERT/UPDATE/DELETE POLICIES FOR USERS ON BILLING TABLES
-- All writes via service role (bypass RLS)

-- ----------------------------------------------------------------------------
-- 9. UPDATED TRIGGER (update timestamps)
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to all tables
create trigger set_subscription_plans_updated_at before update on public.subscription_plans
  for each row execute procedure public.set_updated_at();
create trigger set_plan_prices_updated_at before update on public.plan_prices
  for each row execute procedure public.set_updated_at();
create trigger set_user_subscriptions_updated_at before update on public.user_subscriptions
  for each row execute procedure public.set_updated_at();
create trigger set_trial_usage_updated_at before update on public.trial_usage
  for each row execute procedure public.set_updated_at();
create trigger set_usage_counters_updated_at before update on public.usage_counters
  for each row execute procedure public.set_updated_at();
create trigger set_billing_transactions_updated_at before update on public.billing_transactions
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. POST-SIGNUP HOOK (create trial + subscription rows)
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user_billing()
returns trigger
security definer set search_path = ''
language plpgsql
as $$
begin
  -- Create user subscription (starts on Free, will move to trialing via trial_usage logic)
  insert into public.user_subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');
  
  -- Create trial usage (14 days, 10 AI generations)
  insert into public.trial_usage (user_id, started_at, expires_at, generations_used, max_generations)
  values (new.id, now(), now() + interval '14 days', 0, 10);
  
  return new;
end;
$$;

-- Create trigger (if not exists)
drop trigger if exists on_auth_user_created_billing on auth.users;
create trigger on_auth_user_created_billing
  after insert on auth.users
  for each row execute procedure public.handle_new_user_billing();

-- ----------------------------------------------------------------------------
-- 11. ATOMIC USAGE INCREMENT RPC
-- ----------------------------------------------------------------------------

create or replace function public.increment_usage(
  p_user_id uuid,
  p_metric text,
  p_period_start date
)
returns void
security definer set search_path = ''
language plpgsql
as $$
begin
  insert into public.usage_counters (user_id, metric, period_start, used)
  values (p_user_id, p_metric, p_period_start, 1)
  on conflict (user_id, metric, period_start)
  do update set used = public.usage_counters.used + 1, updated_at = now();
end;
$$;

-- Grant execute to service role (not needed for public, service role bypasses RLS)
grant execute on function public.increment_usage(uuid, text, date) to service_role;

-- ----------------------------------------------------------------------------
-- 11b. ATOMIC TRIAL USAGE INCREMENT RPC
-- ----------------------------------------------------------------------------

create or replace function public.increment_trial_usage(
  p_user_id uuid
)
returns void
security definer set search_path = ''
language plpgsql
as $$
begin
  update public.trial_usage
  set generations_used = generations_used + 1, updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Grant execute to service role
grant execute on function public.increment_trial_usage(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 12. AI ALLOWANCE VIEW (combines plan limits with trial)
-- ----------------------------------------------------------------------------

create or replace view public.ai_allowance as
select
  us.user_id,
  date_trunc('month', now())::date as period_start,
  case
    -- If user has active trial, use trial max
    when tu.user_id is not null and now() < tu.expires_at then tu.max_generations
    -- Otherwise use plan limit
    else sp.max_ai_generations_per_month
  end as allowed,
  us.plan_id,
  us.status,
  case
    when tu.user_id is not null and now() < tu.expires_at then true
    else false
  end as is_trialing
from public.user_subscriptions us
join public.subscription_plans sp on sp.id = us.plan_id
left join public.trial_usage tu on tu.user_id = us.user_id;

-- Grant select to authenticated users
grant select on public.ai_allowance to authenticated;

-- ----------------------------------------------------------------------------
-- 13. RLS PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

create index if not exists user_subscriptions_user_id_idx on public.user_subscriptions(user_id);
create index if not exists trial_usage_user_id_idx on public.trial_usage(user_id);
create index if not exists usage_counters_user_id_idx on public.usage_counters(user_id);
create index if not exists billing_transactions_user_id_idx on public.billing_transactions(user_id);

-- ----------------------------------------------------------------------------
-- MIGRATION COMPLETE
-- ----------------------------------------------------------------------------
-- Next steps:
-- 1. Replace Stripe price ID placeholders in plan_prices
-- 2. Set SUPABASE_SERVICE_ROLE_KEY in .env.local and Vercel
-- 3. Create Stripe products/prices in Dashboard
-- 4. Configure Stripe webhook endpoint
-- ----------------------------------------------------------------------------

