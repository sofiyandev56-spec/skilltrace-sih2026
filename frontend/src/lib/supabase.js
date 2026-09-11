/**
 * Supabase JS client — single initialised singleton.
 * All credentials come from env so nothing leaks in source or network tabs.
 */
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || ''

const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: false,    // we manage our own session
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-client-info': 'skilltrace/1.0',
    },
  },
})

/* ── helpers ─────────────────────────────────────────────────────────── */

/**
 * Fetch all rows from admin_users, sorted newest first.
 * Falls back to [] on any error so callers never crash.
 */
export async function sbGetAdminUsers() {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

/**
 * Upsert a user record (keyed on email).
 * Returns the upserted row or null.
 */
export async function sbUpsertAdminUser(user) {
  if (!user?.email) return null
  const row = {
    id:           user.id           || `GGL-${Date.now()}`,
    name:         user.name         || null,
    email:        user.email.trim().toLowerCase(),
    role:         user.role         || 'client',
    verified:     Boolean(user.verified),
    is_master:    Boolean(user.is_master),
    company_name: user.company_name || null,
    designation:  user.designation  || null,
    last_login:   user.last_login   || new Date().toISOString(),
  }
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .upsert(row, { onConflict: 'email' })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

/**
 * Remove a user by id.
 */
export async function sbDeleteAdminUser(id) {
  try {
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id)
    if (error) throw error
    return true
  } catch {
    return false
  }
}

/**
 * Look up a single user by email.
 */
export async function sbGetUserByEmail(email) {
  try {
    const clean = (email || '').trim().toLowerCase()
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', clean)
      .maybeSingle()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

/**
 * Persist a WhatsApp session keyed by phone number.
 */
export async function sbSaveWhatsAppSession(phone, sessionData) {
  try {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .upsert({ phone, session_data: sessionData, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
    if (error) throw error
    return true
  } catch {
    return false
  }
}

/**
 * Load a WhatsApp session by phone.
 */
export async function sbGetWhatsAppSession(phone) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('session_data')
      .eq('phone', phone)
      .maybeSingle()
    if (error) throw error
    return data?.session_data || null
  } catch {
    return null
  }
}

/**
 * Insert a check-in record.
 */
export async function sbPostCheckin(traineeId, source, payload) {
  try {
    const { data, error } = await supabase
      .from('checkins')
      .insert({
        trainee_id: traineeId,
        date: new Date().toISOString().split('T')[0],
        source,
        payload,
      })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

/**
 * Fetch a trainee by id.
 */
export async function sbGetTrainee(id) {
  try {
    const { data, error } = await supabase
      .from('trainees')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

/**
 * Upsert a trainee record.
 */
export async function sbUpsertTrainee(trainee) {
  try {
    const { data, error } = await supabase
      .from('trainees')
      .upsert(trainee, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

/**
 * Upsert an event record.
 */
export async function sbUpsertEvent(event) {
  try {
    const { data, error } = await supabase
      .from('events')
      .upsert(event, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

/**
 * Grant or update a consent record.
 */
export async function sbGrantConsent(traineeId, purpose) {
  try {
    const { data, error } = await supabase
      .from('consents')
      .upsert(
        {
          trainee_id: traineeId,
          purpose,
          granted: true,
          date: new Date().toISOString().split('T')[0],
        },
        { onConflict: 'id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return null
  }
}

export default supabase
