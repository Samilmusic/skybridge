-- Sky Bridge FZE LLC — initial customer application database.
-- Run in the connected Sky Bridge Supabase SQL editor after review.
create extension if not exists pgcrypto;
create table if not exists public.visa_applications (
 id uuid primary key default gen_random_uuid(),
 reference text unique not null default ('SB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 user_id uuid not null references auth.users(id) on delete cascade,
 passport_country text not null check(length(passport_country) between 2 and 100),
 residence_country text not null check(length(residence_country) between 2 and 100),
 destination_country text not null check(length(destination_country) between 2 and 100),
 purpose text not null check(purpose in ('tourism','business','family','other')),
 notes text check(length(notes)<=2000),
 status text not null default 'received' check(status in ('received','reviewing','documents_required','processing','completed','rejected','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists visa_applications_user_created on public.visa_applications(user_id,created_at desc);
alter table public.visa_applications enable row level security;
create policy "Customers read own applications" on public.visa_applications for select to authenticated using ((select auth.uid())=user_id);
create policy "Customers submit own applications" on public.visa_applications for insert to authenticated with check ((select auth.uid())=user_id and status='received');
-- No customer update/delete policies. Administrative changes require a separate audited backend.
create table if not exists public.service_enquiries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('software','advertising','travel','corporate')),
 subject text not null check(length(subject) between 3 and 160),
 message text not null check(length(message) between 10 and 3000),
 created_at timestamptz not null default now()
);
alter table public.service_enquiries enable row level security;
create policy "Customers view own service enquiries" on public.service_enquiries for select to authenticated using ((select auth.uid())=user_id);
create policy "Customers create own service enquiries" on public.service_enquiries for insert to authenticated with check ((select auth.uid())=user_id);
