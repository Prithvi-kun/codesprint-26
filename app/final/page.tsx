/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getAvatarUrl } from '@/lib/avatars'
import { getTopThree, type Winner, type ScoreRow } from './actions'

const LAUNCH_URL = 'https://andropedia-rmp.vercel.app/'

type Stage = 'idle' | 'loading' | 'countdown' | 'third' | 'second' | 'first' | 'done'

const PLACE_STYLE = {
  1: {
    label: '1ST PLACE', title: 'CHAMPIONS', medal: '🥇',
    text: 'text-yellow-300', border: 'border-yellow-400', glow: 'rgba(250,204,21,0.65)',
    bg: 'from-yellow-500/25 via-amber-900/30 to-black', height: 'md:min-h-[460px]'
  },
  2: {
    label: '2ND PLACE', title: 'RUNNERS-UP', medal: '🥈',
    text: 'text-slate-200', border: 'border-slate-300', glow: 'rgba(203,213,225,0.5)',
    bg: 'from-slate-400/20 via-slate-800/30 to-black', height: 'md:min-h-[400px]'
  },
  3: {
    label: '3RD PLACE', title: 'ON THE PODIUM', medal: '🥉',
    text: 'text-orange-300', border: 'border-orange-500', glow: 'rgba(251,146,60,0.5)',
    bg: 'from-orange-500/20 via-orange-950/30 to-black', height: 'md:min-h-[350px]'
  }
} as const

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) { setV(0); return }
    const start = performance.now()
    const dur = 1800
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, run])
  return <>{v.toLocaleString()}</>
}

function Confetti({ burstKey, count = 140 }: { burstKey: number; count?: number }) {
  const pieces = useMemo(() => {
    const colors = ['#facc15', '#f59e0b', '#fde68a', '#f43f5e', '#22d3ee', '#a78bfa', '#4ade80', '#ffffff']
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 2.8 + Math.random() * 2.6,
      size: 6 + Math.random() * 9,
      drift: (Math.random() - 0.5) * 240,
      rot: 360 + Math.random() * 720,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() > 0.65
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, count])
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={`${burstKey}-${p.id}`}
          className="final-confetti"
          style={{
            left: `${p.left}%`, width: p.size, height: p.round ? p.size : p.size * 0.5,
            background: p.color, borderRadius: p.round ? '50%' : 2,
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
            ['--drift' as string]: `${p.drift}px`, ['--rot' as string]: `${p.rot}deg`
          }}
        />
      ))}
    </div>
  )
}

function MysteryCard({ place }: { place: 1 | 2 | 3 }) {
  const s = PLACE_STYLE[place]
  return (
    <div className={`relative w-full ${s.height} min-h-[220px] rounded-3xl border-2 border-dashed ${s.border}/30 bg-white/[0.02] flex flex-col items-center justify-center gap-3`}>
      <div className="text-6xl md:text-7xl opacity-20 select-none">?</div>
      <div className={`font-pixel text-[10px] tracking-[0.3em] ${s.text} opacity-40`}>{s.label}</div>
    </div>
  )
}

