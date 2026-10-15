'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Shield, Pause, Play, Zap, Search, DollarSign, AlertTriangle, Ban,
    Award, Upload, RotateCcw, ToggleLeft, ToggleRight, Trophy, BarChart3,
    Megaphone, Eye, ChevronDown, RefreshCw, X, Check, Flame, Trash2, ChevronRight,
    Sparkles, CheckCircle2, FileJson, Copy
} from 'lucide-react'
import {
    togglePause, setCurrentRound, getEventState,
    getAllTeams, adjustWallet, sendWarning, banTeam, unbanTeam, toggleStamp,
    getAllQuestions, toggleQuestion, burnQuestion, reshuffleAllQuestions, bulkUploadQuestions,
    uploadDefaultQuestionBank, purgeAllQuestions,
    uploadQuestionsForTable, deleteQuestion, deleteAllQuestionsForTable,
    getLeaderboard, getAnalytics, broadcastMessage, forceWin, createTeam,
    startTableRound, setTableStatusState, awardWin, toggleRound2Portal,
    resetAllTeamLogins, getTablesReadiness
} from '../actions'
import type { TableReadiness } from '../actions'

type Tab = 'pit' | 'vault' | 'deck' | 'eye'

const GAME_TYPES = ['slots', 'roulette', 'blackjack', 'craps', 'poker', 'baccarat', 'dice', 'highcard', 'coinflip', 'vault', 'final'] as const
const GAME_LABELS: Record<string, string> = {
    slots: '🎰 SLOTS (Bug Bounty)',
    roulette: '🎯 ROULETTE (Output Oracle)',
    blackjack: '🃏 BLACKJACK (Code Relay)',
    craps: '🎲 CRAPS (Debug Detective)',
    poker: '🕵️ POKER (Cipher Crack)',
    baccarat: '🏦 BACCARAT (SQL Heist)',
    dice: '🎲 DICE (Stack Attack)',
    highcard: '🃏 HIGH CARD (Complexity Clash)',
    coinflip: '🪙 COIN FLIP (Algorithm Auction)',
    vault: '🔐 THE VAULT (DSA)',
    final: '🏆 FINAL SHOWDOWN (All In)',
}

interface AdminDashboardProps {
    adminRole?: string
    adminLabel?: string
}

export default function AdminDashboard({ adminRole = 'pitboss', adminLabel = 'Pit Boss Alpha' }: AdminDashboardProps) {
    const isDealer = adminRole !== 'pitboss' && GAME_TYPES.includes(adminRole as any)
    const [activeTab, setActiveTab] = useState<Tab>('pit')

    // Every admin login (Pit Boss AND every table dealer) gets the full toolset.
    // Dealers only differ in that their station tab opens on their own table.
    const tabs: { id: Tab; label: string; icon: React.ReactNode; color: string; badge?: string }[] = [
        isDealer
            ? { id: 'pit', label: `${adminRole.toUpperCase()} STATION`, icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400 border-yellow-500' }
            : { id: 'pit', label: 'THE PIT (MASTER OPS)', icon: <Zap className="w-4 h-4" />, color: 'text-red-400 border-red-500' },
        { id: 'vault', label: 'THE VAULT (CREDITS & BADGES)', icon: <DollarSign className="w-4 h-4" />, color: 'text-yellow-400 border-yellow-500' },
        { id: 'deck', label: '🃏 QUESTION BANK & BULK PUSH', icon: <Flame className="w-4 h-4" />, color: 'text-blue-400 border-blue-500', badge: '201 Qs' },
        { id: 'eye', label: 'THE EYE', icon: <Eye className="w-4 h-4" />, color: 'text-purple-400 border-purple-500' },
    ]

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* TOP BAR */}
            <div className="bg-[#12121a] border-b border-red-900/30 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-red-500" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-pixel text-red-400 text-sm tracking-wider">
                                {isDealer ? `${adminRole.toUpperCase()} DEALER CONSOLE` : 'PIT BOSS CONTROL HQ'}
                            </span>
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${isDealer ? 'bg-yellow-950/60 border-yellow-500/40 text-yellow-300' : 'bg-red-950/60 border-red-500/30 text-red-300'}`}>
                                {adminLabel}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono hidden sm:block">
                            {isDealer ? `Assigned Table Station: ${adminRole.toUpperCase()} • Full admin tools enabled` : 'CodeSprint 2026 Master Casino Engine & Pit Boss Headquarters'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Bulk push button (available to every admin login) */}
                    {(

                        <button
                            onClick={() => setActiveTab('deck')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-pixel font-bold transition-all cursor-pointer ${
                                activeTab === 'deck'
                                    ? 'bg-retro-green text-black shadow-[0_0_15px_#39ff14]'
                                    : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]'
                            }`}
                            title="Open Question Bank and Bulk JSON Uploader"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>BULK PUSH QUESTIONS (JSON)</span>
                        </button>
                    )}
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-lg border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-gray-400 font-mono">LIVE</span>
                    </div>
                    <button
                        onClick={async () => {
                            await fetch('/api/admin/logout', { method: 'POST' })
                            window.location.href = '/admin'
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/30 hover:bg-red-900/60 text-red-400 text-xs font-pixel transition-all hover:scale-105"
                        title="Log out of admin session"
                    >
                        LOGOUT
                    </button>
                </div>
            </div>

            {/* TAB BAR */}
            <div className="bg-[#0d0d14] border-b border-white/5 px-4 flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-pixel tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer
              ${activeTab === tab.id
                                ? `${tab.color} bg-white/5`
                                : 'text-gray-600 border-transparent hover:text-gray-400 hover:bg-white/[0.02]'
                            }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-500/30">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="p-6 max-w-[1600px] mx-auto">
                {activeTab === 'pit' && <ThePit adminRole={adminRole} adminLabel={adminLabel} />}
                {activeTab === 'vault' && <TheVault />}
                {activeTab === 'deck' && <TheDeck defaultTable={isDealer ? adminRole : undefined} />}
                {activeTab === 'eye' && <TheEye />}
            </div>
        </div>
    )
}

