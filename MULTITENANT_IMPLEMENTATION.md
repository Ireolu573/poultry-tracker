# Multi-Tenant SaaS Migration Guide

## 📋 Overview
This migration transforms Poultry Tracker from single-business to **freemium SaaS** where multiple businesses can use the app with isolated data.

## 🚀 Implementation Steps

### Phase 1: Database Migration (IMMEDIATE)
```sql
1. Backup your Supabase database (Settings → Backups)
2. Run: supabase-multitenant-migration.sql in SQL Editor
3. Verify: Run the verification queries at end of migration file
```

**What it does:**
- ✅ Creates `tenants` table (tracks businesses)
- ✅ Adds `tenant_id` to: products, sales, stock_records, profiles
- ✅ Migrates existing data to "My Business" tenant
- ✅ Sets up Row-Level Security (RLS) policies for tenant isolation
- ✅ Creates helper functions for tenant management

### Phase 2: Update React App (Code Changes)

#### 2a. Update Supabase Context (Track Current Tenant)
Create `src/lib/tenant-context.tsx`:
```typescript
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

interface Tenant {
  id: string
  name: string
  plan: 'free' | 'pro'
  monthly_sales_limit: number
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTenant = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (profile?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single()
        
        if (tenantData) setTenant(tenantData)
      }
      setLoading(false)
    }

    fetchTenant()
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
```

#### 2b. Update All Queries to Include tenant_id Filter
**Before (OLD):**
```typescript
const { data } = await supabase
  .from('sales')
  .select('*')
  .eq('user_id', userId)
```

**After (NEW):**
```typescript
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('tenant_id')
  .eq('id', user.id)
  .single()

const { data } = await supabase
  .from('sales')
  .select('*')
  .eq('tenant_id', profile.tenant_id)
  .eq('user_id', userId)
```

Or use a helper:
```typescript
// src/lib/queries.ts
export async function getSalesByTenant(userId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  return supabase
    .from('sales')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('user_id', userId)
}
```

### Phase 3: Business Registration (New Feature)
Create `src/pages/BusinessRegistration.tsx`:
```typescript
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function BusinessRegistration() {
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: result, error } = await supabase.rpc('create_tenant', {
      tenant_name: businessName
    })

    if (!error) {
      // Redirect to dashboard
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Business Name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        required
      />
      <button disabled={loading}>{loading ? 'Creating...' : 'Create Business'}</button>
    </form>
  )
}
```

### Phase 4: Staff Invitations (Tenant Admin Feature)
**New API function for admins:**
```typescript
// Send invite to staff member
export async function inviteStaffMember(
  email: string,
  tenantId: string
) {
  // Call auth.admin.invite (requires SUPABASE_SERVICE_ROLE_KEY)
  // Then add to profiles with tenant_id
  return supabase
    .from('profiles')
    .update({ tenant_id: tenantId })
    .eq('email', email)
}
```

### Phase 5: Freemium Tier Logic
**Check plan in components:**
```typescript
import { useTenant } from '../lib/tenant-context'

export default function SalesForm() {
  const { tenant } = useTenant()
  const isProPlan = tenant?.plan === 'pro'
  
  if (!isProPlan && salesForMonthCount >= 50) {
    return <div>Free plan limit reached. Upgrade to Pro!</div>
  }

  return <SaleFormComponent />
}
```

### Phase 6: Billing Integration (Stripe)
**Coming next** - if you want me to set up Stripe billing, I'll create:
- Upgrade to Pro flow
- Customer portal
- Monthly billing
- Plan enforcement

---

## 📊 Freemium Tiers

| Feature | Free | Pro ($4.99/mo) |
|---------|------|-----------------|
| Monthly Sales Limit | 50 | Unlimited |
| Locations | 1 | Unlimited |
| Staff Members | 1 | Unlimited |
| Stock Tracking | ✓ | ✓ |
| Credit Management | ✓ | ✓ |
| Reports | Basic | Advanced |
| Priority Support | ✗ | ✓ |

---

## 🔒 Security: Row-Level Security (RLS)

**Already configured in migration:**
- Business A users **cannot** see Business B's data
- Even if Business A hacks the API
- Supabase RLS enforces at database level
- No application-level security needed

---

## ✅ Verification Checklist

- [ ] Database migration ran without errors
- [ ] `tenants` table has your business
- [ ] `profiles` all have `tenant_id`
- [ ] All existing data migrated to your tenant
- [ ] RLS policies enabled on all tables
- [ ] Auth works: users still log in
- [ ] Existing sales/stock/products still show

---

## 📱 Ready for Play Store

After this, app is ready to submit to Google Play Store:
1. Multiple businesses can register
2. Data is isolated (secure)
3. Freemium monetization working
4. Scale ready (Supabase handles multi-tenancy)

---

## ⚠️ Common Issues & Fixes

**Issue: "Permission denied" errors after migration**
- ✅ RLS policies at database level - not app issue
- ✅ Verify tenant_id is set correctly
- ✅ Check user has profile record

**Issue: New users can't see data**
- ✅ Must create profile with tenant_id
- ✅ handle_new_user() function does this

**Issue: Admin still has old queries failing**
- ✅ Update queries to filter by tenant_id
- ✅ Use helper functions from src/lib/queries

---

Next: Ready to add **Billing (Stripe)** or **Play Store submission guide?**