function WinnerCard({ w, revealed }: { w: Winner; revealed: boolean }) {
  const s = PLACE_STYLE[w.place]
  const isFirst = w.place === 1
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4, y: 80, rotateX: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: isFirst ? 120 : 160, damping: isFirst ? 12 : 14 }}
      className={`relative w-full ${s.height} min-h-[220px] rounded-3xl border-2 ${s.border} bg-gradient-to-b ${s.bg} p-5 md:p-7 flex flex-col items-center justify-center text-center overflow-hidden`}
      style={{ boxShadow: `0 0 60px ${s.glow}, inset 0 0 40px ${s.glow.replace(/[\d.]+\)$/, '0.12)')}` }}
    >
      {/* sweeping shine */}
      <span className="final-shine" />
      {/* rotating rays for champion */}
      {isFirst && <span className="final-rays" />}

      <motion.div
        initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 10 }}
        className="text-5xl md:text-6xl mb-1 relative z-10 drop-shadow-[0_0_14px_rgba(255,255,255,0.4)]"
      >
        {s.medal}
      </motion.div>
      <div className={`font-pixel text-[10px] md:text-xs tracking-[0.35em] ${s.text} relative z-10`}>{s.label}</div>

      <motion.div
        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
        className={`relative z-10 my-4 rounded-2xl border-2 ${s.border} overflow-hidden bg-black/60 ${isFirst ? 'w-28 h-28 md:w-36 md:h-36' : 'w-20 h-20 md:w-28 md:h-28'} ${isFirst ? 'final-float' : ''}`}
      >
        <img src={getAvatarUrl(w.avatarSeed)} alt={w.name} className="w-full h-full object-cover" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className={`relative z-10 font-pixel leading-snug ${isFirst ? 'text-lg md:text-2xl' : 'text-sm md:text-lg'} ${s.text}`}
      >
        {w.name}
      </motion.h2>
      {w.teamNum !== null && (
        <div className="relative z-10 font-mono text-[11px] text-gray-400 mt-1">TEAM #{w.teamNum}</div>
      )}

      <div className="relative z-10 mt-4 w-full max-w-[260px] rounded-xl bg-black/50 border border-white/10 py-3 px-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Final Score</div>
        <div className={`font-hud font-bold ${isFirst ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'} text-green-400 tabular-nums`}>
          <CountUp to={w.score} run={revealed} />
        </div>
        <div className="font-mono text-[11px] text-yellow-300/80 mt-1">${w.credits} + 🏅 {w.badges} × 250 = {w.badges * 250}</div>
      </div>
    </motion.div>
  )
}

