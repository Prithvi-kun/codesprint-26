/* eslint-disable @next/next/no-img-element */
import { supabaseAdmin } from '@/lib/supabase/server'
import { AVATAR_LIST, getAvatarUrl, AvatarInfo } from '@/lib/avatars'
import { selectAvatarAction } from './actions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Check, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

type TeamData = {
  id: string;
  access_code: string;
  avatar_id: number;
}

export default async function AvatarSelectionPage() {
  const cookieStore = cookies()
  const myTeamId = cookieStore.get('team_id')?.value

  if (!myTeamId) redirect('/')

  // 1. Fetch current team
  const { data: teamData, error } = await supabaseAdmin
    .from('teams')
    .select('id, access_code, avatar_id')
    .eq('id', myTeamId)
    .single()

  if (error || !teamData) {
    console.error("Error fetching team:", error)
    redirect('/')
  }

  const myTeam = teamData as TeamData

  // 2. Identify this team's designated avatar
  const myAssignedAvatar: AvatarInfo = AVATAR_LIST.find(a =>
    a.code === myTeam.access_code ||
    a.teamNum === myTeam.avatar_id ||
    a.id === myTeam.avatar_id
  ) || AVATAR_LIST[0]

  return (
    <div className="min-h-screen bg-[#0d0e15] text-white p-6 md:p-10 font-pixel animate-fade-in">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between mb-8 gap-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg border-2 border-yellow-500 overflow-hidden bg-black/50 shrink-0">
            <img
              src={getAvatarUrl(myAssignedAvatar.seed)}
              alt={myAssignedAvatar.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Logged In As</div>
            <h2 className="text-sm md:text-base text-yellow-400 font-bold truncate">
              {myAssignedAvatar.name}
            </h2>
            <span className="text-[10px] text-gray-400 font-mono">
              Team #{myAssignedAvatar.teamNum} • {myTeam.access_code}
            </span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-4xl text-retro-gold drop-shadow-[4px_4px_0_#000] tracking-wider">
            TEAM #{myAssignedAvatar.teamNum}: {myAssignedAvatar.name.toUpperCase()}
          </h1>
          <p className="text-retro-green text-xs tracking-widest uppercase">
            YOUR DESIGNATED SYNDICATE AVATAR
          </p>
        </div>

        <div className="flex justify-end items-center">
          <LogoutButton teamId={myTeamId} />
        </div>
      </div>

      {/* ── DESIGNATED AVATAR SPOTLIGHT ── */}
      <div className="max-w-5xl w-full mx-auto mb-10 bg-gradient-to-r from-yellow-950/40 via-[#181926] to-yellow-950/40 border-2 border-yellow-500/70 rounded-2xl p-6 md:p-8 shadow-[0_0_30px_rgba(234,179,8,0.25)] flex flex-col lg:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 min-w-0 flex-1">
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl border-4 border-yellow-400 overflow-hidden bg-black/60 shadow-[0_0_20px_rgba(234,179,8,0.4)] shrink-0 animate-bounce">
            <img
              src={getAvatarUrl(myAssignedAvatar.seed)}
              alt={myAssignedAvatar.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 right-1 bg-yellow-400 text-black text-[8px] font-bold px-1.5 py-0.5 rounded">
              #{myAssignedAvatar.teamNum}
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-900/40 border border-green-500/50 rounded text-green-400 text-[10px] tracking-widest uppercase">
              <ShieldCheck className="w-3.5 h-3.5" /> YOUR MANDATORY IDENTITY
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white tracking-wider truncate">
              {myAssignedAvatar.name}
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Syndicate Code: <span className="text-yellow-400 font-bold">{myTeam.access_code}</span> • Dedicated Avatar Locked
            </p>
          </div>
        </div>

        <form action={selectAvatarAction} className="shrink-0 w-full lg:w-auto flex justify-center">
          <input type="hidden" name="avatar_id" value={myAssignedAvatar.id} />
          <button
            type="submit"
            className="w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-retro-green hover:bg-white text-black font-bold text-xs md:text-sm rounded-xl transition-all shadow-[0_0_20px_#39ff14] hover:scale-105 active:scale-95 uppercase flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            CONFIRM &amp; ENTER CASINO &rarr;
          </button>
        </form>
      </div>

      {/* ── ALL AVATARS GRID (LOCKED EXCEPT USER'S) ── */}
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-xs text-gray-400 tracking-widest uppercase">
            All 32 Cartel Avatars (Your Team is Locked to #{myAssignedAvatar.teamNum})
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            30 Playing Teams + 2 Test Squads
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {AVATAR_LIST.map((avatar) => {
            const isMyAvatar = avatar.id === myAssignedAvatar.id
            const isLocked = !isMyAvatar

            return (
              <form key={avatar.id} action={selectAvatarAction} className="relative group">
                <input type="hidden" name="avatar_id" value={avatar.id} />

                <button
                  type="submit"
                  disabled={isLocked}
                  className={`
                    w-full relative p-3 border-2 rounded-xl transition-all flex flex-col items-center gap-3 text-center
                    ${isMyAvatar
                      ? 'border-yellow-400 bg-yellow-950/40 scale-105 shadow-[0_0_25px_rgba(234,179,8,0.5)] cursor-pointer'
                      : 'border-white/5 bg-[#12131c] opacity-40 cursor-not-allowed grayscale'
                    }
                  `}
                >
                  {/* AVATAR IMAGE */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                    <img
                      src={getAvatarUrl(avatar.seed)}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />

                    {/* LOCK ICON */}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <Lock className="w-6 h-6 text-red-400" />
                      </div>
                    )}

                    {/* CHECK ICON FOR USER */}
                    {isMyAvatar && (
                      <div className="absolute -top-1 -right-1 bg-retro-green text-black p-1 rounded-full border border-black shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* INFO TEXT */}
                  <div className="w-full">
                    <div className={`text-[10px] font-bold tracking-wider truncate mb-1 ${isMyAvatar ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {avatar.name}
                    </div>

                    {isMyAvatar ? (
                      <div className="text-[8px] bg-green-900/60 text-green-300 py-0.5 px-1.5 rounded border border-green-500/40 uppercase font-mono font-bold">
                        ★ YOUR AVATAR
                      </div>
                    ) : (
                      <div className="text-[8px] text-gray-600 truncate font-mono">
                        LOCKED
                      </div>
                    )}
                  </div>
                </button>
              </form>
            )
          })}
        </div>
      </div>

      {/* FOOTER CONFIRM BUTTON */}
      <div className="text-center mt-12">
        <form action={selectAvatarAction}>
          <input type="hidden" name="avatar_id" value={myAssignedAvatar.id} />
          <button className="bg-retro-green hover:bg-white text-black text-lg px-12 py-4 font-bold shadow-pixel hover:scale-105 active:scale-95 transition-transform uppercase rounded-xl cursor-pointer">
            ENTER THE CASINO WITH {myAssignedAvatar.name.toUpperCase()} &rarr;
          </button>
        </form>
      </div>

    </div>
  )
}