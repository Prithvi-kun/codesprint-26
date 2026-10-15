import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Admin-only diagnostics: tells you whether the SERVER can actually write to Supabase.
// Never returns the key itself - only what kind of key it is.
function describeKey(key: string) {
    if (!key) return { present: false }
    if (key.startsWith('sb_secret_')) return { present: true, format: 'sb_secret (new secret key)', role: 'service_role' }
    if (key.startsWith('sb_publishable_')) return { present: true, format: 'sb_publishable (PUBLIC key!)', role: 'anon' }
    const parts = key.split('.')
    if (parts.length !== 3) return { present: true, format: 'unknown', role: 'unknown' }
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
        return { present: true, format: 'JWT', role: payload.role, ref: payload.ref }
    } catch {
        return { present: true, format: 'JWT (unreadable)', role: 'unknown' }
    }
}

export async function GET() {
    if (cookies().get('admin_session')?.value !== 'authenticated') {
        return NextResponse.json({ error: 'UNAUTHORIZED - log in at /admin first' }, { status: 401 })
    }

    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    const urlRef = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || null
    const keyInfo = describeKey(key)

    const problems: string[] = []
    if (!url) problems.push('NEXT_PUBLIC_SUPABASE_URL is missing on the server')
    if (!keyInfo.present) problems.push('SUPABASE_SERVICE_ROLE_KEY is missing on the server')
    if (keyInfo.present && keyInfo.role !== 'service_role') {
        problems.push(`SUPABASE_SERVICE_ROLE_KEY is a "${keyInfo.role}" key, not the service_role key - writes are silently blocked by RLS`)
    }
    if ('ref' in keyInfo && keyInfo.ref && urlRef && keyInfo.ref !== urlRef) {
        problems.push(`Key belongs to project "${keyInfo.ref}" but URL is project "${urlRef}"`)
    }

    // Real write test: rewrite event_control.is_paused with its current value and count affected rows
    let writeTest: string = 'skipped'
    if (url && key) {
        try {
            const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
            const { data: row, error: readErr } = await sb.from('event_control').select('id, is_paused').eq('id', 1).maybeSingle()
            if (readErr) writeTest = `read failed: ${readErr.message}`
            else if (!row) writeTest = 'read returned no row (event_control id=1 not visible - wrong key or missing row)'
            else {
                const { data: upd, error: updErr } = await sb
                    .from('event_control')
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .update({ is_paused: (row as any).is_paused } as any)
                    .eq('id', 1)
                    .select('id')
                if (updErr) writeTest = `write failed: ${updErr.message}`
                else if (!upd || upd.length === 0) writeTest = 'write affected 0 rows (blocked by RLS -> key is not service_role)'
                else writeTest = 'OK'
            }
        } catch (e) {
            writeTest = `exception: ${(e as Error).message}`
        }
        if (writeTest !== 'OK') problems.push(`Write test: ${writeTest}`)
    }

    return NextResponse.json({
        ok: problems.length === 0,
        problems,
        server: {
            urlRef,
            key: keyInfo,
            writeTest,
            vercelEnv: process.env.VERCEL_ENV || 'local',
            commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null
        }
    })
}
