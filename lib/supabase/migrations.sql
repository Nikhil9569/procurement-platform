-- 1. Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 2. Create Profiles table (if not exists)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null check (role in ('buyer', 'vendor')),
  company_name text,
  contact_email text,
  created_at timestamp with time zone default now()
);

-- Ensure contact_email exists in case the table was already created previously
alter table public.profiles add column if not exists contact_email text;

alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on profiles;
drop policy if exists "Users can insert their own profile." on profiles;
drop policy if exists "Users can update own profile." on profiles;

create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- 3. Update vendor_catalog
alter table public.vendor_catalog drop column if exists embedding;
alter table public.vendor_catalog drop column if exists rating;

alter table public.vendor_catalog 
add column embedding vector(3072),
add column rating numeric;

-- Enable RLS for vendor_catalog
alter table public.vendor_catalog enable row level security;
-- Drop existing policies if any to avoid errors
drop policy if exists "Anyone can view vendor_catalog" on public.vendor_catalog;
drop policy if exists "Vendors can insert their own catalog" on public.vendor_catalog;
drop policy if exists "Vendors can update their own catalog" on public.vendor_catalog;
drop policy if exists "Vendors can delete their own catalog" on public.vendor_catalog;

create policy "Anyone can view vendor_catalog" on public.vendor_catalog for select to authenticated using (true);
create policy "Vendors can insert their own catalog" on public.vendor_catalog for insert to authenticated with check (vendor_id = auth.uid());
create policy "Vendors can update their own catalog" on public.vendor_catalog for update to authenticated using (vendor_id = auth.uid());
create policy "Vendors can delete their own catalog" on public.vendor_catalog for delete to authenticated using (vendor_id = auth.uid());

-- 4. Create a function to perform cosine similarity search
drop function if exists match_products(vector(768), float, int);
drop function if exists match_products(vector(3072), float, int);

create or replace function match_products(
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  vendor_id uuid,
  product_name text,
  category text,
  price numeric,
  warranty_months integer,
  delivery_days integer,
  moq integer,
  stock integer,
  rating numeric,
  similarity float
)
language sql stable
as $$
  select
    vendor_catalog.id,
    vendor_catalog.vendor_id,
    vendor_catalog.product_name,
    vendor_catalog.category,
    vendor_catalog.price,
    vendor_catalog.warranty_months,
    vendor_catalog.delivery_days,
    vendor_catalog.moq,
    vendor_catalog.stock,
    vendor_catalog.rating,
    1 - (vendor_catalog.embedding <=> query_embedding) as similarity
  from vendor_catalog
  where 1 - (vendor_catalog.embedding <=> query_embedding) > match_threshold
  order by vendor_catalog.embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Create RFQ History table
create table if not exists public.rfq_history (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid references auth.users(id) not null,
  vendor_id uuid references auth.users(id) not null,
  product_name text not null,
  quantity integer not null,
  price_per_unit numeric not null,
  saved_amount numeric not null default 0,
  priority text,
  experience_rating integer,
  feedback_notes text,
  created_at timestamp with time zone default now()
);

alter table public.rfq_history add column if not exists experience_rating integer;
alter table public.rfq_history add column if not exists feedback_notes text;

-- Enable RLS on RFQ History
alter table public.rfq_history enable row level security;
drop policy if exists "Buyers can view own RFQ history" on public.rfq_history;
drop policy if exists "Vendors can view their awarded RFQs" on public.rfq_history;
drop policy if exists "Buyers can insert own RFQ history" on public.rfq_history;

create policy "Buyers can view own RFQ history"
on public.rfq_history for select
to authenticated
using (buyer_id = auth.uid());

create policy "Vendors can view their awarded RFQs"
on public.rfq_history for select
to authenticated
using (vendor_id = auth.uid());

create policy "Buyers can insert own RFQ history"
on public.rfq_history for insert
to authenticated
with check (buyer_id = auth.uid());

-- 6. Add new profile fields for registration onboarding
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists service_radius double precision;

