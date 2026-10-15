/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from "react"
import { useFormState } from "react-dom"
import { loginAction } from "./actions"
import { Gamepad2, Shield, Sparkles } from "lucide-react"
import { AVATAR_LIST, getAvatarUrl } from "@/lib/avatars"

const initialState = {
  error: null as string | null,
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState)
  const [accessCode, setAccessCode] = useState("")

  // A fresh login always starts in THE GRAND LOBBY - forget any saved wing/position
  const resetMapPosition = () => {
    try {
      ;['cs_map_scene', 'cs_map_pos', 'cs_map_dir'].forEach(k => localStorage.removeItem(k))
    } catch {}
  }
  useEffect(() => { resetMapPosition() }, [])
  const submitLogin = (formData: FormData) => {
    resetMapPosition()
    formAction(formData)
  }

  const handleSelectSyndicate = (code: string) => {
    setAccessCode(code)
    const input = document.getElementById("access_code") as HTMLInputElement
    if (input) {
      input.value = code
      input.focus()
    }
  }

  const playingSyndicates = AVATAR_LIST.filter(a => !a.isTest)
  const testSyndicates = AVATAR_LIST.filter(a => a.isTest)

  const matchedSyndicate = AVATAR_LIST.find((a) => {
    if (!accessCode) return false
    const clean = accessCode.trim().toUpperCase()
    if (a.code === clean || a.code === clean.replace(/[\s-]+/g, '_')) return true
    if (a.name.toUpperCase() === clean || a.name.toUpperCase().replace(/[\s-]+/g, '_') === clean.replace(/[\s-]+/g, '_')) return true
    const numMatch = clean.match(/^(?:TEAM|T)?\s*0*([1-9]|[12][0-9]|3[0-2])$/i)
    if (numMatch && parseInt(numMatch[1], 10) === a.teamNum) return true
    const testMatch = clean.match(/^(?:TEST)\s*0*([12])$/i)
    if (testMatch && parseInt(testMatch[1], 10) + 30 === a.teamNum) return true
    return false
  })

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full px-4 py-12 gap-10 animate-fade-in bg-[#0b0c10]">

      {/* ── HEADER ── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-900/30 border border-yellow-500/40 rounded-full text-yellow-400 text-xs font-pixel">
          <Sparkles className="w-3.5 h-3.5" />
          <span>UNDERGROUND CASINO SYNDICATES</span>
        </div>
        <h1 className="text-4xl md:text-6xl text-retro-gold drop-shadow-[4px_4px_0_#000] font-pixel tracking-wider">
          CODESPRINT&apos;26
        </h1>
        <p className="text-retro-green text-xs md:text-sm tracking-widest font-pixel uppercase">
          CHOOSE YOUR CARTEL • ENTER THE ARENA
        </p>
      </div>

      {/* ── LOGIN CARD ── */}
      <div className="bg-[#161224] border-4 border-retro-gold shadow-pixel p-8 w-full max-w-md relative rounded-lg">
        {/* Decorative corner pixels */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-[#161224] border-t-4 border-l-4 border-retro-gold" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#161224] border-t-4 border-r-4 border-retro-gold" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#161224] border-b-4 border-l-4 border-retro-gold" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#161224] border-b-4 border-r-4 border-retro-gold" />

        <form action={submitLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="access_code" className="text-xs uppercase tracking-widest text-retro-gold font-pixel">
                Syndicate Code
              </label>
              <span className="text-[10px] text-gray-500 font-mono">Team 1–30 or Code</span>
            </div>
            <input
              id="access_code"
              name="access_code"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="E.G. EL_PADRINO OR 1"
              autoComplete="off"
              className="bg-black text-white p-4 font-pixel text-center text-sm uppercase focus:outline-none focus:ring-4 focus:ring-retro-green border-2 border-white/20 placeholder:text-white/25 rounded"
            />
          </div>

          {/* DYNAMIC AVATAR SPOTLIGHT PREVIEW ON LOGIN */}
          {matchedSyndicate ? (
            <div className="flex items-center gap-4 p-3 bg-yellow-950/40 border-2 border-yellow-400/80 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-fade-in">
              <div className="w-14 h-14 rounded-md border-2 border-yellow-400 overflow-hidden bg-black/60 shrink-0">
                <img
                  src={getAvatarUrl(matchedSyndicate.seed)}
                  alt={matchedSyndicate.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[9px] font-mono uppercase text-green-400 tracking-wider font-bold">
                  ✓ YOUR DEDICATED AVATAR
                </span>
                <span className="text-sm font-pixel text-yellow-400 font-bold truncate">
                  {matchedSyndicate.name}
                </span>
                <span className="text-[10px] font-mono text-gray-300">
                  Team #{matchedSyndicate.teamNum} • Code: <code className="text-yellow-400">{matchedSyndicate.code}</code>
                </span>
              </div>
            </div>
          ) : accessCode.trim() ? (
            <div className="text-[10px] font-mono text-gray-400 text-center bg-black/40 p-2.5 rounded border border-white/10">
              Type team number (1–30) or cartel code (e.g. <span className="text-yellow-400">1</span> or <span className="text-yellow-400">EL_PADRINO</span>)
            </div>
          ) : null}

          <button
            type="submit"
            className="group relative bg-retro-green text-black py-4 px-6 font-bold hover:bg-white transition-colors shadow-pixel active:translate-y-1 active:shadow-none rounded"
          >
            <span className="flex items-center justify-center gap-3 font-pixel text-sm">
              START GAME <Gamepad2 className="w-5 h-5" />
            </span>
          </button>

          {/* Error Message */}
          {state?.error && (
            <div className="text-red-400 text-center text-xs bg-red-950/60 p-3 border border-red-500/50 font-pixel rounded animate-bounce">
              ⚠️ {state.error}
            </div>
          )}
        </form>

        <p className="text-[10px] text-gray-500 font-mono text-center mt-4">
          Click any syndicate card below to auto-fill your code
        </p>
      </div>

      {/* ── SYNDICATE DIRECTORY (30 TEAMS + 2 TEST) ── */}
      <div className="w-full max-w-6xl space-y-4 mt-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-retro-gold" />
            <h2 className="text-sm md:text-base font-pixel text-retro-gold tracking-widest uppercase">
              Syndicate Roster &amp; Avatar Directory (30 Teams)
            </h2>
          </div>
          <span className="text-xs font-mono text-gray-500">Each syndicate is bound to their avatar</span>
        </div>

        {/* 30 Playing Teams Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {playingSyndicates.map((syn) => {
            const isSelected = accessCode === syn.code || accessCode === String(syn.teamNum)
            return (
              <button
                key={syn.id}
                type="button"
                onClick={() => handleSelectSyndicate(syn.code)}
                className={`flex flex-col items-center p-3 rounded-lg border-2 text-center transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-yellow-900/40 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-105"
                    : "bg-[#14151f] border-white/10 hover:border-yellow-500/60 hover:bg-[#1c1d2b] hover:-translate-y-1"
                }`}
              >
                <div className="w-14 h-14 mb-2 relative rounded overflow-hidden bg-black/40 border border-white/10 group-hover:scale-105 transition-transform">
                  <img
                    src={getAvatarUrl(syn.seed)}
                    alt={syn.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-pixel text-white group-hover:text-yellow-400 truncate w-full mb-1">
                  {syn.name}
                </div>
                <span className="text-[9px] font-mono text-gray-500 bg-black/50 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-full">
                  #{syn.teamNum} • {syn.code}
                </span>
              </button>
            )
          })}
        </div>

        {/* 2 Test Teams */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Testing / Pit Boss Squads:
          </span>
          <div className="flex gap-3">
            {testSyndicates.map((syn) => (
              <button
                key={syn.id}
                type="button"
                onClick={() => handleSelectSyndicate(syn.code)}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-purple-500/40 hover:border-purple-400 rounded text-xs font-mono text-purple-300 transition-colors"
              >
                <img src={getAvatarUrl(syn.seed)} alt={syn.name} className="w-5 h-5 rounded" />
                <span>{syn.name}</span>
                <span className="text-[10px] text-purple-500 font-bold">({syn.code})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}