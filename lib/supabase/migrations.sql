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
  match_count int,
  min_stock int default null,
  max_moq int default null,
  max_delivery_days int default null
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
    and (min_stock is null or vendor_catalog.stock >= min_stock)
    and (max_moq is null or vendor_catalog.moq <= max_moq)
    and (max_delivery_days is null or vendor_catalog.delivery_days <= max_delivery_days)
  order by vendor_catalog.embedding <=> query_embedding
  limit match_count;
$$;

-- Create an HNSW index on the embedding column for faster similarity scans
create index if not exists vendor_catalog_hnsw_idx on public.vendor_catalog using hnsw (embedding vector_cosine_ops);

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

-- 7. Add status and negotiated_price columns to rfq_history
alter table public.rfq_history add column if not exists status text default 'negotiation';
alter table public.rfq_history add column if not exists negotiated_price numeric;

-- 8. Create Deal Messages table
create table if not exists public.deal_messages (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.rfq_history(id) on delete cascade not null,
  sender_role text not null check (sender_role in ('buyer', 'vendor', 'ai')),
  message_text text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS on deal_messages
alter table public.deal_messages enable row level security;

-- Drop policies to avoid error
drop policy if exists "Users can select messages for deals they participate in" on public.deal_messages;
drop policy if exists "Users can insert messages for deals they participate in" on public.deal_messages;

-- Create policy to select messages: buyer or vendor of the deal
create policy "Users can select messages for deals they participate in"
on public.deal_messages for select
to authenticated
using (
  exists (
    select 1 from public.rfq_history rfq
    where rfq.id = deal_messages.deal_id
    and (rfq.buyer_id = auth.uid() or rfq.vendor_id = auth.uid())
  )
);

-- Create policy to insert messages: buyer or vendor of the deal
create policy "Users can insert messages for deals they participate in"
on public.deal_messages for insert
to authenticated
with check (
  exists (
    select 1 from public.rfq_history rfq
    where rfq.id = deal_messages.deal_id
    and (rfq.buyer_id = auth.uid() or rfq.vendor_id = auth.uid())
  )
);

-- 9. Add update policy for rfq_history
drop policy if exists "Parties of the RFQ can update the record" on public.rfq_history;
create policy "Parties of the RFQ can update the record"
on public.rfq_history for update
to authenticated
using (buyer_id = auth.uid() or vendor_id = auth.uid());

