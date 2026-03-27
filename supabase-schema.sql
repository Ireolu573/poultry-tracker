-- ============================================================
-- POULTRY TRACKER — Full Schema (run this fresh in SQL Editor)
-- ============================================================

-- 1. Profiles table (tracks admin status)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Products table
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  unit_label text not null default 'unit',
  unit_price numeric not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table products enable row level security;

create policy "Authenticated users can view products"
  on products for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert products"
  on products for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update products"
  on products for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete products"
  on products for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );


-- 3. Sales table
create table if not exists sales (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  item_name text not null,
  unit_label text not null default 'unit',
  quantity numeric not null,
  unit_price numeric not null,
  total_amount numeric generated always as (quantity * unit_price) stored,
  sale_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table sales enable row level security;

create policy "Users can view own sales"
  on sales for select using (auth.uid() = user_id);

create policy "Users can insert own sales"
  on sales for insert with check (auth.uid() = user_id);

create policy "Users can update own sales"
  on sales for update using (auth.uid() = user_id);

create policy "Users can delete own sales"
  on sales for delete using (auth.uid() = user_id);


-- 4. Seed default products
insert into products (name, unit_label, unit_price) values
  ('Live Broiler',       'bird',  3500),
  ('Live Layer',         'bird',  2500),
  ('Day-old Chick',      'bird',   450),
  ('Broiler Feed',       'bag',  12000),
  ('Layer Feed',         'bag',  11500),
  ('Chick Mash',         'bag',  11000),
  ('Newcastle Vaccine',  'pack',  2500),
  ('Gumboro Vaccine',    'pack',  2500),
  ('Antibiotics',        'pack',  1500),
  ('Vitamins',           'pack',   800),
  ('Egg Crate (30)',     'crate', 3000)
on conflict do nothing;


-- ============================================================
-- AFTER running this, make yourself admin:
--
--   update profiles set is_admin = true
--   where email = 'your-email@example.com';
--
-- Use the email you signed up with.
-- ============================================================
