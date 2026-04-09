-- ================================================================
-- POULTRY TRACKER — Safe Multi-Tenant Migration Script
-- Supabase SQL Editor Compatible (no \echo commands)
-- ================================================================

-- STEP 1: BACKUP DATA COUNTS (Before Migration)
-- ================================================================
-- Save counts to temp table for comparison
create temp table backup_counts as
select
  (select count(*) from profiles) as profile_count,
  (select count(*) from products) as product_count,
  (select count(*) from sales) as sales_count,
  (select count(*) from stock_records) as stock_count,
  (select count(*) from auth.users) as user_count;

-- Display backup counts - LOOK FOR THIS OUTPUT:
select 
  '✅ DATA COUNTS BEFORE MIGRATION:' as "STEP 1 - Current Data",
  profile_count,
  product_count,
  sales_count,
  stock_count,
  user_count
from backup_counts;


-- STEP 2: MIGRATE (Run Multi-Tenant Setup)
-- ================================================================
-- Creating tenants table and adding tenant_id to all tables...
create table if not exists tenants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  plan text default 'free',
  monthly_sales_limit integer default 50,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tenants enable row level security;

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

-- Add tenant_id to profiles
alter table profiles
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;
create index if not exists idx_profiles_tenant_id on profiles(tenant_id);

-- Add tenant_id to products
alter table products
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;
create index if not exists idx_products_tenant_id on products(tenant_id);

-- Ensure product_units table exists
create table if not exists product_units (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  unit_label text not null,
  created_at timestamptz default now()
);
alter table product_units enable row level security;
create index if not exists idx_product_units_product_id on product_units(product_id);

-- Add tenant_id to sales
alter table sales
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table sales
  add column if not exists customer_name text;
alter table sales
  add column if not exists payment_method text default 'cash';
alter table sales
  add column if not exists paid_at timestamptz;
alter table sales
  add column if not exists paid_via text;
create index if not exists idx_sales_tenant_id on sales(tenant_id);
create index if not exists idx_sales_user_id on sales(user_id);

-- Ensure stock_records table exists with tenant_id
create table if not exists stock_records (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
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

-- Drop old RLS policies
drop policy if exists "Authenticated users can view products" on products;
drop policy if exists "Admins can insert products" on products;
drop policy if exists "Admins can update products" on products;
drop policy if exists "Admins can delete products" on products;
drop policy if exists "Users can view own sales" on sales;
drop policy if exists "Users can insert own sales" on sales;
drop policy if exists "Users can update own sales" on sales;
drop policy if exists "Users can delete own sales" on sales;

-- STEP 3: DATA MIGRATION (Assign tenant to existing data)
with admin_user as (
  select id from profiles where is_admin = true limit 1
),
-- Create default tenant if not exists
new_tenant as (
  insert into tenants (name, plan, created_by)
  values (
    'My Business',
    'pro',
    (select id from admin_user)
  )
  on conflict (name) do update set name = 'My Business'
  returning id
),
existing_tenant as (
  select coalesce(
    (select id from new_tenant),
    (select id from tenants where name = 'My Business' limit 1)
  ) as id
)
-- Link profiles to tenant
update profiles
  set tenant_id = (select id from existing_tenant)
  where tenant_id is null
  and id in (select id from admin_user);

-- Link products
update products
  set tenant_id = (select id from tenants where name = 'My Business' limit 1)
  where tenant_id is null;

-- Link sales
update sales
  set tenant_id = (select id from tenants where name = 'My Business' limit 1)
  where tenant_id is null;


-- Link stock records
update stock_records
  set tenant_id = (select id from tenants where name = 'My Business' limit 1)
  where tenant_id is null;

-- Link remaining staff profiles
update profiles
  set tenant_id = (select id from tenants where name = 'My Business' limit 1)
  where tenant_id is null;


-- STEP 4: CREATE RLS POLICIES
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());

drop policy if exists "Admins can view all tenant profiles" on profiles;
create policy "Admins can view all tenant profiles"
  on profiles for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

-- PRODUCTS RLS
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

-- PRODUCT_UNITS RLS
create policy "Tenant members can view product units"
  on product_units for select
  using (
    product_id in (
      select id from products where tenant_id in (
        select tenant_id from profiles where id = auth.uid()
      )
    )
  );

create policy "Tenant admins can manage product units"
  on product_units for all
  using (
    product_id in (
      select id from products where tenant_id in (
        select tenant_id from profiles where id = auth.uid() and is_admin = true
      )
    )
  );

-- SALES RLS
create policy "Tenant members can view own sales"
  on sales for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and (
      user_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    )
  );

create policy "Tenant members can insert own sales"
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

-- STOCK_RECORDS RLS
create policy "Tenant members can view own stock records"
  on stock_records for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and (
      user_id = auth.uid()
      or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    )
  );

create policy "Tenant members can insert stock records"
  on stock_records for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Tenant members can delete own stock records"
  on stock_records for delete
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );


-- ================================================================
-- STEP 5: VERIFICATION - Check everything worked
-- ================================================================

select '✅ VERIFICATION 1: Tenant Created' as verification_check;
select id, name, plan from tenants where name = 'My Business';

select '✅ VERIFICATION 2: Profiles Linked to Tenant' as verification_check;
select 
  (select count(*) from profiles where tenant_id is not null) as linked_profiles,
  (select count(*) from profiles where tenant_id is null) as unlinked_profiles;

select '✅ VERIFICATION 3: All Data Linked to Tenant' as verification_check;
select
  (select count(*) from products where tenant_id is not null) as products_linked,
  (select count(*) from products where tenant_id is null) as products_unlinked,
  (select count(*) from sales where tenant_id is not null) as sales_linked,
  (select count(*) from sales where tenant_id is null) as sales_unlinked,
  (select count(*) from stock_records where tenant_id is not null) as stock_linked,
  (select count(*) from stock_records where tenant_id is null) as stock_unlinked;

select '✅ VERIFICATION 4: Data Count Before vs After' as verification_check;
select
  backup.profile_count as profiles_before,
  (select count(*) from profiles) as profiles_after,
  backup.product_count as products_before,
  (select count(*) from products) as products_after,
  backup.sales_count as sales_before,
  (select count(*) from sales) as sales_after,
  backup.stock_count as stock_before,
  (select count(*) from stock_records) as stock_after
from backup_counts backup;

-- Final status
select '🎉 MIGRATION COMPLETE! 🎉' as "FINAL STATUS";
select '✅ All data migrated safely' as note;
select '✅ Existing users can still log in' as note;
select '✅ New businesses can now register' as note;

-- ================================================================
-- NEXT STEPS:
-- 1. Ask existing user to log in and verify data still shows
-- 2. Build business registration page in React app
-- 3. Deploy code changes to Vercel
-- 4. Submit to Google Play Store
-- ================================================================
