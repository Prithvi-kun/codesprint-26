'use server'
import { supabaseAdminRaw as supabaseAdmin } from '@/lib/supabase/server'
import { AVATAR_LIST } from '@/lib/avatars'

export type Winner = {
  place: 1 | 2 | 3
  teamNum: number | null
  name: string
  avatarSeed: string
  credits: number
  badges: number
}

// Public, read-only: returns ONLY the top three playing teams (test teams excluded).
export async function getTopThree(): Promise<{ winners: Winner[] } | { error: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('access_code, wallet_balance, stamps, avatar_id')
      .order('wallet_balance', { ascending: false })
      .limit(60)
    if (error) return { error: error.message }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((data || []) as any[])
      .map(t => {
        const av = AVATAR_LIST.find(a => a.code === t.access_code || a.id === t.avatar_id)
        const stamps = (t.stamps || {}) as Record<string, boolean>
        return {
          av,
          name: av?.name || String(t.access_code || 'UNKNOWN').replace(/_/g, ' '),
          teamNum: av?.teamNum ?? null,
          seed: av?.seed || String(t.access_code || 'team'),
          isTest: !!av?.isTest || /^TEST/i.test(String(t.access_code || '')),
          credits: Number(t.wallet_balance) || 0,
          badges: Object.values(stamps).filter(Boolean).length
        }
      })
      .filter(t => !t.isTest)
      // Highest credits first; badges break ties
      .sort((a, b) => b.credits - a.credits || b.badges - a.badges)
      .slice(0, 3)

    const winners: Winner[] = rows.map((t, i) => ({
      place: (i + 1) as 1 | 2 | 3,
      teamNum: t.teamNum,
      name: t.name,
      avatarSeed: t.seed,
      credits: t.credits,
      badges: t.badges
    }))
    return { winners }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
