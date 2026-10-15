import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    let teamId: string | null = null
    const text = await req.text()
    if (text) {
      try {
        const body = JSON.parse(text)
        teamId = body.teamId
      } catch {
        teamId = text
      }
    }

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId' }, { status: 400 })
    }

    // Do not clear if banned
    await supabaseAdmin
      .from('teams')
      // @ts-expect-error: Next.js/Supabase inference bug
      .update({ current_locked_table: null } as any)
      .eq('id', teamId)
      .or('current_locked_table.is.null,current_locked_table.neq.BANNED')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
