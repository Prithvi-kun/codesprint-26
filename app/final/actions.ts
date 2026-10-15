'use server'
import { supabaseAdminRaw as supabaseAdmin } from '@/lib/supabase/server'
import { AVATAR_LIST } from '@/lib/avatars'

export type ScoreRow = {
  rank: number
  teamNum: number | null
  name: string
  credits: number
  badges: number
}

export type Winner = {
  place: 1 | 2 | 3
  teamNum: number | null
  name: string
  avatarSeed: string
  credits: number
  badges: number
}

// Public, read-only: returns the CURRENTLY LOGGED-IN playing teams ranked by credits
// (badge count breaks ties) - top three as winners plus the full final scoreboard.
export async function getTopThree(): Promise<{ winners: Winner[]; scoreboard: ScoreRow[] } | { error: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('access_code, wallet_balance, stamps, avatar_id, is_logged_in')
      .eq('is_logged_in', true)
      .order('wallet_balance', { ascending: false })
      .limit(200)
    if (error) return { error: error.message }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ranked = ((data || []) as any[])
      .map(t => {
        const av = AVATAR_LIST.find(a => a.code === t.access_code || a.id === t.avatar_id)
        const stamps = (t.stamps || {}) as Record<string, boolean>
        return {
          name: av?.name || String(t.access_code || 'UNKNOWN').replace(/_/g, ' '),
          teamNum: av?.teamNum ?? null,
          seed: av?.seed || String(t.access_code || 'team'),
          isTest: !!av?.isTest || /^TEST/i.test(String(t.access_code || '')),
          credits: Number(t.wallet_balance) || 0,
          badges: Object.values(stamps).filter(Boolean).length
        }
      })
      .filter(t => !t.isTest)
      // Highest credits first; if credits are equal, more badges wins
      .sort((a, b) => b.credits - a.credits || b.badges - a.badges)

    const winners: Winner[] = ranked.slice(0, 3).map((t, i) => ({
      place: (i + 1) as 1 | 2 | 3,
      teamNum: t.teamNum,
      name: t.name,
      avatarSeed: t.seed,
      credits: t.credits,
      badges: t.badges
    }))
    const scoreboard: ScoreRow[] = ranked.map((t, i) => ({
      rank: i + 1,
      teamNum: t.teamNum,
      name: t.name,
      credits: t.credits,
      badges: t.badges
    }))
    return { winners, scoreboard }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
