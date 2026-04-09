import { supabase } from './supabase'

/**
 * Get current user's tenant_id
 * Must be called after user is authenticated
 */
export async function getCurrentTenant() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  return profile?.tenant_id
}

/**
 * Query products with proper tenant isolation
 */
export async function getProductsForTenant(tenantId: string) {
  return supabase
    .from('products')
    .select('id, name, product_units(id, unit_label, unit_price), is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name')
}

/**
 * Query sales for current user with tenant isolation
 */
export async function getSalesForUser(userId: string, tenantId: string) {
  return supabase
    .from('sales')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .order('sale_date', { ascending: false })
    .limit(300)
}

/**
 * Query stock records for current user with tenant isolation
 */
export async function getStockRecordsForUser(userId: string, tenantId: string) {
  return supabase
    .from('stock_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .order('stock_date', { ascending: false })
    .limit(30)
}

/**
 * Query profile with tenant info
 */
export async function getProfileWithTenant(userId: string) {
  return supabase
    .from('profiles')
    .select('id, email, is_admin, permissions, tenant_id')
    .eq('id', userId)
    .single()
}

/**
 * Insert sale with tenant_id
 */
export async function insertSale(saleData: any, tenantId: string, userId: string) {
  return supabase
    .from('sales')
    .insert({
      ...saleData,
      tenant_id: tenantId,
      user_id: userId,
    })
}

/**
 * Insert stock record with tenant_id
 */
export async function insertStockRecord(recordData: any, tenantId: string, userId: string) {
  return supabase
    .from('stock_records')
    .insert({
      ...recordData,
      tenant_id: tenantId,
      user_id: userId,
    })
}

/**
 * Get all sales for credit management (admin only) with tenant isolation
 */
export async function getCreditSalesForTenant(tenantId: string) {
  return supabase
    .from('sales')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('payment_method', 'credit')
    .is('paid_at', null)
    .order('sale_date', { ascending: false })
}
