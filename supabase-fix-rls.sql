-- ================================================================
-- QUICK FIX: Simplify RLS Policies
-- The complex policies are causing 500 errors
-- This simplifies them to work immediately
-- ================================================================

-- STEP 1: Drop problematic policies
-- ================================================================
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Admins can view tenant profiles" on profiles;
drop policy if exists "Tenant members can view products" on products;
drop policy if exists "Admins can insert products" on products;
drop policy if exists "Admins can update products" on products;
drop policy if exists "Admins can delete products" on products;
drop policy if exists "Tenant members can view product_units" on product_units;
drop policy if exists "Admins can manage product_units" on product_units;
drop policy if exists "Users can view own sales" on sales;
drop policy if exists "Users can insert sales" on sales;
drop policy if exists "Users can update own sales" on sales;
drop policy if exists "Users can delete own sales" on sales;
drop policy if exists "Users can view stock records" on stock_records;
drop policy if exists "Users can insert stock records" on stock_records;
drop policy if exists "Users can delete stock records" on stock_records;

select '✅ Old policies dropped' as status;


-- STEP 2: Create SIMPLIFIED RLS Policies
-- ================================================================

-- PROFILES: Simple - user can only read own profile
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);


-- PRODUCTS: Allow authenticated users to view all (tenant filtering in app)
create policy "products_select_any"
  on products for select
  using (true);

create policy "products_insert_admin"
  on products for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "products_update_admin"
  on products for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "products_delete_admin"
  on products for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );


-- PRODUCT_UNITS: Allow authenticated users to view all
create policy "product_units_select_any"
  on product_units for select
  using (true);

create policy "product_units_admin_manage"
  on product_units for all
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );


-- SALES: Allow users to see their own sales + admins see all
create policy "sales_select_own_or_admin"
  on sales for select
  using (
    user_id = auth.uid() 
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "sales_insert_own"
  on sales for insert
  with check (user_id = auth.uid());

create policy "sales_update_own"
  on sales for update
  using (user_id = auth.uid());

create policy "sales_delete_own"
  on sales for delete
  using (user_id = auth.uid());


-- STOCK_RECORDS: Allow users to see their own + admins see all
create policy "stock_select_own_or_admin"
  on stock_records for select
  using (
    user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "stock_insert_own"
  on stock_records for insert
  with check (user_id = auth.uid());

create policy "stock_delete_own"
  on stock_records for delete
  using (user_id = auth.uid());

select '✅ Simplified RLS policies created' as status;

-- ================================================================
-- NOTE: Tenant isolation is now enforced in the APPLICATION LAYER
-- All queries must explicitly filter by tenant_id
-- No longer relying on complex RLS subqueries
-- ================================================================
