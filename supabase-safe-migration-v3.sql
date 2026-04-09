-- ================================================================
-- POULTRY TRACKER — Multi-Tenant Migration v3
-- Ultra-simplified for Supabase SQL Editor
-- ================================================================

-- ================================================================
-- PHASE 1: Create tables & add columns ONLY (no policies yet)
-- ================================================================

-- Create tenants table if not exists
create table if not exists tenants (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  plan text default 'free',
  monthly_sales_limit integer default 50,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add tenant_id to profiles
alter table profiles add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- Add tenant_id to products  
alter table products add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- Add columns to sales
alter table sales add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table sales add column if not exists customer_name text;
alter table sales add column if not exists payment_method text default 'cash';
alter table sales add column if not exists paid_at timestamptz;
alter table sales add column if not exists paid_via text;

-- Create stock_records table with all columns
create table if not exists stock_records (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  item_name text not null,
  quantity numeric not null,
  cost_price numeric not null,
  total_cost numeric generated always as (quantity * cost_price) stored,
  stock_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- Create product_units table if not exists
create table if not exists product_units (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  unit_label text not null,
  created_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists idx_profiles_tenant on profiles(tenant_id);
create index if not exists idx_products_tenant on products(tenant_id);
create index if not exists idx_sales_tenant on sales(tenant_id);
create index if not exists idx_stock_records_tenant on stock_records(tenant_id);

select '✅ Phase 1 Complete: Tables & columns created' as status;


-- ================================================================
-- PHASE 2: Create default tenant & link existing data
-- ================================================================

-- Insert default tenant
insert into tenants (name, plan, created_by)
select 'My Business', 'pro', id
from profiles where is_admin = true limit 1
on conflict (name) do nothing;

-- Get the tenant ID
with tenant_id_value as (
  select id from tenants where name = 'My Business' limit 1
)
update profiles
set tenant_id = (select id from tenant_id_value)
where tenant_id is null;

-- Link products
with tenant_id_value as (
  select id from tenants where name = 'My Business' limit 1
)
update products
set tenant_id = (select id from tenant_id_value)
where tenant_id is null;

-- Link sales
with tenant_id_value as (
  select id from tenants where name = 'My Business' limit 1
)
update sales
set tenant_id = (select id from tenant_id_value)
where tenant_id is null;

-- Link stock records
with tenant_id_value as (
  select id from tenants where name = 'My Business' limit 1
)
update stock_records
set tenant_id = (select id from tenant_id_value)
where tenant_id is null;

select '✅ Phase 2 Complete: Data linked to tenant' as status;


-- ================================================================
-- PHASE 3: Enable RLS on all tables
-- ================================================================

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table stock_records enable row level security;
alter table product_units enable row level security;

select '✅ Phase 3 Complete: RLS enabled' as status;


-- ================================================================
-- PHASE 4: Drop old policies
-- ================================================================

drop policy if exists "Authenticated users can view products" on products;
drop policy if exists "Admins can insert products" on products;
drop policy if exists "Admins can update products" on products;
drop policy if exists "Admins can delete products" on products;
drop policy if exists "Users can view own sales" on sales;
drop policy if exists "Users can insert own sales" on sales;
drop policy if exists "Users can update own sales" on sales;
drop policy if exists "Users can delete own sales" on sales;
drop policy if exists "Users can read own profile" on profiles;

select '✅ Phase 4 Complete: Old policies removed' as status;


-- ================================================================
-- PHASE 5: Create new tenant-scoped RLS policies
-- ================================================================

-- TENANTS policies
create policy "Users can view their tenant"
  on tenants for select
  using (id in (select tenant_id from profiles where id = auth.uid()));

create policy "Admins can update their tenant"
  on tenants for update
  using (id in (select tenant_id from profiles where id = auth.uid() and is_admin = true));

-- PROFILES policies
create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Admins can view tenant profiles"
  on profiles for select
  using (tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true));

-- PRODUCTS policies
create policy "Tenant members can view products"
  on products for select
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "Admins can insert products"
  on products for insert
  with check (tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can update products"
  on products for update
  using (tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true));

create policy "Admins can delete products"
  on products for delete
  using (tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true));

-- PRODUCT_UNITS policies
create policy "Tenant members can view product_units"
  on product_units for select
  using (
    product_id in (
      select id from products where tenant_id in (
        select tenant_id from profiles where id = auth.uid()
      )
    )
  );

create policy "Admins can manage product_units"
  on product_units for all
  using (
    product_id in (
      select id from products where tenant_id in (
        select tenant_id from profiles where id = auth.uid() and is_admin = true
      )
    )
  );

-- SALES policies
create policy "Users can view own sales"
  on sales for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and (user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  );

create policy "Users can insert sales"
  on sales for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Users can update own sales"
  on sales for update
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()) and user_id = auth.uid());

create policy "Users can delete own sales"
  on sales for delete
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()) and user_id = auth.uid());

-- STOCK_RECORDS policies
create policy "Users can view stock records"
  on stock_records for select
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "Users can insert stock records"
  on stock_records for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Users can delete stock records"
  on stock_records for delete
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()) and user_id = auth.uid());

select '✅ Phase 5 Complete: New RLS policies created' as status;


-- ================================================================
-- VERIFICATION
-- ================================================================

select '🎉 MIGRATION COMPLETE! 🎉' as final_status;

select 'Tenant Created:' as check;
select id, name, plan from tenants where name = 'My Business';

select 'Profiles Linked:' as check;
select count(*) as profiles_with_tenant, 
  (select count(*) from profiles where tenant_id is null) as profiles_without_tenant
from profiles where tenant_id is not null;

select 'All Data Linked:' as check;
select
  (select count(*) from products where tenant_id is not null) as products,
  (select count(*) from sales where tenant_id is not null) as sales,
  (select count(*) from stock_records where tenant_id is not null) as stock_records;

select '✅ Your existing users can still log in' as note;
select '✅ New businesses can now register' as note;
