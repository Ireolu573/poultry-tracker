-- ================================================================
-- FIX: Add missing tenant insert policy for Google OAuth signup
-- Run this in Supabase SQL Editor to fix the RLS error
-- ================================================================

-- Drop any existing tenant insert policy
drop policy if exists "tenants_insert_own" on tenants;

-- Add the missing INSERT policy for tenants table
-- This allows authenticated users to create tenants
create policy "tenants_insert_own"
  on tenants for insert
  with check (auth.uid() is not null);

-- Also ensure profiles can be inserted for new users
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

select '✅ Tenant insert policy added - Google OAuth signup should now work' as status;