// ========================================
// TAB A: "THE PIT" — Live Ops & Control
// ========================================
function ThePit({ adminRole = 'pitboss', adminLabel = 'Pit Boss Alpha' }: { adminRole?: string; adminLabel?: string }) {
    const isDealer = adminRole !== 'pitboss' && GAME_TYPES.includes(adminRole as any)
    const [isPaused, setIsPaused] = useState(false)
    const [isRound2Open, setIsRound2Open] = useState(false)
    const [currentRound, setCurrentRoundState] = useState(isDealer ? adminRole : 'slots')
    const [liveFeed, setLiveFeed] = useState<any[]>([])
    const [broadcast, setBroadcast] = useState('')
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [tableTimers, setTableTimers] = useState<Record<string, string>>({})
    const [activeTeams, setActiveTeams] = useState<any[]>([])
    const [currentTime, setCurrentTime] = useState(Date.now())

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
        return () => clearInterval(interval)
    }, [])

    // Waiting-room readiness per table (at least one team seated + everyone seated has bet)
    const [readiness, setReadiness] = useState<Record<string, TableReadiness>>({})
    // The Pit Boss may start any table at any time (even with 0 teams) - the waiting-room panel is informational only
    const canStart = (_g: string) => true

    const refresh = useCallback(async () => {
        setLoading(true)
        const [data, rd] = await Promise.all([getEventState(), getTablesReadiness()])
        if (rd && 'readiness' in rd) setReadiness(rd.readiness)
        if (data && !data.error) {
            setIsPaused(data.control?.is_paused || false)
            setIsRound2Open(data.control?.round_2_open || false)
            // PRESERVE local dealer selection: never overwrite currentRoundState from DB
            setLiveFeed(data.recentTx || [])
            setTableTimers(data.control?.table_timers as Record<string, string> || {})
            setActiveTeams(data.activeTeams || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    useEffect(() => {
        const poll = setInterval(() => { refresh() }, 5000)
        return () => clearInterval(poll)
    }, [refresh])

    const handleTableStatusChange = async (gameId: string, newStatus: string) => {
        setActionLoading(`table-status-${gameId}`)
        const res = await setTableStatusState(gameId, newStatus)
        if (res?.error) alert(`Error: ${res.error}`)
        await refresh()
        setActionLoading(null)
    }

    const handleKillSwitch = async () => {
        setActionLoading('kill')
        const newState = !isPaused
        const res = await togglePause(newState)
        if (res?.error) alert(`Error: ${res.error}`)
        else setIsPaused(newState)
        setActionLoading(null)
    }

    const handleRoundChange = (round: string) => {
        // LOCAL SELECTION ONLY - do not overwrite database so other dealers aren't affected
        setCurrentRoundState(round)
    }

    // Total countdown: tables = 10 min play + 1 min passcode entry; final = 60 min
    const roundMins = (key: string) => (key === 'final' ? 60 : 11)

    const handleStartRound = async () => {
        const startTime = tableTimers[currentRound]
        const gameStatus = tableTimers[`${currentRound}_status`] || 'ACTIVE'
        const isLive = startTime && gameStatus === 'ACTIVE' && (new Date(startTime).getTime() + (roundMins(currentRound) * 60000) - currentTime > 0)
        const actionWord = isLive ? 'RESTART' : 'START'

        if (!window.confirm(`Are you sure you want to ${actionWord} the ${roundMins(currentRound)}-Minute timer for ${GAME_LABELS[currentRound]}?\n\nThis will OVERWRITE the old timer, set ${roundMins(currentRound)}:00 from NOW, generate a new PIN, and activate fresh questions for this table.`)) return;
        setActionLoading('start-round')
        try {
            const res = await startTableRound(currentRound, roundMins(currentRound))
            if (res.error) {
                alert(`Error: ${res.error}`)
            } else {
                alert(`✅ ${roundMins(currentRound)}-Minute timer ${isLive ? 'RESTARTED' : 'STARTED'} for ${GAME_LABELS[currentRound]}!\n\nNew Table PIN: ${res.pin}`)
            }
        } catch (err: any) {
            alert(`Unhandled Server Error: ${err.message}`)
            console.error(err)
        }
        await refresh()
        setActionLoading(null)
    }

    const handleStartRoundForTable = async (targetTable: string) => {
        const startTime = tableTimers[targetTable]
        const gameStatus = tableTimers[`${targetTable}_status`] || 'ACTIVE'
        const isLive = startTime && gameStatus === 'ACTIVE' && (new Date(startTime).getTime() + (roundMins(targetTable) * 60000) - currentTime > 0)
        const actionWord = isLive ? 'RESTART' : 'START'

        if (!window.confirm(`${actionWord} ${roundMins(targetTable)}-minute countdown for ${GAME_LABELS[targetTable] || targetTable.toUpperCase()}?\n\nThis will reset the ${roundMins(targetTable)}m timer to NOW and generate a fresh PIN.`)) return;
        setActionLoading(`start-${targetTable}`)
        try {
            const res = await startTableRound(targetTable, roundMins(targetTable))
            if (res.error) {
                alert(`Error: ${res.error}`)
            } else {
                alert(`✅ ${roundMins(targetTable)}-Minute timer ${isLive ? 'RESTARTED' : 'STARTED'} for ${targetTable.toUpperCase()}!\n\nNew Table PIN: ${res.pin}`)
            }
        } catch (err: any) {
            alert(`Unhandled Server Error: ${err.message}`)
            console.error(err)
        }
        await refresh()
        setActionLoading(null)
    }

    const handleAwardWin = async (teamId: string, teamName: string, gameId: string) => {
        const confirmMsg = `Have you VERIFIED [${teamName}]'s solution for ${gameId.toUpperCase()}?\n\nPASS will stamp their badge, credit the prize automatically and show the SUCCESS screen on their laptop.`
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(`award-${teamId}`)
        const res = await awardWin(teamId, gameId)
        if (res.error) alert(`Error: ${res.error}`)
        else alert(`✅ SUCCESS: ${teamName} passed! Badge stamped and $${res.payout ?? 0} credited.`)
        await refresh()
        setActionLoading(null)
    }

    const handleBroadcast = async () => {
        if (!broadcast.trim()) return
        setActionLoading('broadcast')
        await broadcastMessage(broadcast)
        setBroadcast('')
        setActionLoading(null)
    }

    const handleResetAllLogins = async () => {
        if (!window.confirm('⚠️ Reset EVERY Syndicate login to LOGGED OUT?\n\nThis will allow all teams to log in again immediately.')) return
        setActionLoading('reset-logins')
        const res = await resetAllTeamLogins()
        if (res.error) {
            alert(`Error: ${res.error}`)
        } else {
            alert(`✅ SUCCESS: All ${res.count || 0} teams have been reset to LOGGED OUT!`)
        }
        await refresh()
        setActionLoading(null)
    }

    return (
        <div className="space-y-6">
            {/* DEDICATED DEALER STATION BANNER */}
            {isDealer && (
                <div className="bg-gradient-to-r from-red-950/70 via-black to-yellow-950/70 border-2 border-yellow-500/50 rounded-xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">
                            {currentRound === 'slots' ? '🎰' : currentRound === 'roulette' ? '🎯' : currentRound === 'blackjack' ? '🃏' : currentRound === 'craps' ? '🎲' : currentRound === 'poker' ? '🕵️' : currentRound === 'baccarat' ? '🏦' : currentRound === 'dice' ? '🎲' : currentRound === 'highcard' ? '🃏' : currentRound === 'coinflip' ? '🪙' : '🔐'}
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-pixel text-yellow-400 text-lg">{GAME_LABELS[currentRound] || currentRound.toUpperCase()}</span>
                                <span className="text-[10px] font-pixel bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">DEALER STATION</span>
                            </div>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">Station: {adminLabel} • Controls are locked exclusively to this table</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-black/90 px-4 py-2 rounded-lg border border-yellow-500/60 text-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                            <span className="text-[9px] text-gray-400 font-pixel uppercase block">TABLE PIN</span>
                            <span className="text-2xl font-mono font-bold text-yellow-400 tracking-widest">{tableTimers[`${currentRound}_pin`] || '----'}</span>
                        </div>
                        <button
                            onClick={handleStartRound}
                            disabled={actionLoading === 'start-round' || !canStart(currentRound)}
                            title={canStart(currentRound) ? undefined : (readiness[currentRound]?.reason || 'Checking the waiting room…')}
                            className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-pixel text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105 disabled:opacity-50"
                        >
                            <Play className="w-4 h-4" />
                            {tableTimers[currentRound] && tableTimers[`${currentRound}_status`] === 'ACTIVE' ? `🔄 RESTART ${roundMins(currentRound)}M TIMER` : `▶ START ${roundMins(currentRound)}M ROUND`}
                        </button>
                    </div>
                </div>
            )}

            {/* Kill Switch + Round Manager Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KILL SWITCH (Visible to Master Pitboss, or compact for dealers) */}
                <div className="bg-[#12121a] rounded-xl border border-red-900/30 p-6 flex flex-col items-center gap-4">
                    <h3 className="text-xs font-pixel text-red-400/80 tracking-widest uppercase">Global Kill Switch</h3>
                    <button
                        onClick={handleKillSwitch}
                        disabled={actionLoading === 'kill'}
                        className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl
              ${isPaused
                                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/40 ring-4 ring-red-500/20 animate-pulse'
                                : 'bg-green-600 hover:bg-green-500 shadow-green-600/40 ring-4 ring-green-500/20'
                            }`}
                    >
                        {isPaused
                            ? <Play className="w-12 h-12 text-white" />
                            : <Pause className="w-12 h-12 text-white" />
                        }
                    </button>
                    <span className={`text-sm font-pixel ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
                        {isPaused ? 'EVENT PAUSED' : 'EVENT LIVE'}
                    </span>

                    {/* EMERGENCY RESET LOGINS */}
                    <div className="w-full pt-4 border-t border-white/10 mt-1">
                        <button
                            onClick={handleResetAllLogins}
                            disabled={actionLoading === 'reset-logins'}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-orange-950/40 hover:bg-orange-900/60 border border-orange-500/40 text-orange-200 text-xs font-pixel transition-all hover:scale-[1.02] disabled:opacity-50"
                        >
                            <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === 'reset-logins' ? 'animate-spin' : ''}`} />
                            {actionLoading === 'reset-logins' ? 'RESETTING...' : 'RESET ALL LOGINS'}
                        </button>
                        <p className="text-[9px] text-gray-500 text-center font-mono mt-1">Eject/Reset all active sessions</p>
                    </div>
                </div>

                {/* ROUND MANAGER */}
                <div className="bg-[#12121a] rounded-xl border border-white/10 p-6 col-span-1 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-pixel text-gray-400 tracking-widest uppercase">
                            {isDealer ? `Table Station: ${GAME_LABELS[currentRound]}` : 'Round Manager (Master)'}
                        </h3>
                        {isDealer && (
                            <span className="text-[9px] font-mono bg-yellow-950/60 border border-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded">
                                YOUR STATION: {adminRole.toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Current Round Selector */}
                    <div className="mb-4">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">
                            {isDealer ? 'Active Station (switch to control any table)' : 'Select Active Round Table'}
                        </label>
                        <div className="relative">
                            <select
                                value={currentRound}
                                onChange={(e) => handleRoundChange(e.target.value)}
                                className={`w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-mono text-white appearance-none cursor-pointer focus:outline-none ${isDealer ? 'border-yellow-500/30 focus:border-yellow-500' : 'focus:border-red-500'}`}
                            >
                                {GAME_TYPES.map(g => (
                                    <option key={g} value={g}>{GAME_LABELS[g]}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Table Controls */}
                    <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            {(() => {
                                const startTime = tableTimers[currentRound]
                                const gameStatus = tableTimers[`${currentRound}_status`] || 'ACTIVE'
                                const isActive = startTime && gameStatus === 'ACTIVE' && (new Date(startTime).getTime() + (roundMins(currentRound) * 60000) - currentTime > 0)

                                return (
                                    <div className="flex flex-col h-full">
                                        <button
                                            onClick={handleStartRound}
                                            disabled={actionLoading === 'start-round' || !canStart(currentRound)}
                                            className={`w-full flex-1 flex flex-col items-center justify-center gap-1.5 p-4 border-2 rounded-xl font-pixel text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed
                                                ${isActive 
                                                    ? 'bg-green-900/40 hover:bg-green-900/60 border-green-500 text-green-100 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                                                    : 'bg-red-900/40 hover:bg-red-900/60 border-red-500 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Play className="w-5 h-5" />
                                                <span>{isActive ? `🔄 RESTART ${currentRound.toUpperCase()} (${roundMins(currentRound)}M)` : `▶ START ${currentRound.toUpperCase()}`}</span>
                                            </div>
                                            {isActive && (
                                                <span className="text-[11px] font-mono text-green-300">
                                                    CLICK TO OVERWRITE TIMER & PIN
                                                </span>
                                            )}
                                        </button>
                                        {isActive && (
                                            <div className="flex justify-between items-center px-2 pt-2 text-xs font-mono">
                                                <span className="text-green-400 font-bold">
                                                    TIME: {(() => {
                                                        const diff = new Date(startTime).getTime() + (roundMins(currentRound) * 60000) - currentTime
                                                        const m = Math.floor(diff / 60000)
                                                        const s = Math.floor((diff % 60000) / 1000)
                                                        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                                                    })()}
                                                </span>
                                                <span className="text-yellow-400 font-bold bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/40">
                                                    PIN: {tableTimers[`${currentRound}_pin`] || '----'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                            <p className="text-center text-[10px] text-gray-500 mt-2 font-mono uppercase">
                                {canStart(currentRound) ? `Overwrites the ${roundMins(currentRound)}-minute countdown and regenerates PIN.` : <span className="text-yellow-400">🔒 {readiness[currentRound]?.reason || 'Checking the waiting room…'}</span>}
                            </p>
                        </div>
                        <div>
                            <button
                                onClick={async () => {
                                    if (!window.confirm(!isRound2Open ? 'Are you sure you want to OPEN the Round 2 Portal? All players will see it.' : 'Are you sure you want to CLOSE the Round 2 Portal?')) return;
                                    setActionLoading('round-2')
                                    const res = await toggleRound2Portal(!isRound2Open)
                                    if (res.error) {
                                        alert(res.error)
                                    } else {
                                        setIsRound2Open(!isRound2Open)
                                    }
                                    setActionLoading(null)
                                }}
                                disabled={actionLoading === 'round-2'}
                                className={`w-full flex items-center justify-center gap-2 p-4 border-2 rounded-xl font-pixel text-lg transition-all hover:scale-[1.02] disabled:opacity-50
                                    ${isRound2Open
                                        ? 'bg-yellow-900/60 border-yellow-500 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse'
                                        : 'bg-yellow-900/20 border-yellow-900 text-yellow-500/50 hover:border-yellow-500 hover:text-yellow-400'
                                    }`}
                            >
                                {isRound2Open ? 'CLOSE PORTAL' : 'OPEN ROUND 2 PORTAL'}
                            </button>
                            <p className="text-center text-[10px] text-gray-500 mt-2 font-mono uppercase text-yellow-500/50">
                                {isRound2Open ? 'PORTAL IS LIVE!' : 'Portal is currently closed.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-4">
                        <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Live Table Timers</h4>
                        <div className="space-y-2">
                            {GAME_TYPES.map(g => {
                                const playingTeams = activeTeams.filter(t => t.current_locked_table === g)
                                const startTime = tableTimers[g]
                                const gameStatus = tableTimers[`${g}_status`] || 'ACTIVE'
                                let status = "WAITING"
                                let color = "text-gray-500"

                                if (isPaused || gameStatus === 'PAUSED') {
                                    status = "PAUSED"
                                    color = "text-yellow-400 font-bold animate-pulse"
                                } else if (gameStatus === 'KILLED') {
                                    status = "KILLED"
                                    color = "text-red-500 font-bold"
                                } else if (startTime) {
                                    const diff = new Date(startTime).getTime() + (roundMins(g) * 60000) - currentTime
                                    if (diff > 0) {
                                        const m = Math.floor(diff / 60000)
                                        const s = Math.floor((diff % 60000) / 1000)
                                        status = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                                        color = "text-green-400 font-bold"
                                    } else {
                                        status = "00:00 (ENDED)"
                                        color = "text-red-400"
                                    }
                                }
                                return (
                                    <div key={g} className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${currentRound === g ? 'bg-white/[0.04] border-yellow-500/50 shadow-lg' : 'bg-black/40 border-white/5'}`}>
                                        <div className="flex justify-between items-center text-xs font-mono mb-2">
                                            <span className={`uppercase font-bold ${currentRound === g ? 'text-yellow-400' : 'text-gray-400'}`}>
                                                {g} {currentRound === g && '★'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {tableTimers[`${g}_pin`] && <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 rounded font-bold tracking-widest">{tableTimers[`${g}_pin`]}</span>}
                                                <span className={color}>{status}</span>
                                            </div>
                                        </div>
                                        {/* Actions: Restart, Pause/Resume, Kill */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleStartRoundForTable(g)}
                                                disabled={actionLoading === `start-${g}` || !canStart(g)}
                                                className="flex-1 py-1 rounded text-[10px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 font-pixel transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                title={canStart(g) ? `Start the ${roundMins(g)}-minute round and generate a new PIN` : (readiness[g]?.reason || 'Checking the waiting room…')}
                                            >
                                                {(startTime && gameStatus === 'ACTIVE' && new Date(startTime).getTime() + roundMins(g) * 60000 - currentTime > 0) ? '🔄 RESTART' : '▶ START'}
                                            </button>
                                            <button
                                                onClick={() => handleTableStatusChange(g, gameStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED')}
                                                disabled={actionLoading === `table-status-${g}`}
                                                className={`flex-1 py-1 rounded text-[10px] font-pixel border transition-colors ${gameStatus === 'PAUSED' ? 'bg-green-900/30 text-green-400 border-green-500/50 hover:bg-green-600/30' : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50 hover:bg-yellow-600/30'}`}>
                                                {gameStatus === 'PAUSED' ? 'RESUME' : 'PAUSE'}
                                            </button>
                                            <button
                                                onClick={() => { if (window.confirm(`Kill ${g.toUpperCase()} table? Time will stop and players lose.`)) handleTableStatusChange(g, 'KILLED') }}
                                                disabled={actionLoading === `table-status-${g}` || gameStatus === 'KILLED'}
                                                className="flex-1 py-1 rounded text-[10px] bg-red-900/30 text-red-500 border border-red-500/50 hover:bg-red-600/30 font-pixel transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                KILL
                                            </button>
                                        </div>
                                        {/* Waiting room: who has joined and bet for the next round */}
                                        {g !== 'final' && readiness[g] && (
                                            <div className="mt-2 border-t border-white/10 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Waiting Room</span>
                                                    <span className={`text-[10px] font-pixel ${readiness[g].ready ? 'text-green-400' : 'text-yellow-400'}`}>
                                                        {readiness[g].bet}/{readiness[g].joined} BET{' \u00b7 '}{readiness[g].joined}/{readiness[g].capacity} SEATS
                                                    </span>
                                                </div>
                                                {readiness[g].members.length > 0 && (
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        {readiness[g].members.map((m, i) => (
                                                            <div key={i} className="flex justify-between gap-2 text-[10px] font-mono bg-black/40 px-2 py-1 rounded">
                                                                <span className="text-white uppercase truncate">{m.name}</span>
                                                                <span className={m.hasBet ? 'text-green-400' : 'text-yellow-300 animate-pulse'}>
                                                                    {m.hasBet ? `${m.difficulty === 'HIGH' ? 'HIGH' : 'STD'} $${m.amount}` : 'choosing bet…'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Show Teams */}
                                        {playingTeams.length > 0 && (
                                            <div className="flex flex-col gap-2 mt-2 border-t border-white/10 pt-2">
                                                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Active Players ({playingTeams.length})</span>
                                                <div className="flex flex-col gap-2">
                                                    {playingTeams.map(t => (
                                                        <div key={t.id} className="flex items-center justify-between bg-[#1a1a24] p-2 rounded border border-white/5 shadow-inner shadow-black">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-white uppercase">{t.team_name}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">Code: {t.access_code}</span>
                                                            </div>
                                                            {g === 'baccarat' ? (
                                                                <span className="px-2 py-1 text-[9px] font-pixel text-gray-500 border border-white/10 rounded">AUTO (MCQ)</span>
                                                            ) : (
                                                            <button
                                                                onClick={() => handleAwardWin(t.id, t.team_name, g)}
                                                                disabled={actionLoading === `award-${t.id}`}
                                                                className="px-3 py-1 bg-green-900/40 hover:bg-green-600/60 border border-green-500/50 text-green-400 font-pixel text-[10px] rounded transition-all disabled:opacity-50"
                                                            >
                                                                ✅ PASS
                                                            </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* BROADCAST SYSTEM */}
            <div className="bg-[#12121a] rounded-xl border border-yellow-900/30 p-6">
                <h3 className="text-xs font-pixel text-yellow-400/80 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <Megaphone className="w-4 h-4" /> Broadcast System
                </h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={broadcast}
                        onChange={(e) => setBroadcast(e.target.value)}
                        placeholder="Type a message to broadcast to all players..."
                        onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                        className="flex-grow bg-black/40 border border-yellow-900/30 rounded-lg p-3 text-sm font-mono text-yellow-200
              placeholder:text-yellow-900/40 focus:border-yellow-500 focus:outline-none"
                    />
                    <button
                        onClick={handleBroadcast}
                        disabled={actionLoading === 'broadcast' || !broadcast.trim()}
                        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-xs rounded-lg transition-all
              disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        SEND
                    </button>
                </div>
            </div>

            {/* LIVE FEED */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-pixel text-gray-400 tracking-widest uppercase">Live Transaction Feed</h3>
                    <button onClick={refresh} className="text-gray-600 hover:text-white transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                    {liveFeed.length === 0 && (
                        <div className="text-center text-gray-600 text-sm py-6 font-mono">No transactions yet</div>
                    )}
                    {liveFeed.map((tx: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2 bg-black/20 rounded-lg border border-white/5 text-xs font-mono">
                            <span className="text-gray-400">{tx.teams?.access_code || tx.team_id?.slice(0, 8)}</span>
                            <span className="text-gray-500">{tx.description}</span>
                            <span className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {tx.amount >= 0 ? '+' : ''}{tx.amount}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ========================================
// TAB B: "THE VAULT" — Team Management
// ========================================
function TheVault() {
    const [teams, setTeams] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [selectedTeam, setSelectedTeam] = useState<any>(null)
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [forceWinGame, setForceWinGame] = useState('slots')
    const [forceWinAmount, setForceWinAmount] = useState('300')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Manual Registration State
    const [showRegister, setShowRegister] = useState(false)
    const [newTeamCode, setNewTeamCode] = useState('')
    const [newTeamBalance, setNewTeamBalance] = useState('100')

    const refresh = useCallback(async () => {
        setLoading(true)
        const data = await getAllTeams()
        if (data && !data.error) {
            setTeams(data.teams || [])
            setSelectedTeam((prev: any) => {
                if (!prev) return prev
                const updated = data.teams?.find((t: any) => t.id === prev.id)
                return updated || prev
            })
        }
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    const filteredTeams = teams.filter(t =>
        t.access_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleAdjust = async (direction: 1 | -1 = 1) => {
        if (!selectedTeam || !adjustAmount) return
        const value = Math.abs(parseFloat(adjustAmount))
        if (!isFinite(value) || value === 0) return alert('Enter a valid amount.')
        const signed = direction * value
        if (!window.confirm(`${direction === 1 ? 'ADD' : 'DEDUCT'} $${value} ${direction === 1 ? 'to' : 'from'} ${selectedTeam.access_code}?`)) return
        setActionLoading('adjust')
        const res = await adjustWallet(selectedTeam.id, signed, adjustReason || (direction === 1 ? 'Admin Credit' : 'Admin Deduction'))
        if (res && 'error' in res && res.error) alert(`Error: ${res.error}`)
        setAdjustAmount('')
        setAdjustReason('')
        await refresh()
        setActionLoading(null)
    }

    const handleWarning = async (teamId: string) => {
        setActionLoading(`warn-${teamId}`)
        await sendWarning(teamId)
        setActionLoading(null)
    }

    const handleBan = async (teamId: string) => {
        setActionLoading(`ban-${teamId}`)
        await banTeam(teamId)
        await refresh()
        setActionLoading(null)
    }

    const handleUnban = async (teamId: string) => {
        setActionLoading(`unban-${teamId}`)
        await unbanTeam(teamId)
        await refresh()
        setActionLoading(null)
    }

    const handleForceWin = async () => {
        if (!selectedTeam) return
        setActionLoading('forcewin')
        await forceWin(selectedTeam.id, forceWinGame, parseFloat(forceWinAmount))
        await refresh()
        setActionLoading(null)
    }

    const handleStampToggle = async (teamId: string, currentStamps: any, game: string) => {
        setActionLoading(`stamp-${teamId}-${game}`)
        const result = await toggleStamp(teamId, game)
        if (result && result.stamps && selectedTeam && selectedTeam.id === teamId) {
            setSelectedTeam({ ...selectedTeam, stamps: result.stamps })
        }
        await refresh()
        setActionLoading(null)
    }

    const handleRegister = async () => {
        if (!newTeamCode.trim()) return
        setActionLoading('register')
        const result = await createTeam(newTeamCode, parseInt(newTeamBalance) || 100)

        if (result && !result.error) {
            setNewTeamCode('')
            setNewTeamBalance('100')
            setShowRegister(false)
            await refresh()
        } else {
            alert('Registration Failed: ' + result?.error)
        }
        setActionLoading(null)
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex gap-4">
                <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search teams by code or ID..."
                        className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-mono text-white
                placeholder:text-gray-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                </div>
                <button
                    onClick={() => setShowRegister(!showRegister)}
                    className="px-4 bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
                >
                    {showRegister ? <X className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    {showRegister ? 'CANCEL' : 'REGISTER TEAM'}
                </button>
            </div>

            {/* Registration Form */}
            {showRegister && (
                <div className="bg-[#12121a] rounded-xl border border-yellow-500/30 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Access Code</label>
                        <input
                            type="text"
                            value={newTeamCode}
                            onChange={(e) => setNewTeamCode(e.target.value.toUpperCase())}
                            placeholder="CODE-123"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white uppercase focus:border-yellow-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Initial Balance</label>
                        <input
                            type="number"
                            value={newTeamBalance}
                            onChange={(e) => setNewTeamBalance(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white focus:border-yellow-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={handleRegister}
                        disabled={actionLoading === 'register' || !newTeamCode.trim()}
                        className="h-[38px] bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-xs rounded-lg transition-all disabled:opacity-50"
                    >
                        CONFIRM REGISTRATION
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* TEAM LIST */}
                <div className="lg:col-span-2 bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 bg-black/30 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-pixel text-gray-400 tracking-widest">TEAMS ({filteredTeams.length})</span>
                        <button onClick={refresh} className="text-gray-600 hover:text-white transition-colors">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {filteredTeams.map(team => {
                            const isBanned = team.current_locked_table === 'BANNED'
                            const stamps = team.stamps as Record<string, boolean> || {}

                            return (
                                <div
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team)}
                                    className={`flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-pointer transition-all text-sm
                    ${selectedTeam?.id === team.id ? 'bg-yellow-900/20 border-l-2 border-l-yellow-500' : 'hover:bg-white/[0.02]'}
                    ${isBanned ? 'opacity-40' : ''}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isBanned ? 'bg-red-500' : 'bg-green-500'}`} />
                                        <div className="min-w-0">
                                            <div className="font-mono text-xs text-white truncate">{team.access_code}</div>
                                            <div className="text-[10px] text-gray-600 truncate">{team.id.slice(0, 12)}...</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        {/* Stamps */}
                                        <div className="hidden sm:flex gap-1">
                                            {GAME_TYPES.map(g => (
                                                <span key={g} className={`w-4 h-4 text-[8px] flex items-center justify-center rounded
                          ${stamps[g] ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-700'}`}
                                                    title={g}>
                                                    {stamps[g] ? '★' : '○'}
                                                </span>
                                            ))}
                                        </div>
                                        <span className={`font-mono text-sm font-bold ${team.wallet_balance >= 500 ? 'text-green-400' : team.wallet_balance <= 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                            ${team.wallet_balance}
                                        </span>
                                        {/* Quick Actions */}
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleWarning(team.id) }}
                                                disabled={actionLoading === `warn-${team.id}`}
                                                className="p-1.5 rounded hover:bg-yellow-900/30 text-yellow-500/50 hover:text-yellow-400 transition-colors"
                                                title="Send Warning"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                            </button>
                                            {isBanned ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnban(team.id) }}
                                                    disabled={actionLoading === `unban-${team.id}`}
                                                    className="p-1.5 rounded hover:bg-green-900/30 text-green-500/50 hover:text-green-400 transition-colors"
                                                    title="Unban Team"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleBan(team.id) }}
                                                    disabled={actionLoading === `ban-${team.id}`}
                                                    className="p-1.5 rounded hover:bg-red-900/30 text-red-500/50 hover:text-red-400 transition-colors"
                                                    title="Ban Team"
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const { logoutAction } = await import('@/app/actions')
                                                    await logoutAction(team.id)
                                                }}
                                                className="p-1.5 rounded hover:bg-blue-900/30 text-blue-500/50 hover:text-blue-400 transition-colors"
                                                title="Force Disconnect Session"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* SELECTED TEAM PANEL */}
                <div className="bg-[#12121a] rounded-xl border border-white/10 p-6 space-y-6">
                    {selectedTeam ? (
                        <>
                            <div>
                                <h3 className="text-xs font-pixel text-yellow-400 tracking-widest uppercase mb-1">Selected Team</h3>
                                <p className="font-mono text-lg text-white">{selectedTeam.access_code}</p>
                                <p className="text-[10px] text-gray-600 font-mono">{selectedTeam.id}</p>
                            </div>

                            <div className="border-t border-white/5 pt-4">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Current Balance</p>
                                <p className="text-3xl font-mono font-bold text-yellow-400">${selectedTeam.wallet_balance}</p>
                            </div>

                            {/* Adjust Wallet */}
                            <div className="border-t border-white/5 pt-4 space-y-3">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> Adjust Credits
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        placeholder="Amount (e.g. 100)"
                                        className="flex-grow bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white
                      placeholder:text-gray-600 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Reason (optional)"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white
                    placeholder:text-gray-600 focus:border-yellow-500/50 focus:outline-none"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleAdjust(1)}
                                        disabled={actionLoading === 'adjust' || !adjustAmount}
                                        className="py-2 bg-green-600 hover:bg-green-500 text-black font-pixel text-xs rounded-lg
                    transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        ➕ ADD CREDIT
                                    </button>
                                    <button
                                        onClick={() => handleAdjust(-1)}
                                        disabled={actionLoading === 'adjust' || !adjustAmount}
                                        className="py-2 bg-red-700 hover:bg-red-600 text-white font-pixel text-xs rounded-lg
                    transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        ➖ DEDUCT CREDIT
                                    </button>
                                </div>
                            </div>

                            {/* Badge Inspector */}
                            <div className="border-t border-white/5 pt-4 space-y-3">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                    <Award className="w-3 h-3" /> Badge Inspector
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    {GAME_TYPES.map(g => {
                                        const stamps = (selectedTeam.stamps as Record<string, boolean>) || {}
                                        const has = !!stamps[g]
                                        return (
                                            <button
                                                key={g}
                                                onClick={() => handleStampToggle(selectedTeam.id, selectedTeam.stamps, g)}
                                                disabled={!!actionLoading?.startsWith('stamp')}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono transition-all
                          ${has
                                                        ? 'bg-yellow-900/30 border-yellow-600 text-yellow-400'
                                                        : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                                    }`}
                                            >
                                                <span>{GAME_LABELS[g]}</span>
                                                <span>{has ? '★' : '○'}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Force Win */}
                            <div className="border-t border-white/5 pt-4 space-y-3">
                                <p className="text-[10px] text-red-400 uppercase tracking-widest flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Emergency Override (Force Win)
                                </p>
                                <select
                                    value={forceWinGame}
                                    onChange={(e) => setForceWinGame(e.target.value)}
                                    className="w-full bg-black/40 border border-red-900/30 rounded-lg p-2 text-sm font-mono text-white appearance-none focus:border-red-500 focus:outline-none"
                                >
                                    {GAME_TYPES.map(g => (
                                        <option key={g} value={g}>{GAME_LABELS[g]}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={forceWinAmount}
                                    onChange={(e) => setForceWinAmount(e.target.value)}
                                    placeholder="Credit amount"
                                    className="w-full bg-black/40 border border-red-900/30 rounded-lg p-2 text-sm font-mono text-white
                    placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleForceWin}
                                    disabled={actionLoading === 'forcewin'}
                                    className="w-full py-2 bg-red-700 hover:bg-red-600 text-white font-pixel text-xs rounded-lg transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ⚡ FORCE WIN
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                            <Search className="w-8 h-8 mb-3 opacity-30" />
                            <p className="text-xs font-pixel">Select a team</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ========================================
// TAB C: "THE DECK" — Question Bank & Bulk JSON Importer
// ========================================

const TABLE_GAME_IDS = ['slots', 'roulette', 'blackjack', 'craps', 'poker', 'baccarat', 'dice', 'highcard', 'coinflip', 'vault', 'final'] as const

interface TableMeta {
    label: string
    sublabel: string
    typeLabel: string
    icon: string
    color: string
    badgeClass: string
    description: string
    expectedCount: number
}

const TABLE_METADATA: Record<string, TableMeta> = {
    slots: {
        label: 'TABLE 1: SLOTS',
        sublabel: 'Bug Bounty',
        typeLabel: '🐛 BUG BOUNTY',
        icon: '🎰',
        color: 'blue',
        badgeClass: 'border-blue-500/40 text-blue-400 bg-blue-950/40',
        description: 'Find and fix flawed code snippets in Python / C / JS. Test cases validate edge cases.',
        expectedCount: 20
    },
    roulette: {
        label: 'TABLE 2: ROULETTE',
        sublabel: 'Output Oracle',
        typeLabel: '🎯 OUTPUT ORACLE',
        icon: '🎯',
        color: 'amber',
        badgeClass: 'border-amber-500/40 text-amber-400 bg-amber-950/40',
        description: 'Code execution tracing. Players must submit the EXACT printed output string of the snippet.',
        expectedCount: 20
    },
    blackjack: {
        label: 'TABLE 3: BLACKJACK',
        sublabel: 'Code Relay',
        typeLabel: '🃏 CODE RELAY',
        icon: '🃏',
        color: 'emerald',
        badgeClass: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40',
        description: 'Missing algorithm logic. Complete the starter code function and pass test cases.',
        expectedCount: 20
    },
    craps: {
        label: 'TABLE 4: CRAPS',
        sublabel: 'Debug Detective',
        typeLabel: '🎲 3 PROGRESSIVE CLUES',
        icon: '🎲',
        color: 'yellow',
        badgeClass: 'border-yellow-500/40 text-yellow-400 bg-yellow-950/40',
        description: 'Error diagnosis with 3 hint ladders (Clue 1: -10%, Clue 2: -30%, Clue 3: -50% prize penalty).',
        expectedCount: 20
    },
    poker: {
        label: 'TABLE 5: POKER',
        sublabel: 'Cipher Crack',
        typeLabel: '🕵️ CIPHER CRACK',
        icon: '🕵️',
        color: 'indigo',
        badgeClass: 'border-indigo-500/40 text-indigo-400 bg-indigo-950/40',
        description: 'Cryptography, frequency substitution, and decoding encoded secret ciphertexts.',
        expectedCount: 20
    },
    baccarat: {
        label: 'TABLE 6: BACCARAT',
        sublabel: 'SQL Heist',
        typeLabel: '🏦 SQL 4-OPTION MCQ',
        icon: '🏦',
        color: 'cyan',
        badgeClass: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/40',
        description: 'Relational database challenges with 4 Multiple-Choice Options (A, B, C, D) and SQL query verification.',
        expectedCount: 20
    },
    dice: {
        label: 'TABLE 7: DICE',
        sublabel: 'Stack Attack',
        typeLabel: '🎲 STACK ATTACK',
        icon: '🎲',
        color: 'fuchsia',
        badgeClass: 'border-fuchsia-500/40 text-fuchsia-400 bg-fuchsia-950/40',
        description: 'Stack data structure tracing, reverse Polish notation, and bracket balancing simulation.',
        expectedCount: 20
    },
    highcard: {
        label: 'TABLE 8: HIGH CARD',
        sublabel: 'Complexity Clash',
        typeLabel: '🃏 COMPLEXITY CLASH',
        icon: '🃏',
        color: 'orange',
        badgeClass: 'border-orange-500/40 text-orange-400 bg-orange-950/40',
        description: 'Big-O time and memory space asymptotic complexity evaluation (O(1), O(N), O(N log N), O(N²)).',
        expectedCount: 20
    },
    coinflip: {
        label: 'TABLE 9: COIN FLIP',
        sublabel: 'Algorithm Auction',
        typeLabel: '🪙 3 CLUES AUCTION',
        icon: '🪙',
        color: 'yellow',
        badgeClass: 'border-yellow-400/40 text-yellow-300 bg-yellow-950/40',
        description: 'Algorithmic deduction problem with auction bidding on progressive hint clues.',
        expectedCount: 20
    },
    vault: {
        label: 'TABLE 10: THE VAULT',
        sublabel: 'DSA Challenge',
        typeLabel: '🔐 HARD DSA',
        icon: '🔐',
        color: 'red',
        badgeClass: 'border-red-500/40 text-red-400 bg-red-950/40',
        description: 'Advanced data structures and dynamic programming challenges with strict time & space constraints.',
        expectedCount: 20
    },
    final: {
        label: 'FINAL SHOWDOWN',
        sublabel: 'LeetCode 239: Sliding Window Maximum',
        typeLabel: '👑 LEETCODE HARD',
        icon: '🏆',
        color: 'purple',
        badgeClass: 'border-purple-500/40 text-purple-400 bg-purple-950/40',
        description: 'Championship Betting Round for Top 6 qualifiers. Sliding Window Maximum with Monotonic Queue.',
        expectedCount: 1
    }
}

function TheDeck({ defaultTable }: { defaultTable?: string } = {}) {
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedTable, setExpandedTable] = useState<string | null>(defaultTable || null)
    const [selectedTableFilter, setSelectedTableFilter] = useState<string>(defaultTable || 'all')
    const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'STANDARD' | 'HIGH'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    // Bulk Upload State
    const [bulkJson, setBulkJson] = useState('')
    const [showBulkPanel, setShowBulkPanel] = useState(true)
    const [bulkStats, setBulkStats] = useState<{
        total: number
        byGame: Record<string, number>
        isValid: boolean
    } | null>(null)

    // Single Table Upload Modal State
    const [uploadTarget, setUploadTarget] = useState<{ game: string; difficulty: string } | null>(null)
    const [uploadJson, setUploadJson] = useState('')

    const refresh = useCallback(async () => {
        setLoading(true)
        const data = await getAllQuestions()
        if (data && !data.error) {
            setQuestions(data.questions || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    // Live validation counter & per-game breakdown for bulk JSON
    useEffect(() => {
        if (!bulkJson.trim()) {
            setBulkStats(null)
            return
        }
        try {
            let parsed = JSON.parse(bulkJson)
            if (!Array.isArray(parsed)) {
                if (typeof parsed === 'object' && parsed !== null) {
                    parsed = [parsed]
                } else {
                    setBulkStats({ total: 0, byGame: {}, isValid: false })
                    return
                }
            }
            const byGame: Record<string, number> = {}
            parsed.forEach((q: any) => {
                let g = (q.game_type || '').toUpperCase()
                if (!g && q.title) {
                    const t = q.title.toLowerCase()
                    if (t.includes('slots')) g = 'SLOTS'
                    else if (t.includes('roulette')) g = 'ROULETTE'
                    else if (t.includes('blackjack')) g = 'BLACKJACK'
                    else if (t.includes('craps')) g = 'CRAPS'
                    else if (t.includes('poker')) g = 'POKER'
                    else if (t.includes('baccarat')) g = 'BACCARAT'
                    else if (t.includes('dice')) g = 'DICE'
                    else if (t.includes('high card') || t.includes('highcard')) g = 'HIGHCARD'
                    else if (t.includes('coin flip') || t.includes('coinflip')) g = 'COINFLIP'
                    else if (t.includes('vault')) g = 'VAULT'
                    else if (t.includes('final')) g = 'FINAL'
                }
                if (!g) g = 'OTHER'
                byGame[g] = (byGame[g] || 0) + 1
            })
            setBulkStats({ total: parsed.length, byGame, isValid: true })
        } catch {
            setBulkStats({ total: 0, byGame: {}, isValid: false })
        }
    }, [bulkJson])

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 2000)
    }

    const freshQuestions = questions.filter(q => !q.is_used)
    const burnedQuestions = questions.filter(q => q.is_used)

    const getQuestionsForTable = (gameType: string, difficulty?: string) => {
        return questions.filter(q => {
            const matchGame = q.game_type.toUpperCase() === gameType.toUpperCase()
            if (difficulty && difficulty !== 'ALL') return matchGame && q.difficulty.toUpperCase() === difficulty.toUpperCase()
            return matchGame
        })
    }

    const handleToggle = async (id: string, current: boolean) => {
        setActionLoading(`toggle-${id}`)
        await toggleQuestion(id, !current)
        await refresh()
        setActionLoading(null)
    }

    const handleBurn = async (id: string) => {
        setActionLoading(`burn-${id}`)
        await burnQuestion(id)
        await refresh()
        setActionLoading(null)
    }

    const handleDeleteQuestion = async (id: string) => {
        if (!window.confirm('Delete this question permanently from the database?')) return
        setActionLoading(`del-${id}`)
        await deleteQuestion(id)
        await refresh()
        setActionLoading(null)
    }

    const handleReshuffle = async () => {
        if (!window.confirm('Reset ALL questions to fresh (un-burned) state so teams can play them again?')) return
        setActionLoading('reshuffle')
        await reshuffleAllQuestions()
        await refresh()
        setActionLoading(null)
    }

    // 1-Click Push Default Question Bank (All 201 questions from PDF)
    const handleOneClickPushDefault = async () => {
        if (!window.confirm('⚡ Push all 201 questions from CodeSprint 2026 PDF (all 10 tables × 20 questions + Final Round) directly into Supabase?')) return
        setActionLoading('one-click-push')
        const result = await uploadDefaultQuestionBank()
        if (result && result.success) {
            alert(`SUCCESS! Successfully pushed ${result.count} questions into the database!`)
            await refresh()
        } else {
            alert(`Upload Failed: ${result?.error || 'Unknown error'}`)
        }
        setActionLoading(null)
    }

    // Bulk Custom JSON Upload
    const handleBulkCustomUpload = async () => {
        if (!bulkJson.trim() || !bulkStats?.isValid) return
        setActionLoading('bulk-upload-submit')
        const result = await bulkUploadQuestions(bulkJson)
        if (result && result.success) {
            alert(`SUCCESS! Successfully pushed ${result.count} questions into the database!`)
            setBulkJson('')
            await refresh()
        } else {
            alert(`Bulk Upload Error: ${result?.error || 'Unknown error'}`)
        }
        setActionLoading(null)
    }

    // File Input for Bulk JSON
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const content = ev.target?.result as string
            if (content) {
                setBulkJson(content)
            }
        }
        reader.readAsText(file)
    }

    // Purge All
    const handlePurgeAll = async () => {
        if (!window.confirm('⚠️ DANGER: Are you sure you want to PURGE ALL QUESTIONS in the entire database?')) return
        if (!window.confirm('Confirm second time: This will DELETE all rows from the question_bank table!')) return
        setActionLoading('purge-all')
        const result = await purgeAllQuestions()
        if (result && result.success) {
            alert('All questions have been purged from the database.')
            await refresh()
        } else {
            alert(`Purge Error: ${result?.error}`)
        }
        setActionLoading(null)
    }

    // Single Table Upload
    const handleUploadForTable = async () => {
        if (!uploadTarget || !uploadJson.trim()) return
        setActionLoading('upload')
        const result = await uploadQuestionsForTable(uploadTarget.game, uploadTarget.difficulty, uploadJson)
        if (result && !result.error) {
            setUploadJson('')
            setUploadTarget(null)
            alert(`Uploaded ${result.count} question(s) for ${uploadTarget.game.toUpperCase()}!`)
            await refresh()
        } else {
            alert(`Error: ${result?.error || 'Unknown error'}`)
        }
        setActionLoading(null)
    }

    const handleDeleteAll = async (gameType: string, difficulty: string) => {
        const count = getQuestionsForTable(gameType, difficulty).length
        if (!window.confirm(`Delete all ${count} ${difficulty} questions for ${gameType.toUpperCase()}?`)) return
        setActionLoading(`delall-${gameType}-${difficulty}`)
        await deleteAllQuestionsForTable(gameType, difficulty)
        await refresh()
        setActionLoading(null)
    }

    // Visible tables based on filter
    const visibleTableIds = selectedTableFilter === 'all'
        ? TABLE_GAME_IDS
        : TABLE_GAME_IDS.filter(id => id.toLowerCase() === selectedTableFilter.toLowerCase())

    return (
        <div className="space-y-6">
            {/* TOP METRIC CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#12121a] rounded-xl border border-blue-500/30 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-blue-400">{questions.length} / 201</p>
                    <p className="text-[10px] font-pixel text-blue-400/70 mt-1">TOTAL QUESTIONS</p>
                </div>
                <div className="bg-[#12121a] rounded-xl border border-green-500/30 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-green-400">{freshQuestions.length}</p>
                    <p className="text-[10px] font-pixel text-green-400/70 mt-1">FRESH UN-BURNED</p>
                </div>
                <div className="bg-[#12121a] rounded-xl border border-red-500/30 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-red-400">{burnedQuestions.length}</p>
                    <p className="text-[10px] font-pixel text-red-400/70 mt-1">BURNED QUESTIONS</p>
                </div>
                <div className="bg-[#12121a] rounded-xl border border-yellow-500/30 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-yellow-400">
                        {TABLE_GAME_IDS.filter(id => getQuestionsForTable(id).length >= (id === 'final' ? 1 : 20)).length} / 11
                    </p>
                    <p className="text-[10px] font-pixel text-yellow-400/70 mt-1">TABLES COMPLETE</p>
                </div>
            </div>

            {/* UNMISSABLE BULK PUSH OF QUESTIONS IN JSON FORMAT */}
            <div className="bg-[#131422] rounded-xl border-2 border-blue-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                            <FileJson className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-pixel text-blue-400 tracking-wider">
                                    BULK PUSH QUESTIONS (JSON FORMAT)
                                </h3>
                                <span className="text-[9px] font-mono bg-blue-900/40 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-bold">
                                    CORE TOOL
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                                Push the complete 201-question PDF bank, upload a <code className="text-yellow-400">.json</code> file, or paste custom JSON array.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* 1-CLICK PUSH ALL 201 PDF QUESTIONS */}
                        <button
                            onClick={handleOneClickPushDefault}
                            disabled={actionLoading === 'one-click-push'}
                            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs font-pixel rounded-lg transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50 cursor-pointer"
                            title="Push all 201 verified questions from questions_all_tables_complete.json"
                        >
                            <Sparkles className="w-4 h-4 shrink-0" />
                            <span>{actionLoading === 'one-click-push' ? 'PUSHING 201...' : '⚡ 1-CLICK PUSH 201 PDF QUESTIONS'}</span>
                        </button>

                        <button
                            onClick={() => setShowBulkPanel(!showBulkPanel)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-pixel rounded-lg transition-colors cursor-pointer"
                        >
                            {showBulkPanel ? 'HIDE JSON EDITOR ▲' : 'OPEN JSON EDITOR ▼'}
                        </button>
                    </div>
                </div>

                {/* BULK PANEL BODY */}
                {showBulkPanel && (
                    <div className="mt-5 space-y-4 animate-in fade-in">
                        {/* File Picker & Format Instructions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-300 font-mono leading-relaxed">
                                <span className="text-yellow-400 font-bold">Option 1:</span> Load file from disk (<code className="text-retro-gold font-bold">questions_all_tables_complete.json</code>)
                                <span className="mx-2 text-gray-600">|</span>
                                <span className="text-yellow-400 font-bold">Option 2:</span> Paste JSON array directly below.
                            </div>
                            <label className="px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-2 shrink-0">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Choose .json File</span>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* JSON TEXTAREA */}
                        <textarea
                            value={bulkJson}
                            onChange={(e) => setBulkJson(e.target.value)}
                            placeholder={`Paste JSON array of questions here in JSON format. Example:\n[\n  {\n    "title": "Table 6: Baccarat - Q1 (Standard)",\n    "game_type": "BACCARAT",\n    "difficulty": "STANDARD",\n    "description": "Give SQL query to get students whose marks > 40",\n    "options": ["A) SELECT ...", "B) SELECT ...", "C) SELECT ...", "D) SELECT ..."],\n    "expected_output": "SELECT * FROM students WHERE marks > 40;",\n    "correct_option": "B"\n  }\n]`}
                            className="w-full h-48 bg-black/60 border border-blue-500/30 rounded-xl p-4 text-xs font-mono text-blue-100 placeholder:text-gray-600 focus:border-blue-400 focus:outline-none resize-y"
                        />

                        {/* LIVE PARSE BREAKDOWN MATRIX */}
                        {bulkStats && (
                            <div className="p-3.5 rounded-xl border font-mono text-xs transition-all bg-black/50 border-white/10">
                                {bulkStats.isValid ? (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2 text-green-400 font-bold">
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            <span>VALID JSON ARRAY: Detected {bulkStats.total} question(s) ready to push!</span>
                                        </div>
                                        {/* Table Breakdown Chips */}
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {Object.entries(bulkStats.byGame).map(([game, count]) => (
                                                <span key={game} className="text-[10px] bg-blue-950/60 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded font-mono">
                                                    {game}: <strong>{count}</strong>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-red-400">
                                        <AlertTriangle className="w-4 h-4 text-red-400" />
                                        <span>Invalid JSON syntax. Ensure valid JSON array format starting with [ and ending with ].</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ACTION BAR */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleReshuffle}
                                    disabled={actionLoading === 'reshuffle'}
                                    className="px-3 py-2 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/30 text-xs font-pixel rounded-lg transition-colors cursor-pointer"
                                    title="Un-burn all questions"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> RESHUFFLE (UN-BURN) ALL
                                </button>
                                <button
                                    onClick={handlePurgeAll}
                                    disabled={actionLoading === 'purge-all' || questions.length === 0}
                                    className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs font-pixel rounded-lg transition-colors cursor-pointer"
                                    title="Delete all questions in DB"
                                >
                                    <Trash2 className="w-3.5 h-3.5 inline mr-1" /> PURGE ALL
                                </button>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setBulkJson('')}
                                    disabled={!bulkJson.trim()}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono rounded-lg transition-colors disabled:opacity-40"
                                >
                                    Clear Text
                                </button>
                                <button
                                    onClick={handleBulkCustomUpload}
                                    disabled={actionLoading === 'bulk-upload-submit' || !bulkStats?.isValid || bulkStats.total === 0}
                                    className="flex-1 sm:flex-none px-6 py-2.5 bg-retro-green hover:bg-white text-black font-bold text-xs font-pixel rounded-lg transition-all shadow-[0_0_15px_#39ff14] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {actionLoading === 'bulk-upload-submit' ? 'PUSHING TO DB...' : `PUSH ${bulkStats?.total || 0} QUESTIONS TO DATABASE ➤`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SINGLE TABLE MODAL (WHEN CLICKING UPLOAD ON A SPECIFIC TABLE) */}
            {uploadTarget && (
                <div className="bg-[#12121a] rounded-xl border border-blue-500/40 p-5 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-pixel text-blue-400 tracking-wider">
                            UPLOAD QUESTIONS FOR {uploadTarget.game.toUpperCase()} ({uploadTarget.difficulty})
                        </h4>
                        <button onClick={() => { setUploadTarget(null); setUploadJson('') }} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        value={uploadJson}
                        onChange={(e) => setUploadJson(e.target.value)}
                        placeholder={`[\n  {\n    "title": "Title",\n    "description": "...",\n    "starter": "...",\n    "test_cases": []\n  }\n]`}
                        className="w-full h-36 bg-black/60 border border-blue-900/40 rounded-lg p-3 text-xs font-mono text-blue-100 resize-none focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setUploadTarget(null); setUploadJson('') }} className="px-4 py-1.5 text-xs font-mono text-gray-400 hover:text-white">
                            Cancel
                        </button>
                        <button
                            onClick={handleUploadForTable}
                            disabled={actionLoading === 'upload' || !uploadJson.trim()}
                            className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-pixel rounded-lg transition-colors disabled:opacity-40"
                        >
                            Upload for Table
                        </button>
                    </div>
                </div>
            )}

            {/* FILTER & SEARCH BAR */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4 space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search */}
                    <div className="relative flex-grow">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search questions by title, problem text, or type..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Difficulty Filter */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-pixel">Diff:</span>
                        {(['ALL', 'STANDARD', 'HIGH'] as const).map(diff => (
                            <button
                                key={diff}
                                onClick={() => setDifficultyFilter(diff)}
                                className={`px-2.5 py-1 rounded text-[10px] font-pixel transition-colors cursor-pointer ${
                                    difficultyFilter === diff
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-black/40 text-gray-400 hover:text-white border border-white/5'
                                }`}
                            >
                                {diff}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={refresh}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-pixel rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>REFRESH</span>
                    </button>
                </div>

                {/* Table Quick-Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-[11px] font-mono scrollbar-thin">
                    <button
                        onClick={() => setSelectedTableFilter('all')}
                        className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                            selectedTableFilter === 'all'
                                ? 'bg-retro-gold text-black font-bold'
                                : 'bg-black/40 text-gray-400 hover:text-white border border-white/5'
                        }`}
                    >
                        ALL TABLES ({questions.length})
                    </button>
                    {TABLE_GAME_IDS.map(gameId => {
                        const meta = TABLE_METADATA[gameId]
                        const count = getQuestionsForTable(gameId).length
                        const isSelected = selectedTableFilter.toLowerCase() === gameId.toLowerCase()
                        const expected = meta.expectedCount
                        return (
                            <button
                                key={gameId}
                                onClick={() => setSelectedTableFilter(gameId)}
                                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                                    isSelected
                                        ? 'bg-blue-600 text-white font-bold'
                                        : 'bg-black/40 text-gray-400 hover:text-white border border-white/5'
                                }`}
                            >
                                <span>{meta.icon}</span>
                                <span>{meta.sublabel}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                    count >= expected ? 'bg-green-950/60 text-green-300' : 'bg-yellow-950/60 text-yellow-300'
                                }`}>
                                    {count}/{expected}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* PER-TABLE SECTIONS "ACCORDING TO THE QUESTION" */}
            <div className="space-y-4">
                {visibleTableIds.map(gameId => {
                    const meta = TABLE_METADATA[gameId]
                    const tableQuestions = getQuestionsForTable(gameId)
                    const standardQs = getQuestionsForTable(gameId, 'STANDARD')
                    const highQs = getQuestionsForTable(gameId, 'HIGH')
                    const totalExpected = meta.expectedCount
                    const loaded = tableQuestions.length
                    const isFull = loaded >= totalExpected
                    const isEmpty = loaded === 0

                    // Filter by search query if any
                    const filterBySearch = (list: any[]) => {
                        if (!searchQuery.trim()) return list
                        const qLower = searchQuery.toLowerCase()
                        return list.filter(q =>
                            (q.title || '').toLowerCase().includes(qLower) ||
                            (q.problem_statement || '').toLowerCase().includes(qLower)
                        )
                    }

                    const filteredStandard = filterBySearch(standardQs)
                    const filteredHigh = filterBySearch(highQs)
                    const isExpanded = expandedTable === gameId || selectedTableFilter !== 'all'

                    return (
                        <div key={gameId} className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden shadow-lg">
                            {/* TABLE HEADER ACCORDING TO QUESTION TYPE */}
                            <button
                                onClick={() => setExpandedTable(isExpanded ? null : gameId)}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl shrink-0">{meta.icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-pixel text-white tracking-wide">{meta.label}</span>
                                            <span className="text-xs text-retro-gold font-mono font-bold">({meta.sublabel})</span>
                                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                                                {meta.typeLabel}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-mono mt-0.5 hidden sm:block">
                                            {meta.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-xs font-mono px-2.5 py-1 rounded font-bold ${
                                        isFull ? 'bg-green-900/40 text-green-400 border border-green-500/30' :
                                        isEmpty ? 'bg-red-900/40 text-red-400 border border-red-500/30' :
                                        'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30'
                                    }`}>
                                        {loaded}/{totalExpected}
                                    </span>
                                    <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90 text-yellow-400' : ''}`} />
                                </div>
                            </button>

                            {/* EXPANDED CONTENT ACCORDING TO QUESTION */}
                            {isExpanded && (
                                <div className="border-t border-white/5 px-5 py-4 bg-black/30">
                                    <div className={`grid grid-cols-1 gap-6 ${gameId === 'final' ? '' : 'lg:grid-cols-2'}`}>
                                        {/* Render Standard and High Roller Columns */}
                                        {(gameId === 'final' ? ['STANDARD'] : (
                                            difficultyFilter === 'STANDARD' ? ['STANDARD'] :
                                            difficultyFilter === 'HIGH' ? ['HIGH'] :
                                            ['STANDARD', 'HIGH']
                                        )).map(diff => {
                                            const diffQs = diff === 'STANDARD' ? filteredStandard : filteredHigh
                                            const totalInDiff = diff === 'STANDARD' ? standardQs.length : highQs.length
                                            const expected = gameId === 'final' ? 1 : 10
                                            const isHigh = diff === 'HIGH'
                                            const diffColor = gameId === 'final' ? 'purple' : (isHigh ? 'red' : 'green')
                                            const diffLabel = gameId === 'final'
                                                ? '👑 FINAL SHOWDOWN (LeetCode 239)'
                                                : (isHigh ? '🔥 HIGH ROLLER (10 Questions)' : '📋 STANDARD (10 Questions)')

                                            return (
                                                <div key={diff} className="space-y-3">
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                        <h5 className={`text-[11px] font-pixel tracking-wider text-${diffColor}-400 flex items-center gap-2`}>
                                                            <span>{diffLabel}</span>
                                                            <span className="text-[10px] font-mono text-gray-400 font-bold">
                                                                ({totalInDiff}/{expected})
                                                            </span>
                                                        </h5>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setUploadTarget({ game: gameId, difficulty: diff })}
                                                                className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-pixel bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 rounded border border-blue-500/30 transition-all cursor-pointer"
                                                            >
                                                                <Upload className="w-3 h-3" /> UPLOAD
                                                            </button>
                                                            {totalInDiff > 0 && (
                                                                <button
                                                                    onClick={() => handleDeleteAll(gameId, diff)}
                                                                    disabled={!!actionLoading?.startsWith('delall')}
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-pixel bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded border border-red-500/30 transition-all disabled:opacity-40 cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-3 h-3" /> CLEAR
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* QUESTION LIST FOR THIS COLUMN */}
                                                    <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden max-h-[60vh] overflow-y-auto divide-y divide-white/5">
                                                        {diffQs.length === 0 ? (
                                                            <div className="text-center text-gray-500 text-xs py-8 font-mono">
                                                                {searchQuery ? 'No matching questions found.' : `No ${diff.toLowerCase()} questions uploaded yet. Use Bulk Push above.`}
                                                            </div>
                                                        ) : (
                                                            diffQs.map((q: any) => {
                                                                const isQuestionOpen = selectedQuestionId === q.id
                                                                const rawTc = q.test_cases
                                                                const options = q.options || (rawTc && !Array.isArray(rawTc) ? rawTc.options : null)
                                                                const clues = q.clues || (rawTc && !Array.isArray(rawTc) ? rawTc.clues : null)
                                                                const expected = q.expected_output || (rawTc && !Array.isArray(rawTc) ? rawTc.expected_output : null)
                                                                const correctOption = q.correct_option || (rawTc && !Array.isArray(rawTc) ? rawTc.correct_option : null)
                                                                const solPy = q.solution_python || (rawTc && !Array.isArray(rawTc) ? rawTc.solution_python : null)
                                                                const solC = q.solution_c || (rawTc && !Array.isArray(rawTc) ? rawTc.solution_c : null)
                                                                const cases = Array.isArray(rawTc) ? rawTc : (rawTc?.cases || [])

                                                                return (
                                                                    <div key={q.id} className={`transition-colors ${q.is_used ? 'opacity-50' : ''} ${isQuestionOpen ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                                                                        {/* QUESTION SUMMARY ROW */}
                                                                        <div className="flex items-start justify-between px-3.5 py-3 text-xs">
                                                                            <div
                                                                                onClick={() => setSelectedQuestionId(isQuestionOpen ? null : q.id)}
                                                                                className="flex-grow min-w-0 mr-2 cursor-pointer group"
                                                                            >
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isQuestionOpen ? 'rotate-90 text-yellow-400' : 'group-hover:text-white'}`} />
                                                                                    <span className="font-mono text-white text-[11px] font-bold group-hover:text-yellow-400 transition-colors">
                                                                                        {q.title}
                                                                                    </span>

                                                                                    {/* Badges */}
                                                                                    {q.is_used && (
                                                                                        <span className="text-[7px] font-pixel text-red-400 bg-red-900/30 border border-red-500/30 px-1.5 py-0.5 rounded">BURNED</span>
                                                                                    )}
                                                                                    {q.is_active && (
                                                                                        <span className="text-[7px] font-pixel text-green-400 bg-green-900/30 border border-green-500/30 px-1.5 py-0.5 rounded">LIVE</span>
                                                                                    )}

                                                                                    {/* Question Format Badge */}
                                                                                    {q.game_type?.toUpperCase() === 'BACCARAT' && (
                                                                                        <span className="text-[7px] font-mono text-cyan-300 bg-cyan-900/30 border border-cyan-500/30 px-1.5 rounded">
                                                                                            SQL MCQ ({options?.length || 4} OPTIONS)
                                                                                        </span>
                                                                                    )}
                                                                                    {(q.game_type?.toUpperCase() === 'CRAPS' || q.game_type?.toUpperCase() === 'COINFLIP') && (
                                                                                        <span className="text-[7px] font-mono text-yellow-300 bg-yellow-900/30 border border-yellow-500/30 px-1.5 rounded">
                                                                                            3 CLUES LADDER
                                                                                        </span>
                                                                                    )}
                                                                                    {q.game_type?.toUpperCase() === 'ROULETTE' && (
                                                                                        <span className="text-[7px] font-mono text-amber-300 bg-amber-900/30 border border-amber-500/30 px-1.5 rounded">
                                                                                            ORACLE OUTPUT: {expected || 'N/A'}
                                                                                        </span>
                                                                                    )}
                                                                                    {q.game_type?.toUpperCase() === 'FINAL' && (
                                                                                        <span className="text-[7px] font-mono text-purple-300 bg-purple-900/30 border border-purple-500/30 px-1.5 rounded">
                                                                                            LEETCODE 239 HARD
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Problem Snippet */}
                                                                                {q.problem_statement && (
                                                                                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 pl-5 font-mono leading-relaxed">
                                                                                        {q.problem_statement}
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            {/* Actions */}
                                                                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                                                                <button
                                                                                    onClick={() => handleToggle(q.id, q.is_active)}
                                                                                    disabled={!!actionLoading?.startsWith('toggle')}
                                                                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                                                                    title={q.is_active ? 'Deactivate' : 'Activate'}
                                                                                >
                                                                                    {q.is_active
                                                                                        ? <ToggleRight className="w-4 h-4 text-green-400" />
                                                                                        : <ToggleLeft className="w-4 h-4 text-gray-600" />
                                                                                    }
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleBurn(q.id)}
                                                                                    disabled={q.is_used || !!actionLoading?.startsWith('burn')}
                                                                                    className="p-1 rounded hover:bg-red-900/20 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-20"
                                                                                    title="Burn question"
                                                                                >
                                                                                    <Flame className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                                                    disabled={!!actionLoading?.startsWith('del-')}
                                                                                    className="p-1 rounded hover:bg-red-900/20 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-20"
                                                                                    title="Delete question"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* EXPANDED DETAILED INSPECTOR "ACCORDING TO THE QUESTION" */}
                                                                        {isQuestionOpen && (
                                                                            <div className="px-5 py-4 bg-black/60 border-t border-white/10 space-y-4 font-mono text-xs animate-in fade-in">
                                                                                {/* Full Problem Statement */}
                                                                                <div>
                                                                                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-pixel block mb-1">
                                                                                        Problem Statement:
                                                                                    </span>
                                                                                    <div className="text-gray-200 text-xs bg-black/50 p-3 rounded-lg border border-white/5 whitespace-pre-wrap leading-relaxed">
                                                                                        {q.problem_statement || 'No problem statement provided.'}
                                                                                    </div>
                                                                                </div>

                                                                                {/* BACCARAT: SQL 4-OPTION MULTIPLE CHOICE QUESTION */}
                                                                                {options && Array.isArray(options) && options.length > 0 && (
                                                                                    <div className="space-y-2 bg-cyan-950/20 p-3.5 rounded-xl border border-cyan-500/30">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-[10px] uppercase tracking-widest text-cyan-300 font-pixel">
                                                                                                📋 BACCARAT SQL MULTIPLE-CHOICE OPTIONS:
                                                                                            </span>
                                                                                            {correctOption && (
                                                                                                <span className="text-[10px] bg-green-900/60 text-green-300 border border-green-500/40 px-2 py-0.5 rounded font-pixel">
                                                                                                    CORRECT KEY: OPTION {correctOption}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="grid grid-cols-1 gap-1.5">
                                                                                            {options.map((opt: string, optIdx: number) => {
                                                                                                const optLetter = opt.trim().slice(0, 1).toUpperCase()
                                                                                                const isCorrect = (correctOption && optLetter === correctOption.toUpperCase()) ||
                                                                                                    (expected && (opt === expected || opt.includes(expected) || expected.includes(opt.slice(3).trim())))
                                                                                                return (
                                                                                                    <div
                                                                                                        key={optIdx}
                                                                                                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                                                                                                            isCorrect
                                                                                                                ? 'bg-green-950/50 border-green-500/60 text-green-200 font-bold'
                                                                                                                : 'bg-black/40 border-white/5 text-gray-300'
                                                                                                        }`}
                                                                                                    >
                                                                                                        <span>{opt}</span>
                                                                                                        {isCorrect && (
                                                                                                            <span className="text-[9px] bg-green-900/80 text-green-300 px-2 py-0.5 rounded border border-green-500/50 font-pixel">
                                                                                                                ✓ CORRECT ANSWER
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* CRAPS & COIN FLIP: 3 PROGRESSIVE CLUES LADDER */}
                                                                                {clues && Array.isArray(clues) && clues.length > 0 && (
                                                                                    <div className="space-y-2 bg-yellow-950/20 p-3.5 rounded-xl border border-yellow-500/30">
                                                                                        <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-pixel block">
                                                                                            🪜 3 PROGRESSIVE CLUES LADDER (HINT SYSTEM):
                                                                                        </span>
                                                                                        <div className="space-y-2">
                                                                                            {clues.map((clue: string, cIdx: number) => {
                                                                                                const penalty = cIdx === 0 ? '10%' : cIdx === 1 ? '30%' : '50%'
                                                                                                return (
                                                                                                    <div key={cIdx} className="p-3 bg-black/50 border border-yellow-500/20 rounded-lg text-xs space-y-1">
                                                                                                        <div className="flex items-center justify-between text-[10px] font-pixel text-yellow-400">
                                                                                                            <span>💡 CLUE {cIdx + 1}</span>
                                                                                                            <span className="bg-yellow-900/40 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/30">
                                                                                                                PENALTY: {penalty} DEDUCTION
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <p className="text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">{clue}</p>
                                                                                                    </div>
                                                                                                )
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* ROULETTE / ORACLE: EXPECTED EXACT OUTPUT KEY */}
                                                                                {expected && (!options || options.length === 0) && (
                                                                                    <div className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/30 space-y-2">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-pixel">
                                                                                                🔮 ORACLE ANSWER KEY (EXACT EXPECTED OUTPUT):
                                                                                            </span>
                                                                                            <button
                                                                                                onClick={() => copyToClipboard(expected, `exp-${q.id}`)}
                                                                                                className="text-[9px] font-mono text-amber-300 hover:text-white flex items-center gap-1 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer"
                                                                                            >
                                                                                                <Copy className="w-3 h-3" />
                                                                                                <span>{copiedKey === `exp-${q.id}` ? 'COPIED!' : 'COPY ANSWER'}</span>
                                                                                            </button>
                                                                                        </div>
                                                                                        <div className="bg-black/80 border border-amber-500/40 text-amber-300 p-3 rounded-lg text-xs font-mono font-bold">
                                                                                            <code>{expected}</code>
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* STARTER CODE */}
                                                                                {q.starter_code && (
                                                                                    <div>
                                                                                        <div className="flex items-center justify-between mb-1">
                                                                                            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-pixel">
                                                                                                Starter Code Template:
                                                                                            </span>
                                                                                            <button
                                                                                                onClick={() => copyToClipboard(q.starter_code, `sc-${q.id}`)}
                                                                                                className="text-[9px] font-mono text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                                                                            >
                                                                                                <Copy className="w-3 h-3" />
                                                                                                <span>{copiedKey === `sc-${q.id}` ? 'COPIED!' : 'Copy Code'}</span>
                                                                                            </button>
                                                                                        </div>
                                                                                        <pre className="bg-black/70 p-3 rounded-lg border border-white/5 text-[11px] text-green-300 font-mono overflow-x-auto max-h-48 leading-relaxed">
                                                                                            {q.starter_code}
                                                                                        </pre>
                                                                                    </div>
                                                                                )}

                                                                                {/* REFERENCE SOLUTIONS (PYTHON / C) */}
                                                                                {(solPy || solC) && (
                                                                                    <div className="space-y-2 bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30">
                                                                                        <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-pixel block">
                                                                                            💡 VERIFIED REFERENCE SOLUTIONS:
                                                                                        </span>
                                                                                        {solPy && (
                                                                                            <div>
                                                                                                <span className="text-[9px] text-gray-400 font-mono block mb-1">Python Solution:</span>
                                                                                                <pre className="bg-black/70 p-2.5 rounded-lg border border-white/5 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-36">
                                                                                                    {solPy}
                                                                                                </pre>
                                                                                            </div>
                                                                                        )}
                                                                                        {solC && (
                                                                                            <div>
                                                                                                <span className="text-[9px] text-gray-400 font-mono block mb-1">C Solution:</span>
                                                                                                <pre className="bg-black/70 p-2.5 rounded-lg border border-white/5 text-[11px] text-cyan-300 font-mono overflow-x-auto max-h-36">
                                                                                                    {solC}
                                                                                                </pre>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {/* TEST CASES */}
                                                                                {cases.length > 0 && (
                                                                                    <div>
                                                                                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-pixel block mb-1">
                                                                                            Unit Test Cases ({cases.length}):
                                                                                        </span>
                                                                                        <div className="space-y-1">
                                                                                            {cases.map((tc: any, tcIdx: number) => (
                                                                                                <div key={tcIdx} className="flex items-center gap-2 text-[10px] bg-black/40 px-2.5 py-1.5 rounded border border-white/5 font-mono">
                                                                                                    <span className="text-gray-500 font-bold">In:</span>
                                                                                                    <span className="text-gray-300 truncate max-w-sm">{tc.input}</span>
                                                                                                    <span className="text-gray-500 font-bold">→ Out:</span>
                                                                                                    <span className="text-retro-gold truncate">{tc.expected}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ========================================
// TAB D: "THE EYE" — Leaderboard & Analytics
// ========================================
function TheEye() {
    const [leaderboard, setLeaderboard] = useState<any[]>([])
    const [analytics, setAnalytics] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setLoading(true)
        const [lb, an] = await Promise.all([getLeaderboard(), getAnalytics()])
        if (lb && !lb.error) setLeaderboard(lb.leaderboard || [])
        if (an && !an.error) setAnalytics(an)
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    useEffect(() => {
        const poll = setInterval(() => { refresh() }, 5000)
        return () => clearInterval(poll)
    }, [refresh])

    const maxBalance = leaderboard[0]?.wallet_balance || 1
    const badgeCount = (t: any) => Object.values((t.stamps as Record<string, boolean>) || {}).filter(Boolean).length
    // 2nd leaderboard: Total = (badges x 250) + credits; equal totals -> more badges first
    const totalOf = (t: any) => badgeCount(t) * 250 + (t.wallet_balance || 0)
    const byTotal = [...leaderboard].sort((a, b) => totalOf(b) - totalOf(a) || badgeCount(b) - badgeCount(a))

    return (
        <div className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                    { label: 'TOTAL ECONOMY', value: `$${analytics?.totalEconomy || 0}`, color: 'text-yellow-400', border: 'border-yellow-900/30' },
                    { label: 'AVG BALANCE', value: `$${analytics?.avgBalance || 0}`, color: 'text-blue-400', border: 'border-blue-900/30' },
                    { label: 'HIGHEST', value: `$${analytics?.maxBalance || 0}`, color: 'text-green-400', border: 'border-green-900/30' },
                    { label: 'LOWEST', value: `$${analytics?.minBalance || 0}`, color: 'text-red-400', border: 'border-red-900/30' },
                    { label: 'TEAMS', value: analytics?.teamCount || 0, color: 'text-purple-400', border: 'border-purple-900/30' },
                ].map((stat, i) => (
                    <div key={i} className={`bg-[#12121a] rounded-xl border ${stat.border} p-4 text-center`}>
                        <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] font-pixel text-gray-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Wallet Distribution (Bar Graph) */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-pixel text-gray-400 tracking-widest uppercase flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Credits Leaderboard (Most Credits First)
                    </h3>
                    <button onClick={refresh} className="text-gray-600 hover:text-white transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {leaderboard.length === 0 ? (
                        <p className="text-xs text-gray-500 font-mono py-4 text-center">No teams have logged in or played yet.</p>
                    ) : (
                        leaderboard.map((team, i) => {
                            const pct = maxBalance > 0 ? (team.wallet_balance / maxBalance) * 100 : 0
                            return (
                                <div key={team.id} className="flex items-center gap-3">
                                    <span className={`w-6 text-right text-xs font-mono shrink-0
                      ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                                    </span>
                                    <span className="w-24 text-xs font-mono text-gray-400 truncate shrink-0">{team.access_code}</span>
                                    <div className="flex-grow bg-black/30 rounded-full h-5 overflow-hidden relative">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                                                i === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-300' :
                                                    i === 2 ? 'bg-gradient-to-r from-orange-700 to-orange-400' :
                                                        'bg-gradient-to-r from-blue-900 to-blue-600'
                                                }`}
                                            style={{ width: `${Math.max(pct, 2)}%` }}
                                        />
                                    </div>
                                    <span className="w-16 text-right text-xs font-mono text-white shrink-0 font-bold">${team.wallet_balance}</span>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* 2nd LEADERBOARD: Total = (badges x 250) + credits */}
            <div className="bg-[#12121a] rounded-xl border border-yellow-500/30 overflow-hidden">
                <div className="px-4 py-3 bg-black/30 border-b border-white/5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-xs font-pixel text-yellow-400 tracking-widest">
                        <Trophy className="w-4 h-4" /> TOTAL LEADERBOARD
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">Total = (Badges × 250) + Credits</span>
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                    {byTotal.length === 0 ? (
                        <p className="text-xs text-gray-500 font-mono py-6 text-center">No teams have logged in or played yet.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-[3rem_1fr_auto_4rem_5rem_6rem] gap-3 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-600 border-b border-white/5">
                                <span>#</span><span>Team</span><span>Badges</span><span className="text-right">Count</span><span className="text-right">Credits</span><span className="text-right">Total</span>
                            </div>
                            {byTotal.map((team, i) => {
                                const stamps = (team.stamps as Record<string, boolean>) || {}
                                return (
                                    <div key={team.id} className={`grid grid-cols-[3rem_1fr_auto_4rem_5rem_6rem] items-center gap-3 px-4 py-3 border-b border-white/5 text-sm font-mono ${i < 3 ? 'bg-yellow-900/5' : ''}`}>
                                        <span className={i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}>
                                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                                        </span>
                                        <span className="text-white truncate">{team.access_code}</span>
                                        <div className="hidden sm:flex gap-1">
                                            {GAME_TYPES.map(g => (
                                                <span key={g} className={`w-4 h-4 text-[8px] flex items-center justify-center rounded ${stamps[g] ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-700'}`}>
                                                    {stamps[g] ? '★' : '○'}
                                                </span>
                                            ))}
                                        </div>
                                        <span className="text-right text-gray-300">🏅 {badgeCount(team)}</span>
                                        <span className="text-right text-gray-300">${team.wallet_balance}</span>
                                        <span className="text-right font-bold text-green-400">{totalOf(team)}</span>
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
