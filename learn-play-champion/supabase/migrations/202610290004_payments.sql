begin;

-- Membership is assigned only by trusted SQL, never by browser metadata or a checkbox.
create table public.payment_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.donation_orders (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  amount_cents integer not null check (amount_cents between 100 and 50000),
  environment text not null check (environment in ('sandbox', 'live')),
  paypal_order_id text unique,
  capture_request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp()
);
create table public.payment_events (
  event_id text primary key,
  donation_id uuid not null references public.donation_orders(id),
  resource_id text not null,
  event_type text not null check (event_type in (
    'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.PENDING', 'PAYMENT.CAPTURE.DENIED',
    'PAYMENT.CAPTURE.DECLINED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'
  )),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency = 'USD'),
  provider_created_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp()
);

alter table public.payment_admins enable row level security;
alter table public.donation_orders enable row level security;
alter table public.payment_events enable row level security;
revoke all on public.payment_admins, public.donation_orders, public.payment_events from public, anon, authenticated;
grant select, insert, update on public.donation_orders to service_role;
grant select, insert on public.payment_events to service_role;

create function public.is_payment_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.payment_admins where user_id = auth.uid()) $$;
revoke all on function public.is_payment_admin() from public, anon;
grant execute on function public.is_payment_admin() to authenticated;

create function public.begin_donation(request_id uuid, cents integer, mode text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare existing public.donation_orders; me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in with the adult account.' using errcode = '42501'; end if;
  if cents is null or cents < 100 or cents > 50000 or cents % 100 <> 0 or request_id is null or mode is null or mode not in ('sandbox', 'live') then
    raise exception 'Choose a donation between 1 and 500 USD.';
  end if;
  perform 1 from auth.users where id = me for update;
  select * into existing from public.donation_orders where id = request_id;
  if found then
    if existing.user_id is distinct from me or existing.amount_cents <> cents or existing.environment <> mode then
      raise exception 'Donation request does not match this account and amount.' using errcode = '42501';
    end if;
    return to_jsonb(existing);
  end if;
  if (select count(*) from public.donation_orders where user_id = me and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many donation attempts. Wait an hour or contact the operator.';
  end if;
  insert into public.donation_orders(id, user_id, amount_cents, environment) values(request_id, me, cents, mode) returning * into existing;
  return to_jsonb(existing);
end;
$$;
revoke all on function public.begin_donation(uuid, integer, text) from public, anon;
grant execute on function public.begin_donation(uuid, integer, text) to authenticated;

create function public.admin_payment_events(before_time timestamptz default null, before_event text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_payment_admin() then
    raise exception 'Payment administrator access is required.' using errcode = '42501';
  end if;
  if (before_time is null) <> (before_event is null) then raise exception 'Invalid payment page cursor.'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(page) order by page.received_at desc, page.event_id desc)
    from (
      select e.event_id, e.event_type, e.resource_id, e.amount_cents, e.currency,
        e.provider_created_at, e.received_at, o.paypal_order_id, o.environment
      from public.payment_events e join public.donation_orders o on o.id = e.donation_id
      where before_time is null or (e.received_at, e.event_id) < (before_time, before_event)
      order by e.received_at desc, e.event_id desc limit 25
    ) page
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_payment_events(timestamptz, text) from public, anon;
grant execute on function public.admin_payment_events(timestamptz, text) to authenticated;
commit;
