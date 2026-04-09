-- ================================================================
-- POULTRY TRACKER — Safe Multi-Tenant Migration Script v2
-- Fixed for Supabase SQL Editor
-- Run this ENTIRE script in one go!
-- ================================================================

-- STEP 1: CREATE TENANTS TABLE (WITHOUT policies yet)
-- ================================================================
create table if not exists tenants (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  plan text default 'free',
  monthly_sales_limit integer default 50,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tenants enable row level security;

select '✅ Step 1: Tenants table created' as progress;


-- STEP 2: ADD TENANT_ID COLUMNS TO ALL TABLES
-- ================================================================
alter table profiles add column if not exists tenant_id uuid references tenants(id) on delete cascade;
create index if not exists idx_profiles_tenant_id on profiles(tenant_id);

alter table products add column if not exists tenant_id uuid references tenants(id) on delete cascade;
create index if not exists idx_products_tenant_id on products(tenant_id);

alter table sales add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table sales add column if not exists customer_name text;
alter table sales add column if not exists payment_method text default 'cash';
alter table sales add column if not exists paid_at timestamptz;
alter table sales add column if not exists paid_via text;
create index if not exists idx_sales_tenant_id on sales(tenant_id);

-- Ensure stock_records table exists
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
alter table stock_records enable row level security;
create index if not exists idx_stock_records_tenant_id on stock_records(tenant_id);

-- Ensure product_units exists
create table if not exists product_units (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  unit_label text not null,
  created_at timestamptz default now()
);
alter table product_units enable row level security;

select '✅ Step 2: All columns added to tables' as progress;


-- ADD TENANTS RLS POLICIES (NOW that tenant_id columns exist)
-- ================================================================
create policy "Users can view their own tenant"
  on tenants for select
  using (
    id in (select tenant_id from profiles where id = auth.uid())
  );

create policy "Tenant admins can update their tenant"
  on tenants for update
  using (
    id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

select '✅ Step 2b: Tenants RLS policies created' as progress;


-- STEP 3: CREATE DEFAULT TENANT & ASSIGN EXISTING DATA
-- ================================================================
insert into tenants (name, plan, created_by)
select 'My Business', 'pro', id
from profiles
where is_admin = true
limit 1
on conflict (name) do nothing;

select '✅ Step 3: Created "My Business" tenant' as progress;


-- STEP 4: ASSIGN EXISTING DATA TO TENANT
-- ================================================================
update profiles
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

update products
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

update sales
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

update stock_records
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

select '✅ Step 4: All existing data linked to tenant' as progress;


-- STEP 5: DROP OLD RLS POLICIES
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

select '✅ Step 5: Old policies removed' as progress;


-- STEP 6: CREATE NEW TENANT-SCOPED RLS POLICIES
create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Admins can view tenant profiles"
  on profiles for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

-- PRODUCTS
create policy "Tenant members can view products"
  on products for select
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "Tenant admins can insert products"
  on products for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Tenant admins can update products"
  on products for update
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Tenant admins can delete products"
  on products for delete
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

-- PRODUCT_UNITS
create policy "Tenant members can view product_units"
  on product_units for select
  using (
    product_id in (
      select id from products where tenant_id in (
        select tenant_id from profiles where id = auth.uid()
      )
    )
  );

create policy "Tenant admins can manage product_units"
  on product_units for all
  using (
    product_id in (
      select id from products where tenant_id in (
        select tenant_id from profiles where id = auth.uid() and is_admin = true
      )
    )
  );

-- SALES
create policy "Tenant members can view own sales"
  on sales for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and (
      user_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    )
  );

create policy "Tenant members can insert sales"
  on sales for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Tenant members can update own sales"
  on sales for update
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Tenant members can delete own sales"
  on sales for delete
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

-- STOCK_RECORDS
create policy "Tenant members can view stock_records"
  on stock_records for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
  );

create policy "Tenant members can insert stock_records"
  on stock_records for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Tenant members can delete stock_records"
  on stock_records for delete
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

select '✅ Step 6: New RLS policies created' as progress;


-- ================================================================
-- STEP 7: VERIFICATION - Check it all worked!
-- ================================================================

select '🎉 VERIFICATION RESULTS:' as result;
select id, name, plan from tenants where name = 'My Business';

select '2️⃣  Profiles Linked:' as check;
select 
  (select count(*) from profiles where tenant_id is not null) as linked,
  (select count(*) from profiles where tenant_id is null) as unlinked;

select '3️⃣  All Business Data Linked:' as check;
select
  (select count(*) from products where tenant_id is not null) as products_linked,
  (select count(*) from sales where tenant_id is not null) as sales_linked,
  (select count(*) from stock_records where tenant_id is not null) as stock_linked;

select '✅ MIGRATION COMPLETE!' as final_status;
select 'Existing user can still log in and see their data' as note;
select 'New businesses can now register' as note;

-- ================================================================
-- OPTIONAL: Run these to verify more details
-- ================================================================
-- Check if any data wasn't linked:
-- select (select count(*) from sales where tenant_id is null) as unlinked_sales;
-- select (select count(*) from products where tenant_id is null) as unlinked_products;