export default function FinalAnnouncementPage() {
  const [stage, setStage] = useState<Stage>('idle')
  const [winners, setWinners] = useState<Winner[]>([])
  const [scoreboard, setScoreboard] = useState<ScoreRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(3)
  const [flash, setFlash] = useState(0)
  const [burst, setBurst] = useState(0)
  const busy = useRef(false)

  const byPlace = (p: 1 | 2 | 3) => winners.find(w => w.place === p)
  const shown = (p: 1 | 2 | 3) =>
    (p === 3 && ['third', 'second', 'first', 'done'].includes(stage)) ||
    (p === 2 && ['second', 'first', 'done'].includes(stage)) ||
    (p === 1 && ['first', 'done'].includes(stage))

  const begin = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setError(null)
    setStage('loading')
    const res = await getTopThree()
    if ('error' in res) { setError(res.error); setStage('idle'); busy.current = false; return }
    if (res.winners.length < 3) {
      setError(`Only ${res.winners.length} team${res.winners.length === 1 ? ' is' : 's are'} logged in right now - at least 3 logged-in teams are needed to announce winners.`)
      setStage('idle'); busy.current = false; return
    }
    setWinners(res.winners)
    setScoreboard(res.scoreboard)
    setCount(3)
    setStage('countdown')
    busy.current = false
  }, [])

  // 3 - 2 - 1 drumroll, then reveal 3rd place automatically
  useEffect(() => {
    if (stage !== 'countdown') return
    if (count === 0) { setFlash(f => f + 1); setStage('third'); return }
    const t = setTimeout(() => setCount(c => c - 1), 900)
    return () => clearTimeout(t)
  }, [stage, count])

  const next = useCallback(() => {
    if (stage === 'idle') return begin()
    if (stage === 'third') { setFlash(f => f + 1); setStage('second') }
    else if (stage === 'second') { setFlash(f => f + 1); setStage('first'); setBurst(b => b + 1) }
    else if (stage === 'first') setStage('done')
  }, [stage, begin])

  // Space / Enter advances the ceremony
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'A' || target.tagName === 'BUTTON')) return
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next])

  const reset = () => { setStage('idle'); setWinners([]); setScoreboard([]); setCount(3) }

  const nextLabel =
    stage === 'third' ? 'REVEAL 2ND PLACE →' :
    stage === 'second' ? 'REVEAL THE CHAMPION 👑' :
    stage === 'first' ? 'CONTINUE ▶' : ''

  const champion = stage === 'first' || stage === 'done'

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#07040f] text-white">
      <style>{`
        @keyframes final-fall { 0% { transform: translate3d(0,-12vh,0) rotate(0); opacity: 1 } 100% { transform: translate3d(var(--drift), 112vh, 0) rotate(var(--rot)); opacity: .9 } }
        .final-confetti { position: absolute; top: 0; animation-name: final-fall; animation-timing-function: cubic-bezier(.25,.6,.4,1); animation-fill-mode: forwards; }
        @keyframes final-pulse { 0%,100% { opacity: .55; transform: scale(1) } 50% { opacity: 1; transform: scale(1.08) } }
        @keyframes final-spin { to { transform: translate(-50%,-50%) rotate(360deg) } }
        @keyframes final-sweep { 0% { transform: translateX(-130%) skewX(-20deg) } 100% { transform: translateX(260%) skewX(-20deg) } }
        @keyframes final-floaty { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes final-launch { 0%,100% { box-shadow: 0 0 30px rgba(250,204,21,.55), 0 0 70px rgba(244,63,94,.35) } 50% { box-shadow: 0 0 55px rgba(250,204,21,.95), 0 0 120px rgba(244,63,94,.65) } }
        @keyframes final-twinkle { 0%,100% { opacity: .15 } 50% { opacity: .9 } }
        .final-shine { position: absolute; top: 0; bottom: 0; left: 0; width: 35%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent); animation: final-sweep 3.2s ease-in-out infinite; pointer-events: none; }
        .final-rays { position: absolute; left: 50%; top: 38%; width: 170%; aspect-ratio: 1; transform: translate(-50%,-50%); background: repeating-conic-gradient(from 0deg, rgba(250,204,21,.16) 0deg 8deg, transparent 8deg 22deg); animation: final-spin 24s linear infinite; mask-image: radial-gradient(circle, #000 8%, transparent 62%); -webkit-mask-image: radial-gradient(circle, #000 8%, transparent 62%); pointer-events: none; }
        .final-float { animation: final-floaty 3s ease-in-out infinite; }
        .final-launch-btn { animation: final-launch 1.8s ease-in-out infinite; }
        .final-star { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; animation: final-twinkle 3s ease-in-out infinite; }
      `}</style>

      {/* ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-purple-700/20 blur-[140px]" />
        <div className={`absolute bottom-[-260px] left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full blur-[150px] transition-colors duration-1000 ${champion ? 'bg-yellow-500/25' : 'bg-rose-700/15'}`} />
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i} className="final-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 9) * 0.35}s` }} />
        ))}
      </div>

      {/* flash on every reveal */}
      <AnimatePresence>
        {flash > 0 && (
          <motion.div key={flash} initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }}
            className="pointer-events-none fixed inset-0 z-[55] bg-white" />
        )}
      </AnimatePresence>

      {champion && <Confetti burstKey={burst} />}

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-8 md:py-10">
        {/* HEADER */}
        <header className="text-center">
          <div className="font-pixel text-[10px] md:text-xs tracking-[0.5em] text-rose-300/80">CODESPRINT &apos;26 • THE CASINO HEIST</div>
          <h1 className="mt-3 font-pixel text-2xl md:text-5xl leading-tight bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(250,204,21,0.35)]">
            {champion ? 'WE HAVE OUR WINNERS' : 'WINNERS ANNOUNCEMENT'}
          </h1>
          <div className="mx-auto mt-4 h-[3px] w-40 md:w-64 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        </header>

        {/* STAGE */}
        <section className="mt-8 md:mt-10 flex w-full max-w-6xl flex-1 flex-col items-center justify-center">
          {stage === 'idle' || stage === 'loading' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 text-center">
              <motion.div animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 3.2 }} className="text-7xl md:text-8xl">🏆</motion.div>
              <p className="max-w-md font-mono text-sm md:text-base text-gray-300">
                The scores are locked. Three syndicates stand above the rest.
              </p>
              <button
                id="begin-ceremony-btn"
                onClick={begin}
                disabled={stage === 'loading'}
                className="rounded-2xl border-b-4 border-yellow-700 bg-yellow-500 px-10 py-4 font-pixel text-xs md:text-sm text-black transition-all hover:scale-105 hover:bg-yellow-400 active:translate-y-1 active:border-b-0 disabled:opacity-60"
              >
                {stage === 'loading' ? 'OPENING THE VAULT…' : 'BEGIN THE CEREMONY'}
              </button>
              <p className="font-mono text-[11px] text-gray-500">Tip: press <kbd className="rounded bg-white/10 px-1.5 py-0.5">Space</kbd> to advance each reveal</p>
              {error && <p className="font-mono text-xs text-red-400">⚠️ {error}</p>}
            </motion.div>
          ) : stage === 'countdown' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="font-pixel text-xs tracking-[0.4em] text-gray-400">THE THIRD PLACE TEAM IS…</div>
              <AnimatePresence mode="wait">
                <motion.div key={count} initial={{ opacity: 0, scale: 2.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.4 }} transition={{ duration: 0.45 }}
                  className="font-pixel text-[7rem] md:text-[11rem] leading-none text-yellow-300 drop-shadow-[0_0_40px_rgba(250,204,21,0.7)]">
                  {count > 0 ? count : '🎉'}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 items-end gap-5 md:grid-cols-3 md:gap-6">
              {/* order on the podium: 2nd — 1st — 3rd (1st first on mobile) */}
              <div className="order-2 md:order-1">
                {shown(2) && byPlace(2) ? <WinnerCard w={byPlace(2)!} revealed /> : <MysteryCard place={2} />}
              </div>
              <div className="order-1 md:order-2">
                {shown(1) && byPlace(1) ? <WinnerCard w={byPlace(1)!} revealed /> : <MysteryCard place={1} />}
              </div>
              <div className="order-3">
                {shown(3) && byPlace(3) ? <WinnerCard w={byPlace(3)!} revealed /> : <MysteryCard place={3} />}
              </div>
            </div>
          )}
        </section>

        {/* CONTROLS */}
        <footer className="mt-8 flex w-full flex-col items-center gap-4 pb-4">
          {nextLabel && (
            <motion.button
              id="reveal-next-btn"
              key={stage}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              onClick={next}
              className="rounded-2xl border-b-4 border-purple-900 bg-purple-600 px-8 py-3 font-pixel text-[11px] md:text-xs text-white transition-all hover:scale-105 hover:bg-purple-500 active:translate-y-1 active:border-b-0"
            >
              {nextLabel}
            </motion.button>
          )}

          <AnimatePresence>
            {stage === 'done' && (
              <motion.div initial={{ opacity: 0, scale: 0.6, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}
                className="flex w-full flex-col items-center gap-4">
                {/* FINAL SCOREBOARD - logged-in teams ranked by score = credits + 250 x badges */}
                <div className="w-full max-w-2xl rounded-2xl border border-yellow-500/30 bg-black/50 p-4 backdrop-blur">
                  <div className="mb-1 text-center font-pixel text-[11px] tracking-[0.3em] text-yellow-300">FINAL SCOREBOARD</div>
                  <div className="mb-3 text-center font-mono text-[10px] text-gray-500">Score = Credits + (Badges × 250)</div>
                  <div className="max-h-[40vh] overflow-y-auto">
                    <div className="grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem_5rem] gap-2 px-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                      <span>#</span><span>Team</span><span className="text-right">Credits</span><span className="text-right">Badges</span><span className="text-right">Score</span>
                    </div>
                    {scoreboard.map(r => (
                      <div key={`${r.rank}-${r.name}`}
                        className={`grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem_5rem] items-center gap-2 rounded px-2 py-1.5 font-mono text-xs ${r.rank === 1 ? 'bg-yellow-500/15 text-yellow-200' : r.rank === 2 ? 'bg-gray-300/10 text-gray-200' : r.rank === 3 ? 'bg-orange-500/10 text-orange-200' : 'text-gray-400'}`}>
                        <span className="font-bold">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}</span>
                        <span className="truncate uppercase">{r.teamNum != null ? `T${r.teamNum} · ` : ''}{r.name}</span>
                        <span className="text-right">${r.credits}</span>
                        <span className="text-right">🏅 {r.badges}</span>
                        <span className="text-right font-bold text-green-400">{r.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="font-mono text-xs md:text-sm uppercase tracking-[0.35em] text-gray-400">And now, the moment you&apos;ve been waiting for…</div>
                <a
                  id="launch-btn"
                  href={LAUNCH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="final-launch-btn w-full max-w-2xl rounded-3xl border-b-8 border-rose-900 bg-gradient-to-r from-rose-500 via-yellow-400 to-rose-500 px-6 py-6 md:py-8 text-center font-pixel text-3xl md:text-5xl text-black transition-transform hover:scale-[1.04] active:translate-y-1 active:border-b-4"
                >
                  🚀 LAUNCH
                </a>
                <button onClick={reset} className="font-mono text-[11px] text-gray-600 underline-offset-4 hover:text-gray-300 hover:underline">
                  ↺ replay ceremony
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </footer>
      </div>
    </main>
  )
}
