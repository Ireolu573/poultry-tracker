# 🛡️ Safe Migration Script - Step-by-Step Guide

## ⚠️ Pre-Migration Checklist

- [ ] **Backup enabled** (Supabase → Settings → Backups → Enable automatic backups)
- [ ] **Time window** - Run during low-usage hours (your business won't be using app)
- [ ] **Browser ready** - One tab with Supabase dashboard
- [ ] **SQL file ready** - `supabase-safe-migration.sql` open in text editor

---

## 🚀 How to Run the Migration

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click your project
3. Left sidebar → **SQL Editor**
4. Click **"New Query"**

### Step 2: Copy & Paste the Script
1. Open file: `supabase-safe-migration.sql`
2. **Select all** (Ctrl+A)
3. **Copy** (Ctrl+C)
4. Go to Supabase SQL Editor
5. **Paste** (Ctrl+V) into the query box

### Step 3: Execute the Script
1. Click **"Run"** button (or Ctrl+Enter)
2. **Wait** for completion (takes 10-30 seconds)
3. Watch the output scroll down

---

## 📊 What You'll See

The output will show 5 steps:

### ✅ STEP 1: Checking current data
```
✅ Data counts BEFORE migration:
profile_count    | 3
product_count    | 11
sales_count      | 145
stock_count      | 67
user_count       | 3
```
**This is your safety backup - counts shouldn't change**

### ✅ STEP 2: Running multi-tenant migration
```
✅ Schema changes completed...
✅ Profiles linked to tenant...
✅ Products linked to tenant...
✅ Sales linked to tenant...
✅ Stock records linked to tenant...
```

### ✅ STEP 3: Migrating existing data
```
✅ All staff profiles linked to tenant...
```

### ✅ STEP 4: Setting up RLS
```
✅ RLS policies created...
```

### ✅ STEP 5: Verifying migration
```
✓ Tenant Created:
id                               | name        | plan
[uuid]                           | My Business | pro

✓ Profiles Linked to Tenant:
linked_profiles | unlinked_profiles
3               | 0

✓ Data Linked to Tenant:
products_linked | products_unlinked | sales_linked | sales_unlinked
11              | 0                 | 145          | 0

✓ Data Count Verification:
profiles_before | profiles_after | products_before | products_after
3               | 3              | 11              | 11

🎉 MIGRATION COMPLETE!
✅ All data migrated safely
✅ Existing users can still log in
✅ New businesses can now register
```

---

## ✅ How to Know It Worked

### Check 1: No Error Messages
- ❌ Red text = Something went wrong (screenshot error and tell me)
- ✅ Green checkmarks = Success

### Check 2: Data Counts Match
- Before count = After count ✅
- If different = Problem (tell me)

### Check 3: All Profiles Linked
```
linked_profiles: 3 (or your number)
unlinked_profiles: 0 ← **Must be 0**
```

### Check 4: RLS Policies Created
- Should show many "✅ RLS policies created"

---

## 🧪 Test After Migration

**Ask your existing user to:**
1. Log in to the app
2. Go to Sales page
3. Check if their sales still appear
4. Try submitting a new sale

**Expected results:**
- ✅ Login works
- ✅ Old data visible
- ✅ Can add new sales
- ✅ No "Permission denied" errors

---

## ⚠️ If Something Goes Wrong

### Red Error in Output
1. **Copy the error message**
2. **Tell me the exact text**
3. **Do NOT run migration again**

### User Gets "Permission Denied"
1. This means RLS policy issue
2. Run this query to check:
```sql
select id, email, tenant_id from profiles where email = 'user@email.com';
```
3. If `tenant_id` is NULL → problem (tell me)

### Data Disappeared
1. **Don't panic** - it's still there, RLS is hiding it
2. Check if tenant_id was set:
```sql
select count(*) from sales where tenant_id is not null;
```
3. If 0 → problem (tell me)

### "Already Exists" Errors
- ✅ **Normal** - means parts of schema already existed
- ✅ Safe to ignore - script handles it

---

## 📝 Safety Features of This Script

✅ **Idempotent** - Safe to run multiple times  
✅ **Automatic backups** - Data never deleted, only linked  
✅ **Verification built-in** - Shows you exact results  
✅ **Error detection** - If something fails, you'll see it  
✅ **Rollback possible** - Data never corrupted  

---

## 🎯 After Migration Succeeds

1. ✅ Ask existing user to test
2. ✅ Deploy code changes to app (when ready)
3. ✅ Build business registration page
4. ✅ Submit to Google Play Store

---

## 📞 Troubleshooting

| Error | Fix |
|-------|-----|
| `relation does not exist` | Ignore - schema being created |
| `function already exists` | Ignore - functions being updated |
| `policy already exists` | Ignore - script handles this |
| `field does not exist` | Problem - tell me exact error |
| 0 count for products/sales | Problem - data not migrated |

---

**Ready? Run the script and let me know the results! 🚀**
