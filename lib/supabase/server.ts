import { createClient } from '@supabase/supabase-js'
import { Database } from './types'
import fs from 'fs'
import path from 'path'

function getEnvVar(key: string): string {
  // Always check process.env first (set by Next.js when .env.local is loaded correctly)
  if (process.env[key]) return process.env[key]!

  // Fallback: read .env.local directly from disk (handles stale module cache)
  try {
    const cwd = process.cwd()
    for (const file of ['.env.local', '.env']) {
      const p = path.join(cwd, file)
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8')
        const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
        if (match) {
          let val = match[1].trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          // Populate process.env so subsequent calls are instant
          process.env[key] = val
          return val
        }
      }
    }
  } catch (err) {
    console.error(`Failed to read env file for ${key}:`, err)
  }
  return ''
}

/**
 * Lazily creates a Supabase admin client using the service role key.
 * Using a getter ensures the env vars are always read fresh — even if this
 * module was first evaluated before Next.js had loaded .env.local.
 */
function makeAdminClient() {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const key = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !key) {
    console.error('[supabase/server] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

function makeAdminClientRaw() {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const key = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

function lazyClient<T extends object>(factory: () => T): T {
  let instance: T | null = null
  let hadKey = false
  return new Proxy({} as T, {
    get(_t, prop) {
      const keyNow = !!getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
      if (!instance || (keyNow && !hadKey)) {
        instance = factory()
        hadKey = keyNow
      }
      const value = (instance as any)[prop]
      return typeof value === 'function' ? value.bind(instance) : value
    }
  })
}

// Typed admin client (created lazily on first use)
export const supabaseAdmin = lazyClient(makeAdminClient)

// Untyped admin client for flexible admin operations
export const supabaseAdminRaw = lazyClient(makeAdminClientRaw)