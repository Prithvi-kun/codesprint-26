'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import CodeEditor from '@/components/CodeEditor'
import { supabase } from '@/lib/supabase/client'
import LogoutButton from '@/components/LogoutButton'

// ─── LeetCode-style difficulty badge ──────────────────────────────────────────
function DiffBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

// ─── Coin Rain ─────────────────────────────────────────────────────────────────
function CoinRain() {
  const coins = useMemo(() =>
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      emoji: ['🪙', '💰', '⭐', '🏆'][Math.floor(Math.random() * 4)],
    })), [])
  return (
    <div className="fixed inset-0 z-[140] pointer-events-none overflow-hidden">
      {coins.map(c => (
        <span key={c.id} className="coin-particle" style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}>
          {c.emoji}
        </span>
      ))}
    </div>
  )
}

// ─── Tab types ─────────────────────────────────────────────────────────────────
type Tab = 'description' | 'testcases' | 'output'

export default function FinalRoundPage() {
  const router = useRouter()

  // ── Auth & Team ─────────────────────────────────────────────────────────────
  const [teamId, setTeamId]         = useState<string | null>(null)
  const [teamCode, setTeamCode]     = useState<string>('')
  const [wallet, setWallet]         = useState<number | null>(null)
  const [rank, setRank]             = useState<number | null>(null)

  // ── Game State ───────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<'LOADING' | 'BLOCKED' | 'BETTING' | 'WAITING' | 'GAME'>('LOADING')
  const [tableStatus, setTableStatus] = useState<string>('WAITING')
  const [isPaused, setIsPaused]     = useState(false)
  const [roundStartTime, setRoundStartTime] = useState<string | null>(null)
  const [actualPin, setActualPin]   = useState<string | null>(null)
  const [enteredPin, setEnteredPin] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [timeLeft, setTimeLeft]     = useState('--:--')
  const [isTimerUrgent, setIsTimerUrgent] = useState(false)

  // ── Question ─────────────────────────────────────────────────────────────────
  const [question, setQuestion]     = useState<{
    id?: string
    description: string
    starter: string
    test_cases?: any[]
    expected_output?: string
    constraints?: string
  } | null>(null)

  // ── Editor & Output ──────────────────────────────────────────────────────────
  const [code, setCode]             = useState('')
  const [language, setLanguage]     = useState('python')
  const [output, setOutput]         = useState('')
  const [isRunning, setIsRunning]   = useState(false)
  const [hasError, setHasError]     = useState(false)
  const [showBust, setShowBust]     = useState(false)

  // ── Spin Wheel (now embedded in betting phase) ───────────────────────────────
  const [spinState, setSpinState]   = useState<'IDLE' | 'SPINNING' | 'DONE'>('IDLE')
  const [spinRotation, setSpinRotation] = useState(0)
  const [wheelMultiplier, setWheelMultiplier] = useState(0)
  const [isBetting, setIsBetting]   = useState(false)
  const [betAmount, setBetAmount]   = useState<number | ''>('')

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [showSuccess, setShowSuccess] = useState(false)
  const [showBetConfirm, setShowBetConfirm] = useState(false)
  const [rewardClaimed, setRewardClaimed] = useState(false)

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<Tab>('description')
  const [broadcast, setBroadcast]   = useState<string | null>(null)
  const [isWarning, setIsWarning]   = useState(false)

  // ── SPIN WHEEL CONFIG ────────────────────────────────────────────────────────
  const MULTIPLIERS = [1, 1.25, 1.5, 1, 1.75, 1, 2, 1]
  const SLICE_ANGLE = 360 / MULTIPLIERS.length

  // ─────────────────────────────────────────────────────────────────────────────
  // INIT: Load team data and check eligibility
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { getTeamId } = await import('@/app/actions')
      const tid = await getTeamId()
      if (!tid) { router.push('/'); return }
      setTeamId(tid)

      // Fetch team data including stamps for badge check
      const { data: team } = await supabase
        .from('teams')
        .select('wallet_balance, access_code, stamps, current_locked_table, is_logged_in')
        .eq('id', tid)
        .maybeSingle()

      const teamData = team as any
      if (!teamData) { router.push('/'); return }

      setWallet(teamData.wallet_balance)
      setTeamCode(teamData.access_code)

      // Check if banned
      if (teamData.current_locked_table === 'BANNED') {
        alert('YOU ARE BANNED.')
        router.push('/')
        return
      }

      // Check badge requirement (all 10 badges)
      const stamps = teamData.stamps || {}
      const badgeCount = Object.values(stamps).filter(Boolean).length
      if (badgeCount < 10) {
        setPhase('BLOCKED')
        return
      }

      // Rank is informational only - there is NO Top-6 cut-off: anyone with all 10 badges may enter
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, wallet_balance')
        .order('wallet_balance', { ascending: false })

      if (allTeams) {
        setRank(allTeams.findIndex((t: any) => t.id === tid) + 1)
      }

      // Check game state
      const [eventRes, gameStateRes] = await Promise.all([
        supabase.from('event_control').select('is_paused, table_timers').eq('id', 1).maybeSingle(),
        supabase.from('game_state').select('*').eq('game_id', 'final').maybeSingle()
      ])
      const eventData = eventRes.data as any
      const gsData    = gameStateRes.data as any

      if (eventData) {
        setIsPaused(eventData.is_paused)
        const timers = eventData.table_timers || {}
        const pin = gsData?.entry_pin || timers['final_pin'] || null
        setActualPin(pin)
        const rTime = timers['final'] || null
        setRoundStartTime(rTime)
        const tStatus = timers['final_status'] || (gsData?.is_active ? 'ACTIVE' : 'WAITING')
        setTableStatus(tStatus)

        if (timers['final_pin'] && localStorage.getItem('cs_unlocked_final') === timers['final_pin']) {
          setIsUnlocked(true)
        }
      }

      // If already locked to this table
      if (teamData.current_locked_table === 'final') {
        setPhase('WAITING')
      } else if (teamData.current_locked_table === 'WIN_FINAL') {
        setShowSuccess(true)
        setPhase('GAME')
      } else {
        // Need to bet first
        setBetAmount(Math.min(500, teamData.wallet_balance))
        setPhase('BETTING')
      }
    }
    init()
  }, [router])

  // ─────────────────────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return

    const eventCh = supabase.channel('final_event')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_control', filter: 'id=eq.1' }, (payload) => {
        const rec = payload.new as any
        setIsPaused(rec.is_paused)
        const timers = rec.table_timers || {}
        setRoundStartTime(timers['final'] || null)
        const ts = timers['final_status']
        if (ts) setTableStatus(ts)
        const pin = timers['final_pin']
        if (pin) setActualPin(pin)
        if (rec.current_round?.startsWith('BROADCAST:')) setBroadcast(rec.current_round.replace('BROADCAST:', ''))
        else setBroadcast(null)
      })
      .subscribe()

    const gsCh = supabase.channel('final_gamestate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: 'game_id=eq.final' }, (payload) => {
        const rec = payload.new as any
        if (rec?.entry_pin !== undefined) setActualPin(rec.entry_pin)
        if (rec?.is_active !== undefined) setTableStatus(rec.is_active ? 'ACTIVE' : 'WAITING')
      })
      .subscribe()

    const teamCh = supabase.channel('final_team')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, (payload) => {
        const rec = payload.new as any
        setWallet(rec.wallet_balance)
        if (rec.current_locked_table === 'WARNING') { setIsWarning(true); setTimeout(() => setIsWarning(false), 2000) }
        else if (rec.current_locked_table === 'WIN_FINAL') setShowSuccess(true)
        else if (rec.current_locked_table === 'BANNED') { alert('BANNED'); router.push('/') }
      })
      .subscribe()

    const poll = setInterval(async () => {
      const [evRes, gsRes, tmRes] = await Promise.all([
        supabase.from('event_control').select('is_paused, table_timers, current_round').eq('id', 1).maybeSingle(),
        supabase.from('game_state').select('*').eq('game_id', 'final').maybeSingle(),
        supabase.from('teams').select('wallet_balance, current_locked_table').eq('id', teamId).maybeSingle()
      ])
      const ev = evRes.data as any; const gs = gsRes.data as any; const tm = tmRes.data as any
      if (ev) {
        setIsPaused(ev.is_paused)
        const t = ev.table_timers || {}
        setRoundStartTime(t['final'] || null)
        const ts = t['final_status'] || (gs?.is_active ? 'ACTIVE' : 'WAITING')
        setTableStatus(ts)
        const pin = gs?.entry_pin || t['final_pin'] || null
        if (pin) setActualPin(pin)
        if (ev.current_round?.startsWith('BROADCAST:')) setBroadcast(ev.current_round.replace('BROADCAST:', ''))
        else setBroadcast(null)
      }
      if (tm) {
        setWallet(tm.wallet_balance)
        if (tm.current_locked_table === 'WIN_FINAL') setShowSuccess(true)
      }
    }, 5000)

    return () => {
      supabase.removeChannel(eventCh)
      supabase.removeChannel(gsCh)
      supabase.removeChannel(teamCh)
      clearInterval(poll)
    }
  }, [teamId, router])

  // ─────────────────────────────────────────────────────────────────────────────
  // WAITING → GAME transition
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'WAITING' && tableStatus === 'ACTIVE' && roundStartTime) {
      setPhase('GAME')
    }
  }, [phase, tableStatus, roundStartTime])

  // ─────────────────────────────────────────────────────────────────────────────
  // DYNAMIC QUESTION LOADER
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'GAME' || question) return
    async function load() {
      const { fetchQuestionData } = await import('@/app/actions')
      const res = await fetchQuestionData('final', 'STANDARD')
      if (res.success && res.question) {
        setQuestion({
          id: res.question.id,
          description: res.question.content || 'Solve the problem.',
          starter: res.question.starter_code || '# Write your solution here\n',
          test_cases: res.question.test_cases,
          expected_output: res.question.expected_output || undefined,
        })
        setCode(res.question.starter_code || '# Write your solution here\n')
      } else {
        setQuestion({ description: '⚠️ No active question found. Contact the Pit Boss.', starter: '# Error: no question loaded\n' })
      }
    }
    load()
  }, [phase, question])

  // ─────────────────────────────────────────────────────────────────────────────
  // COUNTDOWN TIMER
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'GAME' || !roundStartTime || isPaused || tableStatus === 'PAUSED') return
    const iv = setInterval(() => {
      const start = new Date(roundStartTime).getTime()
      const end   = start + 45 * 60000
      const now   = Date.now()
      const diff  = end - now
      if (diff <= 0) {
        setTimeLeft('00:00')
        clearInterval(iv)
        alert('⏰ TIME OUT! The round has ended.')
        if (teamId) import('@/app/actions').then(({ unlockPlayer }) => unlockPlayer(teamId))
        router.push('/map')
      } else {
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
        setIsTimerUrgent(m < 2)
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [phase, roundStartTime, isPaused, tableStatus, router, teamId])

  // ─────────────────────────────────────────────────────────────────────────────
  // REWARD CLAIM
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showSuccess || rewardClaimed || !teamId) return
    setRewardClaimed(true)
    const baseWager = typeof betAmount === 'number' && betAmount >= 500 ? betAmount : 500
    const mult = wheelMultiplier > 0 ? wheelMultiplier : 1
    const payout = Math.floor(baseWager * 2 * mult)
    import('@/app/actions').then(({ claimAutomatedReward }) =>
      claimAutomatedReward(teamId, payout, 'final')
        .then(res => { if (res.success && res.newBalance !== undefined) setWallet(res.newBalance) })
    )
  }, [showSuccess, rewardClaimed, teamId, wheelMultiplier, betAmount])

  // ─────────────────────────────────────────────────────────────────────────────
  // SPIN WHEEL HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSpin = async () => {
    if (spinState !== 'IDLE' || !teamId) return
    setSpinState('SPINNING')
    const { spinWheel } = await import('@/app/actions')
    const res = await spinWheel(teamId, 'final')
    if (res.error) { alert(res.error); setSpinState('IDLE'); return }
    const winIdx = Math.floor(Math.random() * MULTIPLIERS.length)
    const mult   = MULTIPLIERS[winIdx]
    const finalRot = spinRotation + 5 * 360 + (360 - (winIdx * SLICE_ANGLE + SLICE_ANGLE / 2)) + (Math.random() - 0.5) * SLICE_ANGLE * 0.8
    setSpinRotation(finalRot)
    setTimeout(() => {
      setSpinState('DONE')
      setWheelMultiplier(mult)
      if (res.newBalance !== undefined) setWallet(res.newBalance)
    }, 4000)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BET HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBet = async () => {
    const bet = Number(betAmount)
    if (!teamId || isNaN(bet) || bet < 500) { alert('Minimum bet is 500 credits.'); return }
    if (wallet !== null && bet > wallet) { alert('Insufficient funds.'); return }
    if (tableStatus !== 'ACTIVE') { alert('Table is not open yet. Wait for the Pit Boss.'); return }
    setIsBetting(true)
    const { submitFinalBet } = await import('@/app/actions')
    const res = await submitFinalBet(teamId, bet)
    if (res?.error) {
      alert(res.error)
      setIsBetting(false)
      return
    }
    if (res?.newBalance !== undefined) {
      setWallet(res.newBalance)
    }
    setPhase('WAITING')
    setIsBetting(false)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CODE SUBMIT / RUN
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (isSubmit = true) => {
    setIsRunning(true)
    setHasError(false)
    setOutput('⚙️ Executing...')
    setActiveTab('output')

    try {
      const worker = new Worker('/pythonWorker.js')
      const timeout = new Promise<{ error: string }>(r => setTimeout(() => r({ error: 'Execution timed out (2 min).' }), 120000))
      const exec    = new Promise<any>(r => { worker.onmessage = e => r(e.data); worker.onerror = e => r({ error: e.message }) })
      // Run the public test cases against the function the player defined
      const testCases = (question?.test_cases || []).map((tc: any) => ({ input: tc.input, expected: tc.expected }))
      const fnMatch = code.match(/def\s+([a-zA-Z0-9_]+)/) || (question?.starter || '').match(/def\s+([a-zA-Z0-9_]+)/)
      worker.postMessage({ code, testCases, functionName: fnMatch ? fnMatch[1] : undefined })
      const result: any = await Promise.race([exec, timeout])
      worker.terminate()

      if (result.error) {
        setOutput(`❌ ERROR:\n${result.error}`)
        setHasError(true)
        setShowBust(true)
        setTimeout(() => setShowBust(false), 500)
      } else {
        const stdout = result.stdout || ''
        const stderr = result.stderr ? `\n[STDERR]:\n${result.stderr}` : ''
        let display  = ''
        if (stdout.trim()) display += `> OUTPUT:\n${stdout}${stderr}\n\n`
        else if (result.stderr) display += `${stderr}\n\n`

        if (result.testResults && result.testResults.length > 0) {
          display += '══════════════════════════════\n🧪 TEST CASE RESULTS:\n══════════════════════════════\n'
          result.testResults.forEach((tr: any, idx: number) => {
            display += `[Test ${idx + 1}] ${tr.input}\n  Expected: ${tr.expected}\n  Actual:   ${tr.actual}\n  Status:   ${tr.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`
          })
          if (result.allPassed) {
            display += '🎉 ALL TEST CASES PASSED!'
            if (isSubmit) display += '\n\n✅ Call the Pit Boss for private test validation.'
          } else {
            display += '❌ SOME TEST CASES FAILED. Check your logic and try again.'
            setHasError(true)
            if (isSubmit) {
              setShowBust(true)
              setTimeout(() => setShowBust(false), 500)
            }
          }
        } else {
          if (!stdout.trim()) display += '> Code ran with no printed output.\n\n'
          display += isSubmit ? '⚠️ Submission complete. Show output to Pit Boss.' : '✅ Run complete.'
        }
        setOutput(display)
      }
    } catch (e: any) {
      setOutput(`❌ SYSTEM ERROR:\n${e.message}`)
      setHasError(true)
    }
    setIsRunning(false)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: LOADING
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 font-mono text-sm">Verifying eligibility...</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: BLOCKED
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'BLOCKED') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#161b22] border border-red-500/40 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2 font-mono">Access Denied</h1>
          <p className="text-gray-400 text-sm font-mono mb-2">You need all <span className="text-yellow-400 font-bold">10 badges</span> to enter.</p>
          <p className="text-gray-500 text-xs font-mono">Complete all tables in Wing 1 &amp; Wing 2 first.</p>
          <button onClick={() => router.push('/map')} className="mt-6 w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-sm rounded-lg border border-gray-600 transition-colors">
            ← Return to Casino Floor
          </button>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: BETTING PHASE (with Spin Wheel)
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'BETTING') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-900/40 to-yellow-700/10 border-b border-[#30363d] px-8 py-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">🏆</span>
                <h1 className="text-xl font-bold text-yellow-400 font-mono">FINAL SHOWDOWN</h1>
                <DiffBadge label="FINAL" color="bg-yellow-900/60 text-yellow-300 border border-yellow-700/50" />
              </div>
              <p className="text-gray-500 text-xs font-mono">The ultimate coding challenge. Open to every team with all 10 badges. All-or-nothing.</p>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-xs font-mono">Your Balance</div>
              <div className="text-2xl font-bold text-yellow-400 font-mono">${wallet}</div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* LEFT: Bet Input */}
            <div className="space-y-6">
              <div>
                <h2 className="text-white font-semibold mb-1 font-mono">Place Your Wager</h2>
                <p className="text-gray-500 text-xs font-mono">Minimum bet is <span className="text-yellow-400 font-bold">500 credits</span>. You can go all-in.</p>
              </div>

              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 space-y-4">
                <label className="text-gray-400 text-xs font-mono uppercase tracking-widest">Bet Amount</label>
                <input
                  type="number" min={500} max={wallet ?? 999999}
                  value={betAmount === '' ? '' : betAmount}
                  onChange={e => { const v = e.target.value; setBetAmount(v === '' ? '' : Number(v)) }}
                  onBlur={() => { if (betAmount !== '' && Number(betAmount) < 500) setBetAmount(500) }}
                  className="w-full bg-transparent border-b-2 border-yellow-600/50 focus:border-yellow-400 text-yellow-300 text-3xl font-bold font-mono text-center py-2 outline-none transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={() => setBetAmount(500)}
                    className="flex-1 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-mono rounded-lg border border-[#30363d] transition-colors">
                    MIN (500)
                  </button>
                  <button onClick={() => setBetAmount(wallet ?? 500)}
                    className="flex-1 py-2 bg-yellow-700/20 hover:bg-yellow-700/40 text-yellow-300 text-xs font-mono rounded-lg border border-yellow-700/50 transition-colors font-bold">
                    ALL IN 🔥
                  </button>
                </div>
              </div>

              {/* Bet CTA */}
              {!showBetConfirm ? (
                <button onClick={() => setShowBetConfirm(true)} disabled={Number(betAmount) < 500 || isBetting}
                  className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold font-mono rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                  CONFIRM BET →
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-center text-yellow-300 text-xs font-mono">Wager <span className="font-bold">${betAmount}</span>? This is final.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowBetConfirm(false)} className="flex-1 py-3 bg-gray-800 text-gray-300 font-mono text-xs rounded-xl border border-gray-600">Cancel</button>
                    <button onClick={handleBet} disabled={isBetting}
                      className="flex-[2] py-3 bg-green-700 hover:bg-green-600 text-white font-bold font-mono text-xs rounded-xl border border-green-500 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                      {isBetting ? 'PROCESSING...' : '✅ LOCK IN WAGER'}
                    </button>
                  </div>
                </div>
              )}

              <button onClick={() => router.push('/map')} className="w-full text-gray-600 hover:text-gray-400 text-xs font-mono py-2 transition-colors">
                ← Back to Map
              </button>
            </div>

            {/* RIGHT: Spin Wheel */}
            <div className="flex flex-col items-center justify-start bg-[#0d1117] border border-[#30363d] rounded-xl p-6 gap-4">
              <div className="text-center">
                <h3 className="text-yellow-400 font-mono font-bold text-sm tracking-widest">🎡 BONUS WHEEL</h3>
                <p className="text-gray-500 text-xs font-mono mt-1">Spin for a victory multiplier! <span className="text-green-400 font-bold">FREE FINALIST BONUS</span></p>
              </div>

              {/* Pointer */}
              <div className="relative z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-red-500 mb-[-10px]" />

              {/* Wheel */}
              <div className="relative w-44 h-44 rounded-full border-4 border-yellow-700/60 overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.15)] bg-black">
                <motion.div animate={{ rotate: spinRotation }} transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
                  className="w-full h-full rounded-full relative" style={{ transformOrigin: 'center center' }}>
                  {MULTIPLIERS.map((mult, idx) => {
                    const angle = idx * SLICE_ANGLE
                    const color = idx % 2 === 0 ? '#111111' : '#7f1d1d'
                    return (
                      <div key={idx} className="absolute top-0 left-0 w-full h-full flex items-start justify-center"
                        style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50% 50%' }}>
                        <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-full h-full">
                          <path d="M 50 50 L 50 0 A 50 50 0 0 1 85.3553 14.6447 Z" fill={color} />
                        </svg>
                        <div className="absolute inset-0 flex items-start justify-center pt-2" style={{ transform: 'rotate(22.5deg)' }}>
                          <span className="font-bold text-xs text-white">{mult}x</span>
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              </div>

              {spinState === 'DONE' ? (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 font-mono">{wheelMultiplier}x MULTIPLIER!</div>
                  <p className="text-gray-500 text-xs font-mono mt-1">Applied to your final victory payout.</p>
                </div>
              ) : (
                <button onClick={handleSpin} disabled={spinState === 'SPINNING' || isBetting}
                  className="w-full max-w-[200px] py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold font-mono text-sm rounded-xl transition-all hover:-translate-y-0.5 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  {spinState === 'SPINNING' ? 'SPINNING...' : '🎡 SPIN BONUS WHEEL'}
                </button>
              )}
              <p className="text-gray-600 text-[10px] font-mono text-center">Included for all finalists.</p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: WAITING ROOM
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'WAITING') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <AnimatePresence>
          {(isPaused || tableStatus === 'PAUSED') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center">
              <h1 className="text-5xl font-bold text-red-400 font-mono animate-bounce">TABLE PAUSED</h1>
              <p className="text-gray-400 mt-4 font-mono">The Pit Boss has halted this table.</p>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-md p-8 bg-[#161b22] border border-[#30363d] rounded-2xl">
          <div className="text-6xl animate-bounce">🏆</div>
          <h1 className="text-2xl font-bold text-yellow-400 font-mono">Waiting for Pit Boss...</h1>
          <p className="text-gray-400 font-mono text-sm">You&apos;re registered for the Final Round. The challenge will begin when the Pit Boss opens the table.</p>

          {!isUnlocked ? (
            <div className="bg-[#0d1117] border border-yellow-700/40 rounded-xl p-6 space-y-4">
              <p className="text-gray-400 text-xs font-mono">Enter the PIN announced by the Pit Boss to unlock your IDE:</p>
              <input type="text" maxLength={10} placeholder="****"
                className="w-full bg-transparent border-2 border-gray-700 focus:border-yellow-500 text-yellow-400 text-3xl p-4 tracking-[0.5em] text-center rounded-xl outline-none font-mono"
                value={enteredPin} onChange={e => setEnteredPin(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && enteredPin.trim() === actualPin?.trim()) { setIsUnlocked(true); localStorage.setItem('cs_unlocked_final', actualPin!) } }}
              />
              <button onClick={() => { if (enteredPin.trim() === actualPin?.trim()) { setIsUnlocked(true); localStorage.setItem('cs_unlocked_final', actualPin!) } else alert('Incorrect PIN') }}
                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold font-mono rounded-xl transition-all">
                UNLOCK
              </button>
            </div>
          ) : (
            <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 text-green-400 font-mono text-sm">✅ PIN accepted. Waiting for round to start...</div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 font-mono justify-center">
            <span>Balance: <strong className="text-yellow-400">${wallet}</strong></span>
            {wheelMultiplier > 0 && <span>Wheel: <strong className="text-green-400">{wheelMultiplier}x</strong></span>}
          </div>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: GAME — LeetCode-style IDE layout
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={`h-screen overflow-hidden bg-[#0d1117] text-white flex flex-col ${isWarning ? 'animate-bust-shake' : ''}`}>

      {/* ── EVENT OVERLAYS ── */}
      <AnimatePresence>
        {(isPaused || tableStatus === 'PAUSED') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center">
            <h1 className="text-6xl font-bold text-red-400 animate-bounce font-mono">TABLE PAUSED</h1>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur border-[16px] border-red-600 animate-pulse flex items-center justify-center">
            <h1 className="text-7xl font-bold text-red-500 font-mono">⚠️ WARNING ⚠️</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUCCESS MODAL ── */}
      <AnimatePresence>
        {showSuccess && (
          <>
            <CoinRain />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center">
              {(() => { setTimeout(() => router.push('/map'), 12000); return null })()}
              <motion.div initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-center space-y-6 bg-[#161b22] border-4 border-yellow-500 p-12 rounded-3xl max-w-2xl shadow-[0_0_60px_rgba(234,179,8,0.4)]">
                <h1 className="text-5xl font-bold text-yellow-400 animate-bounce font-mono">🏆 CHAMPION! 🏆</h1>
                <p className="text-gray-300 font-mono">The Pit Boss has validated your solution!</p>
                <div className="bg-[#0d1117] p-6 rounded-2xl border border-yellow-700/40">
                  <p className="text-gray-400 font-mono text-sm mb-2">Payout</p>
                  <p className="text-4xl font-bold text-green-400 font-mono">
                    ${Math.floor((typeof betAmount === 'number' && betAmount >= 500 ? betAmount : 500) * 2 * (wheelMultiplier > 0 ? wheelMultiplier : 1))}
                    {wheelMultiplier > 0 && wheelMultiplier !== 1 && (
                      <span className="text-yellow-400 text-lg ml-2">({wheelMultiplier}x WHEEL!)</span>
                    )}
                  </p>
                </div>
                <p className="text-gray-500 text-sm font-mono">Returning to map in 12 seconds...</p>
                <button onClick={() => router.push('/map')}
                  className="px-8 py-4 bg-yellow-600 text-black font-bold text-lg rounded-xl hover:bg-yellow-500 hover:scale-105 transition-all font-mono">
                  RETURN TO CASINO
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── BROADCAST TOAST ── */}
      <AnimatePresence>
        {broadcast && (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-4 right-4 z-[99] max-w-xs bg-[#1f2428] border-l-4 border-yellow-500 p-3 rounded-lg text-sm font-mono text-gray-200 shadow-xl">
            <span className="text-yellow-500 font-bold block text-xs mb-1">⚠️ PIT BOSS</span>
            {broadcast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOPBAR — LeetCode style ── */}
      <header className="h-[44px] bg-[#1a1b26] border-b border-[#30363d] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-bold font-mono text-sm">🏆 FINAL SHOWDOWN</span>
          <DiffBadge label="FINAL" color="bg-yellow-900/60 text-yellow-300" />
          <DiffBadge label="ELITE" color="bg-red-900/60 text-red-300" />
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {wallet !== null && (
            <div className="flex items-center gap-1.5 text-yellow-400">
              <span>🪙</span><span className="font-bold">${wallet}</span>
            </div>
          )}
          {wheelMultiplier > 0 && (
            <div className="px-2 py-0.5 bg-green-900/40 border border-green-700/50 rounded text-green-400 text-[10px]">
              WHEEL {wheelMultiplier}x
            </div>
          )}
          <div className={`px-2 py-0.5 rounded font-bold transition-all ${isTimerUrgent ? 'bg-red-900/60 text-red-400 animate-pulse' : 'bg-[#21262d] text-gray-300'}`}>
            ⏳ {timeLeft}
          </div>
          <div className="text-gray-500">
            {teamCode}
          </div>
          {teamId && <LogoutButton teamId={teamId} />}
        </div>
      </header>

      {/* ── MAIN IDE BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">

        {/* ═══ LEFT PANEL: Problem Description ═══ */}
        <div className="w-full h-[40%] lg:h-full lg:w-[34%] lg:min-w-[320px] lg:max-w-[460px] shrink-0 flex flex-col bg-[#0d1117] border-b lg:border-b-0 lg:border-r border-[#30363d] overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center border-b border-[#30363d] bg-[#161b22] shrink-0">
            {(['description', 'testcases', 'output'] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-mono transition-colors capitalize ${activeTab === tab ? 'text-white border-b-2 border-yellow-500 bg-[#0d1117]' : 'text-gray-500 hover:text-gray-300'}`}>
                {tab === 'output' ? 'Console' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-sm">

            {/* DESCRIPTION TAB */}
            {activeTab === 'description' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-base font-bold text-white font-mono">Final Round Challenge</h2>
                    <DiffBadge label="Hard" color="bg-red-900/40 text-red-400" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-mono mb-4">
                    <span>🏆 10 badges required</span>
                    <span>⏱ 45 min total</span>
                    <span>🎯 All badges required</span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                      {question?.description || 'Loading question...'}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-[#30363d]" />

                {/* Rules */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Rules</h3>
                  <ul className="space-y-1.5 text-xs text-gray-400 font-mono">
                    {['Optimize your solution — brute force may TLE.', 'You may run your code before submitting.', 'Call the Pit Boss to validate against private tests.', 'No collaboration. No internet.'].map((r, i) => (
                      <li key={i} className="flex gap-2"><span className="text-yellow-600">[{String(i + 1).padStart(2, '0')}]</span>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TEST CASES TAB */}
            {activeTab === 'testcases' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-3">Test Cases</h3>
                {question?.test_cases && question.test_cases.length > 0 ? (
                  question.test_cases.map((tc: any, i: number) => (
                    <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-2 font-mono text-xs">
                      <div className="text-gray-400 font-bold">Case {i + 1}</div>
                      {tc.input && (
                        <div>
                          <div className="text-gray-500 text-[10px] mb-1">Input:</div>
                          <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] text-green-400 whitespace-pre-wrap">{tc.input}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-500 text-[10px] mb-1">Expected Output:</div>
                        <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] text-blue-400 whitespace-pre-wrap">{tc.expected}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs font-mono">No public test cases available. Ask the Pit Boss.</p>
                )}
              </div>
            )}

            {/* OUTPUT / CONSOLE TAB */}
            {activeTab === 'output' && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-3">Console Output</h3>
                <div className={`bg-[#0d1117] rounded-lg p-4 min-h-[200px] font-mono text-xs border transition-all
                  ${showBust ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-[#30363d]'}
                  ${hasError ? 'text-red-400' : 'text-green-400'}`}>
                  <pre className="whitespace-pre-wrap">{output || 'Run your code to see output here...'}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Code Editor ═══ */}
        <div className="relative flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">

          {/* Editor toolbar */}
          <div className="h-[40px] bg-[#1a1b26] border-b border-[#30363d] flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-500 text-xs font-mono ml-2">solution.py</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Python only - no language dropdown */}
              <span className="bg-[#21262d] border border-[#30363d] text-gray-300 text-xs font-mono rounded px-2 py-1 select-none" title="Python is the only supported language">
                🐍 Python
              </span>
            </div>
          </div>

          {/* PIN LOCK OVERLAY */}
          <AnimatePresence>
            {!isUnlocked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-6 p-4 pointer-events-auto">
                <div className="text-center space-y-2">
                  <span className="text-4xl">🔒</span>
                  <h2 className="text-2xl font-bold text-yellow-400 font-mono">IDE LOCKED</h2>
                  <p className="text-gray-400 font-mono text-sm">Enter the PIN announced by the Pit Boss.</p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <input type="text" maxLength={10} placeholder="****"
                    className="w-full bg-[#0d1117] border-2 border-gray-700 focus:border-yellow-500 text-yellow-400 text-4xl p-6 tracking-[0.5em] text-center rounded-xl outline-none font-mono"
                    value={enteredPin} onChange={e => setEnteredPin(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (enteredPin.trim() === actualPin?.trim()) { setIsUnlocked(true); localStorage.setItem('cs_unlocked_final', actualPin!) }
                        else { alert('Incorrect PIN'); setEnteredPin('') }
                      }
                    }}
                  />
                  <button onClick={() => {
                    if (enteredPin.trim() === actualPin?.trim()) { setIsUnlocked(true); localStorage.setItem('cs_unlocked_final', actualPin!) }
                    else { alert('Incorrect PIN'); setEnteredPin('') }
                  }} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold font-mono rounded-xl transition-all">
                    UNLOCK IDE
                  </button>
                  <p className="text-gray-600 text-[10px] text-center font-mono">DEBUG: <span className="text-red-400">{actualPin || 'Waiting for DB...'}</span></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Code Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              starterCode={code}
              onChange={newCode => setCode(newCode)}
              isRunning={isRunning}
              hasError={hasError}
              language={language}
              onLanguageChange={setLanguage}
              onRun={() => handleSubmit(false)}
            />
          </div>

          {/* Bottom action bar — LeetCode style */}
          <div className="h-[52px] bg-[#1a1b26] border-t border-[#30363d] flex items-center justify-between px-4 shrink-0 gap-3">
            <button onClick={() => {
              if (window.confirm('Are you sure you want to Give Up? You will lose your bet.')) router.push('/map')
            }} className="px-4 py-1.5 bg-transparent border border-gray-700 hover:border-red-700 text-gray-500 hover:text-red-400 font-mono text-xs rounded-lg transition-colors">
              Give Up
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSubmit(false)} disabled={isRunning}
                className="px-5 py-1.5 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 text-gray-300 font-mono text-xs rounded-lg border border-[#30363d] transition-colors">
                {isRunning ? 'Running...' : '▶ Run'}
              </button>
              <button onClick={() => handleSubmit(true)} disabled={isRunning}
                className={`px-6 py-1.5 font-bold font-mono text-xs rounded-lg transition-all
                  ${isRunning
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-700 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)]'
                  }`}>
                {isRunning ? 'Running...' : '↑ Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
