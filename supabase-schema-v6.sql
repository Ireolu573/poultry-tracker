-- ============================================================
-- SALES MANAGER v6 — Multi-Tenant Migration
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Create tenants table
create table if not exists tenants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

alter table tenants enable row level security;

create policy "Users can view their own tenant"
  on tenants for select
  using (
    id in (select tenant_id from profiles where id = auth.uid())
  );

create policy "Admins can update their tenant"
  on tenants for update
  using (
    id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

-- 2. Add tenant_id to profiles
alter table profiles
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- 3. Add tenant_id to products
alter table products
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- 4. Add tenant_id to sales
alter table sales
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- 5. Add tenant_id to stock_records
alter table stock_records
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- 6. Add tenant_id to product_units (via product)
-- (product_units inherit tenant through product_id)

-- 7. Add tenant_id to company_settings
alter table company_settings
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- ============================================================
-- MIGRATE EXISTING DATA
-- This creates a tenant for your existing business and links
-- all existing data to it.
-- ============================================================

-- Create a tenant for existing data
with new_tenant as (
  insert into tenants (name) values ('My Business') returning id
),
-- Link existing admin profile to tenant
admin_profile as (
  select id from profiles where is_admin = true limit 1
)
update profiles
  set tenant_id = (select id from new_tenant)
  where id = (select id from admin_profile);

-- Link all existing products, sales, stock to same tenant
update products set tenant_id = (
  select tenant_id from profiles where is_admin = true limit 1
) where tenant_id is null;

update sales set tenant_id = (
  select tenant_id from profiles where is_admin = true limit 1
) where tenant_id is null;

update stock_records set tenant_id = (
  select tenant_id from profiles where is_admin = true limit 1
) where tenant_id is null;

update company_settings set tenant_id = (
  select tenant_id from profiles where is_admin = true limit 1
) where tenant_id is null;

-- ============================================================
-- UPDATE RLS POLICIES
-- ============================================================

-- Drop old policies and replace with tenant-scoped ones

-- Products
drop policy if exists "Authenticated users can view products" on products;
drop policy if exists "Admins can insert products" on products;
drop policy if exists "Admins can update products" on products;
drop policy if exists "Admins can delete products" on products;

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

-- Product units (inherit from product's tenant)
drop policy if exists "Authenticated users can view product units" on product_units;
drop policy if exists "Admins can insert product units" on product_units;
drop policy if exists "Admins can update product units" on product_units;
drop policy if exists "Admins can delete product units" on product_units;

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

-- Sales
drop policy if exists "Users can view own sales" on sales;
drop policy if exists "Users can insert own sales" on sales;
drop policy if exists "Users can update own sales" on sales;
drop policy if exists "Users can delete own sales" on sales;
drop policy if exists "Admins can view all sales" on sales;

create policy "Tenant members can view sales"
  on sales for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and (user_id = auth.uid() or exists (
      select 1 from profiles where id = auth.uid() and is_admin = true
    ))
  );

create policy "Tenant members can insert sales"
  on sales for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Tenant members can update own sales"
  on sales for update
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()) and user_id = auth.uid());

create policy "Tenant members can delete own sales"
  on sales for delete
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()) and user_id = auth.uid());

-- Stock records
drop policy if exists "Users can view own stock records" on stock_records;
drop policy if exists "Users can insert own stock records" on stock_records;
drop policy if exists "Users can delete own stock records" on stock_records;
drop policy if exists "Admins can view all stock records" on stock_records;

create policy "Tenant members can view stock records"
  on stock_records for select
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "Tenant members can insert stock records"
  on stock_records for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "Tenant members can delete stock records"
  on stock_records for delete
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()) and user_id = auth.uid());

-- Company settings
drop policy if exists "Anyone authenticated can read company settings" on company_settings;
drop policy if exists "Admins can upsert company settings" on company_settings;
drop policy if exists "Admins can update company settings" on company_settings;

create policy "Tenant members can read company settings"
  on company_settings for select
  using (tenant_id in (select tenant_id from profiles where id = auth.uid()));

create policy "Tenant admins can upsert company settings"
  on company_settings for insert
  with check (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Tenant admins can update company settings"
  on company_settings for update
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

-- Profiles — tenant members can see each other
drop policy if exists "Users can read own profile" on profiles;

create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Tenant admins can view all tenant profiles"
  on profiles for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Tenant admins can update tenant profiles"
  on profiles for update
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );
