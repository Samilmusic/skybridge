-- Additive migration: existing visa, customer and experience data are retained.
create table public.website_enquiries (
 id uuid primary key, reference text unique not null default ('SB-E-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 category text not null check(category in ('general','advertising','experience','consultation','technology')),
 name text not null check(length(name) between 2 and 120), email text not null check(length(email)<=250),
 phone text not null default '', company text not null default '', service text not null,
 message text not null check(length(message) between 10 and 3000), details jsonb not null default '{}',
 consent_at timestamptz not null default now(), created_at timestamptz not null default now(),
 email_status text not null default 'pending' check(email_status in ('pending','sent','failed','not_configured')),
 email_id text, email_error text, status text not null default 'new' check(status in ('new','contacted','closed'))
);
alter table public.website_enquiries enable row level security;
revoke all on public.website_enquiries from anon,authenticated;
grant select,update(status) on public.website_enquiries to authenticated;
grant all on public.website_enquiries to service_role;
create policy "Staff read website enquiries" on public.website_enquiries for select to authenticated using(exists(select 1 from public.skybridge_staff s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy "Staff update website enquiry status" on public.website_enquiries for update to authenticated using(exists(select 1 from public.skybridge_staff s where s.user_id=(select auth.uid()) and s.role='admin')) with check(exists(select 1 from public.skybridge_staff s where s.user_id=(select auth.uid()) and s.role='admin'));
create index website_enquiries_created on public.website_enquiries(created_at desc);
create table public.website_rate_limits (key text primary key, window_start timestamptz not null default now(), attempts integer not null default 1);
alter table public.website_rate_limits enable row level security;
revoke all on public.website_rate_limits from anon,authenticated;
grant all on public.website_rate_limits to service_role;
-- Invoker rights; only the server role can call this atomic rate-limit operation.
create function public.website_allow_request(bucket text) returns boolean language plpgsql security invoker set search_path='' as $$
declare hits integer;
begin
 insert into public.website_rate_limits as r(key) values(bucket)
 on conflict(key) do update set
 attempts=case when r.window_start<now()-interval '1 hour' then 1 else r.attempts+1 end,
 window_start=case when r.window_start<now()-interval '1 hour' then now() else r.window_start end
 returning attempts into hits;
 return hits<=8;
end;$$;
revoke all on function public.website_allow_request(text) from public,anon,authenticated;
grant execute on function public.website_allow_request(text) to service_role;
