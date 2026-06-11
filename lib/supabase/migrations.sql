-- 1. Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 2. Add an embedding column to vendor_catalog (Gemini embeddings are 3072 dimensions)
-- First drop the old 768 column if it exists so we can re-create it
alter table public.vendor_catalog drop column if exists embedding;

alter table public.vendor_catalog 
add column embedding vector(3072);

-- 3. Create a function to perform cosine similarity search
drop function if exists match_products(vector(768), float, int);

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
    1 - (vendor_catalog.embedding <=> query_embedding) as similarity
  from vendor_catalog
  where 1 - (vendor_catalog.embedding <=> query_embedding) > match_threshold
  order by vendor_catalog.embedding <=> query_embedding
  limit match_count;
$$;

-- 4. Create RFQ History table
create table if not exists public.rfq_history (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid references auth.users(id) not null,
  vendor_id uuid references auth.users(id) not null,
  product_name text not null,
  quantity integer not null,
  price_per_unit numeric not null,
  saved_amount numeric not null default 0,
  priority text,
  created_at timestamp with time zone default now()
);

-- Enable RLS on RFQ History
alter table public.rfq_history enable row level security;

-- Buyers can only see and insert their own RFQs
create policy "Buyers can view own RFQ history"
on public.rfq_history for select
to authenticated
using (buyer_id = auth.uid());

create policy "Buyers can insert own RFQ history"
on public.rfq_history for insert
to authenticated
with check (buyer_id = auth.uid());
