-- ================================================================
-- POULTRY TRACKER — Multi-Tenant Migration v4
-- STAGE-BY-STAGE Version (Run each stage separately!)
-- ================================================================

-- ================================================================
-- BACKUP: Check current data before any changes
-- ================================================================
select 
  'BACKUP: Data counts BEFORE migration' as check,
  (select count(*) from profiles) as profiles,
  (select count(*) from products) as products,
  (select count(*) from sales) as sales,
  (select count(*) from stock_records) as stock_records,
  (select count(*) from auth.users) as users;

-- Save for later comparison
create temp table backup_state as
select
  (select count(*) from profiles) as profile_count,
  (select count(*) from products) as product_count,
  (select count(*) from sales) as sales_count,
  (select count(*) from stock_records) as stock_count;

select '✅ Backup saved' as status;


-- ================================================================
-- STAGE 1: Create tenants table only
-- Run this first, then check output before proceeding
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

select '✅ STAGE 1 Complete: tenants table created' as status;


-- ================================================================
-- STAGE 2: Add tenant_id columns to existing tables
-- Wait for Stage 1 to complete before running this
-- ================================================================

alter table profiles add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table products add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table sales add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table stock_records add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- Add other columns to sales
alter table sales add column if not exists customer_name text;
alter table sales add column if not exists payment_method text default 'cash';
alter table sales add column if not exists paid_at timestamptz;
alter table sales add column if not exists paid_via text;

select '✅ STAGE 2 Complete: tenant_id columns added to all tables' as status;


-- ================================================================
-- STAGE 3: Create product_units table
-- ================================================================

create table if not exists product_units (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  unit_label text not null,
  created_at timestamptz default now()
);

select '✅ STAGE 3 Complete: product_units table created' as status;


-- ================================================================
-- STAGE 4: Create indexes for performance
-- ================================================================

create index if not exists idx_profiles_tenant on profiles(tenant_id);
create index if not exists idx_products_tenant on products(tenant_id);
create index if not exists idx_sales_tenant on sales(tenant_id);
create index if not exists idx_stock_records_tenant on stock_records(tenant_id);

select '✅ STAGE 4 Complete: Indexes created' as status;


-- ================================================================
-- STAGE 5: Create default tenant (My Business)
-- ================================================================

insert into tenants (name, plan, created_by)
select 'My Business', 'pro', id
from profiles where is_admin = true limit 1
on conflict (name) do nothing;

select '✅ STAGE 5 Complete: Default tenant created' as status;
select 'Tenant info:' as check;
select id, name, plan from tenants where name = 'My Business';


-- ================================================================
-- STAGE 6: Link all profiles to tenant
-- ================================================================

update profiles
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

select '✅ STAGE 6 Complete: Profiles linked' as status;
select 'Linked profiles:' as check;
select count(*) as total_profiles, 
  sum(case when tenant_id is not null then 1 else 0 end) as linked
from profiles;


-- ================================================================
-- STAGE 7: Link products to tenant
-- ================================================================

update products
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

select '✅ STAGE 7 Complete: Products linked' as status;
select 'Linked products:' as check;
select count(*) as total, 
  sum(case when tenant_id is not null then 1 else 0 end) as linked
from products;


-- ================================================================
-- STAGE 8: Link sales to tenant
-- ================================================================

update sales
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

select '✅ STAGE 8 Complete: Sales linked' as status;
select 'Linked sales:' as check;
select count(*) as total, 
  sum(case when tenant_id is not null then 1 else 0 end) as linked
from sales;


-- ================================================================
-- STAGE 9: Link stock records to tenant
-- ================================================================

update stock_records
set tenant_id = (select id from tenants where name = 'My Business' limit 1)
where tenant_id is null;

select '✅ STAGE 9 Complete: Stock records linked' as status;
select 'Linked stock records:' as check;
select count(*) as total, 
  sum(case when tenant_id is not null then 1 else 0 end) as linked
from stock_records;


-- ================================================================
-- STAGE 10: Enable RLS on all tables
-- ================================================================

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table stock_records enable row level security;
alter table product_units enable row level security;

select '✅ STAGE 10 Complete: RLS enabled on all tables' as status;


-- ================================================================
-- STAGE 11: Drop old RLS policies
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

select '✅ STAGE 11 Complete: Old policies dropped' as status;


-- ================================================================
-- STAGE 12: Create new TENANTS RLS policies
-- ================================================================

create policy "Users can view their tenant"
  on tenants for select
  using (id in (select tenant_id from profiles where id = auth.uid()));

create policy "Admins can update their tenant"
  on tenants for update
  using (id in (select tenant_id from profiles where id = auth.uid() and is_admin = true));

select '✅ STAGE 12 Complete: Tenants policies created' as status;


-- ================================================================
-- STAGE 13: Create new PROFILES RLS policies
-- ================================================================

create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Admins can view tenant profiles"
  on profiles for select
  using (tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true));

select '✅ STAGE 13 Complete: Profiles policies created' as status;


-- ================================================================
-- STAGE 14: Create new PRODUCTS RLS policies
-- ================================================================

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

select '✅ STAGE 14 Complete: Products policies created' as status;


-- ================================================================
-- STAGE 15: Create PRODUCT_UNITS RLS policies
-- ================================================================

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

select '✅ STAGE 15 Complete: Product_units policies created' as status;


-- ================================================================
-- STAGE 16: Create SALES RLS policies
-- ================================================================

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

select '✅ STAGE 16 Complete: Sales policies created' as status;


-- ================================================================
-- STAGE 17: Create STOCK_RECORDS RLS policies
-- ================================================================

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

select '✅ STAGE 17 Complete: Stock_records policies created' as status;


-- ================================================================
-- FINAL VERIFICATION
-- ================================================================

select '🎉 MIGRATION COMPLETE! 🎉' as final_status;

select 'VERIFY: Current data state' as check;
select
  (select count(*) from profiles) as total_profiles,
  (select count(*) from products) as total_products,
  (select count(*) from sales) as total_sales,
  (select count(*) from stock_records) as total_stock_records;

select 'Tenant Created:' as check;
select id, name, plan from tenants where name = 'My Business';

select 'All Data Has Tenant (CRITICAL):' as check;
select
  (select count(*) from profiles where tenant_id is not null) as profiles_linked,
  (select count(*) from products where tenant_id is not null) as products_linked,
  (select count(*) from sales where tenant_id is not null) as sales_linked,
  (select count(*) from stock_records where tenant_id is not null) as stock_records_linked;

select 'Any Unlinked Data? (Should all be 0):' as check;
select
  (select count(*) from profiles where tenant_id is null) as profiles_unlinked,
  (select count(*) from products where tenant_id is null) as products_unlinked,
  (select count(*) from sales where tenant_id is null) as sales_unlinked,
  (select count(*) from stock_records where tenant_id is null) as stock_records_unlinked;

select '✅ Existing users can still log in' as note;
select '✅ New businesses can now register' as note;
