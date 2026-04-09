-- ================================================================
-- POULTRY TRACKER — Multi-Tenant Migration (v7)
-- Freemium SaaS Ready
-- 
-- Run this ONCE in Supabase SQL Editor after backing up existing data
-- This adds business/tenant isolation to all tables
-- ================================================================

-- Step 1: Create Tenants Table
-- ================================================================
create table if not exists tenants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  plan text default 'free',  -- free | pro
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


-- Step 2: Add tenant_id to Profiles
-- ================================================================
alter table profiles
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- Index for performance
create index if not exists idx_profiles_tenant_id on profiles(tenant_id);


-- Step 3: Add tenant_id to Products
-- ================================================================
alter table products
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- Index for performance
create index if not exists idx_products_tenant_id on products(tenant_id);

-- Drop old policies (they will be replaced)
drop policy if exists "Authenticated users can view products" on products;
drop policy if exists "Admins can insert products" on products;
drop policy if exists "Admins can update products" on products;
drop policy if exists "Admins can delete products" on products;


-- Step 4: Add tenant_id to Product Units (if exists)
-- ================================================================
create table if not exists product_units (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  unit_label text not null,
  created_at timestamptz default now()
);

alter table product_units enable row level security;

create index if not exists idx_product_units_product_id on product_units(product_id);


-- Step 5: Add tenant_id to Sales
-- ================================================================
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

-- Index for performance
create index if not exists idx_sales_tenant_id on sales(tenant_id);
create index if not exists idx_sales_user_id on sales(user_id);
create index if not exists idx_sales_payment_method on sales(payment_method);

-- Drop old policies
drop policy if exists "Users can view own sales" on sales;
drop policy if exists "Users can insert own sales" on sales;
drop policy if exists "Users can update own sales" on sales;
drop policy if exists "Users can delete own sales" on sales;


-- Step 6: Create Stock Records Table (if doesn't exist)
-- ================================================================
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

-- Index for performance
create index if not exists idx_stock_records_tenant_id on stock_records(tenant_id);
create index if not exists idx_stock_records_user_id on stock_records(user_id);


-- ================================================================
-- MIGRATE EXISTING DATA
-- This creates a default tenant for your existing business
-- and links all existing data to it
-- ================================================================

-- Get the first admin user
with admin_user as (
  select id from profiles where is_admin = true limit 1
),
-- Create default tenant
new_tenant as (
  insert into tenants (name, plan, created_by)
  values (
    'My Business',
    'pro',  -- start with pro plan
    (select id from admin_user)
  )
  on conflict do nothing
  returning id
),
-- If it already exists, get it
existing_tenant as (
  select coalesce(
    (select id from new_tenant),
    (select tenant_id from profiles where is_admin = true limit 1)
  ) as id
)
-- Link admin profile to tenant
update profiles
  set tenant_id = (select id from existing_tenant)
  where id = (select id from admin_user)
  and tenant_id is null;

-- Get the tenant ID we just created/found
with tenant_id_query as (
  select id from tenants where name = 'My Business' limit 1
),
-- Link all existing products to tenant
link_products as (
  update products
    set tenant_id = (select id from tenant_id_query)
    where tenant_id is null
),
-- Link all existing sales to tenant
link_sales as (
  update sales
    set tenant_id = (select id from tenant_id_query)
    where tenant_id is null
),
-- Link all existing stock records to tenant
link_stock as (
  update stock_records
    set tenant_id = (select id from tenant_id_query)
    where tenant_id is null
)
-- Link all staff profiles to tenant
update profiles
  set tenant_id = (select id from tenant_id_query)
  where tenant_id is null;


-- ================================================================
-- NEW RLS POLICIES - TENANT SCOPED
-- ================================================================

-- PROFILES: Users can only see their own or tenant mates (if admin)
-- ================================================================
drop policy if exists "Users can read own profile" on profiles;

create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Admins can view all tenant profiles"
  on profiles for select
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update tenant profiles"
  on profiles for update
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );


-- TENANTS: Admins can view/update their own
-- ================================================================
create policy "Admins can view own tenant details"
  on tenants for select
  using (
    exists (
      select 1 from profiles
      where auth.uid() = id
      and is_admin = true
      and tenant_id = tenants.id
    )
  );


-- PRODUCTS: Tenant members view, admins manage
-- ================================================================
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


-- PRODUCT_UNITS: Inherit from product's tenant
-- ================================================================
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


-- SALES: Tenant members see their own, admins see all tenant sales
-- ================================================================
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

create policy "Tenant admins can update any tenant sale"
  on sales for update
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Tenant members can delete own sales"
  on sales for delete
  using (
    tenant_id in (select tenant_id from profiles where id = auth.uid())
    and user_id = auth.uid()
  );


-- STOCK_RECORDS: Tenant members see their own, admins see all
-- ================================================================
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
-- HELPER FUNCTIONS
-- ================================================================

-- Auto-assign tenant when new user joins an existing tenant
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_tenant_id uuid;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  
  -- If there's already a tenant, assign to it (for staff invites)
  -- Otherwise, a tenant will be created during business registration
  return new;
end;
$$ language plpgsql security definer;


-- Function to create a new tenant (called during business signup)
create or replace function public.create_tenant(
  tenant_name text
)
returns uuid as $$
declare
  new_tenant_id uuid;
begin
  insert into public.tenants (name, plan, created_by)
  values (tenant_name, 'free', auth.uid())
  returning id into new_tenant_id;
  
  -- Assign current user to tenant as admin
  update public.profiles
  set tenant_id = new_tenant_id, is_admin = true
  where id = auth.uid();
  
  return new_tenant_id;
end;
$$ language plpgsql security definer;


-- ================================================================
-- VERIFY MIGRATION
-- ================================================================
-- Run these queries to verify:
--
-- Check tenants table:
--   select * from tenants;
--
-- Check profiles have tenant_id:
--   select id, email, is_admin, tenant_id from profiles;
--
-- Check products have tenant_id:
--   select id, name, tenant_id from products limit 5;
--
-- Check sales have tenant_id:
--   select id, item_name, tenant_id from sales limit 5;
--
-- ================================================================
