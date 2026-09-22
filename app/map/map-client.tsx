/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { AVATAR_LIST, getAvatarUrl } from '@/lib/avatars'
import LogoutButton from '@/components/LogoutButton'

// --- CONFIGURATION ---
const GRID_W = 34
const GRID_H = 64

// --- ASSETS ---
const DEALER_AVATAR = `https://api.dicebear.com/9.x/pixel-art/svg?seed=DEALER&backgroundColor=ffdfbf`

// --- TABLE CONFIG (per-game emoji & warm colors) ---
const TABLE_EMOJI: Record<string, string> = {
  slots: '🎰', roulette: '🎯', blackjack: '🃏', craps: '🎲', poker: '🕵️',
  baccarat: '🏦', dice: '🎲', highcard: '🃏', coinflip: '🪙', vault: '🔐', final: '🏆',
}
const TABLE_COLOR: Record<string, string> = {
  slots: '#B5A642', roulette: '#722F37', blackjack: '#1B5E3B', craps: '#6B4E1E', poker: '#4A7C59',
  baccarat: '#3A2E39', dice: '#5C3A21', highcard: '#1F3C4D', coinflip: '#8C6C3F', vault: '#2A303C', final: '#B5A642',
}

// ========================================================
// ROOM DEFINITIONS — Each table gets a walled room
// ========================================================
const ROOMS = [
  // Row 1
  { id: 'slots-room', x: 2, y: 2, w: 10, h: 8, floor: 'floor-felt', label: '🎰 SLOTS', wallType: 'wall-wood' },
  { id: 'roulette-room', x: 22, y: 2, w: 10, h: 8, floor: 'floor-felt', label: '🎯 ROULETTE', wallType: 'wall-wood' },
  // Row 2
  { id: 'blackjack-room', x: 2, y: 14, w: 10, h: 8, floor: 'floor-felt', label: '🃏 BLACKJACK', wallType: 'wall-walnut' },
  { id: 'craps-room', x: 22, y: 14, w: 10, h: 8, floor: 'floor-felt', label: '🎲 CRAPS', wallType: 'wall-walnut' },
  // Row 3
  { id: 'poker-room', x: 2, y: 26, w: 10, h: 8, floor: 'floor-felt', label: '🕵️ POKER', wallType: 'wall-wood' },
  { id: 'baccarat-room', x: 22, y: 26, w: 10, h: 8, floor: 'floor-felt', label: '🏦 BACCARAT', wallType: 'wall-wood' },
  // Row 4
  { id: 'dice-room', x: 2, y: 38, w: 10, h: 8, floor: 'floor-felt', label: '🎲 DICE', wallType: 'wall-walnut' },
  { id: 'highcard-room', x: 22, y: 38, w: 10, h: 8, floor: 'floor-felt', label: '🃏 HIGH CARD', wallType: 'wall-walnut' },
  // Row 5
  { id: 'coinflip-room', x: 2, y: 50, w: 10, h: 8, floor: 'floor-felt', label: '🪙 COIN FLIP', wallType: 'wall-wood' },
  { id: 'vault-room', x: 22, y: 50, w: 10, h: 8, floor: 'floor-felt', label: '🔐 THE VAULT', wallType: 'wall-wood' },
]

const FINAL_ROOMS = [
  { id: 'showdown-room', x: 8, y: 4, w: 18, h: 14, floor: 'floor-royal', label: '🏆 FINAL SHOWDOWN', wallType: 'wall-walnut' },
]

// Helper: generate wall tiles for a room (perimeter with door gap)
function generateRoomWalls(room: typeof ROOMS[0], doorSide: 'bottom' | 'right' | 'left' | 'top', doorOffset: number, doorWidth: number): { x: number, y: number }[] {
  const walls: { x: number, y: number }[] = []
  for (let x = room.x; x < room.x + room.w; x++) {
    for (let y = room.y; y < room.y + room.h; y++) {
      const isTop = y === room.y
      const isBottom = y === room.y + room.h - 1
      const isLeft = x === room.x
      const isRight = x === room.x + room.w - 1
      const isPerimeter = isTop || isBottom || isLeft || isRight

      if (!isPerimeter) continue

      // Check if this is the door gap
      let isDoor = false
      if (doorSide === 'bottom' && isBottom) {
        isDoor = x >= room.x + doorOffset && x < room.x + doorOffset + doorWidth
      } else if (doorSide === 'top' && isTop) {
        isDoor = x >= room.x + doorOffset && x < room.x + doorOffset + doorWidth
      } else if (doorSide === 'left' && isLeft) {
        isDoor = y >= room.y + doorOffset && y < room.y + doorOffset + doorWidth
      } else if (doorSide === 'right' && isRight) {
        isDoor = y >= room.y + doorOffset && y < room.y + doorOffset + doorWidth
      }

      if (!isDoor) {
        walls.push({ x, y })
      }
    }
  }
  return walls
}

// Generate all walls for Round 1
const ALL_WALLS_R1 = [
  // Border walls (top and bottom of entire map)
  ...Array.from({ length: GRID_W }, (_, x) => ({ x, y: 0 })),
  ...Array.from({ length: GRID_W }, (_, x) => ({ x, y: GRID_H - 1 })),
  ...Array.from({ length: GRID_H }, (_, y) => ({ x: 0, y })),
  ...Array.from({ length: GRID_H }, (_, y) => ({ x: GRID_W - 1, y })),
  // Room walls with doors
  ...generateRoomWalls(ROOMS[0], 'right', 3, 2),
  ...generateRoomWalls(ROOMS[1], 'left', 3, 2),
  ...generateRoomWalls(ROOMS[2], 'right', 3, 2),
  ...generateRoomWalls(ROOMS[3], 'left', 3, 2),
  ...generateRoomWalls(ROOMS[4], 'right', 3, 2),
  ...generateRoomWalls(ROOMS[5], 'left', 3, 2),
  ...generateRoomWalls(ROOMS[6], 'right', 3, 2),
  ...generateRoomWalls(ROOMS[7], 'left', 3, 2),
  ...generateRoomWalls(ROOMS[8], 'right', 3, 2),
  ...generateRoomWalls(ROOMS[9], 'left', 3, 2),
]

// Generate walls for Round 2 (Final Showdown)
const ALL_WALLS_R2 = [
  ...Array.from({ length: GRID_W }, (_, x) => ({ x, y: 0 })),
  ...Array.from({ length: GRID_W }, (_, x) => ({ x, y: GRID_H - 1 })),
  ...Array.from({ length: GRID_H }, (_, y) => ({ x: 0, y })),
  ...Array.from({ length: GRID_H }, (_, y) => ({ x: GRID_W - 1, y })),
  ...generateRoomWalls(FINAL_ROOMS[0], 'bottom', 8, 2), // Grand door at bottom-center
]

// Wall set for fast lookup
const wallSetR1 = new Set(ALL_WALLS_R1.map(w => `${w.x},${w.y}`))
const wallSetR2 = new Set(ALL_WALLS_R2.map(w => `${w.x},${w.y}`))

const TABLES = [
  // Row 1
  {
    id: 'T1', label: 'SLOTS', sublabel: 'Bug Bounty', route: 'slots', x: 5, y: 5,
    chairs: [{ id: 'c1', x: 4, y: 6 }, { id: 'c2', x: 8, y: 6 }, { id: 'c3', x: 6, y: 7 }],
    dealers: [{ x: 6, y: 4 }, { x: 7, y: 4 }]
  },
  {
    id: 'T2', label: 'ROULETTE', sublabel: 'Output Oracle', route: 'roulette', x: 25, y: 5,
    chairs: [{ id: 'c1', x: 24, y: 6 }, { id: 'c2', x: 28, y: 6 }, { id: 'c3', x: 26, y: 7 }],
    dealers: [{ x: 26, y: 4 }, { x: 27, y: 4 }]
  },
  // Row 2
  {
    id: 'T3', label: 'BLACKJACK', sublabel: 'Code Relay', route: 'blackjack', x: 5, y: 17,
    chairs: [{ id: 'c1', x: 4, y: 18 }, { id: 'c2', x: 8, y: 18 }, { id: 'c3', x: 6, y: 19 }],
    dealers: [{ x: 6, y: 16 }, { x: 7, y: 16 }]
  },
  {
    id: 'T4', label: 'CRAPS', sublabel: 'Debug Detective', route: 'craps', x: 25, y: 17,
    chairs: [{ id: 'c1', x: 24, y: 18 }, { id: 'c2', x: 28, y: 18 }, { id: 'c3', x: 26, y: 19 }],
    dealers: [{ x: 26, y: 16 }, { x: 27, y: 16 }]
  },
  // Row 3
  {
    id: 'T5', label: 'POKER', sublabel: 'Cipher Crack', route: 'poker', x: 5, y: 29,
    chairs: [{ id: 'c1', x: 4, y: 30 }, { id: 'c2', x: 8, y: 30 }, { id: 'c3', x: 6, y: 31 }],
    dealers: [{ x: 6, y: 28 }, { x: 7, y: 28 }]
  },
  {
    id: 'T6', label: 'BACCARAT', sublabel: 'SQL Heist', route: 'baccarat', x: 25, y: 29,
    chairs: [{ id: 'c1', x: 24, y: 30 }, { id: 'c2', x: 28, y: 30 }, { id: 'c3', x: 26, y: 31 }],
    dealers: [{ x: 26, y: 28 }, { x: 27, y: 28 }]
  },
  // Row 4
  {
    id: 'T7', label: 'DICE', sublabel: 'Stack Attack', route: 'dice', x: 5, y: 41,
    chairs: [{ id: 'c1', x: 4, y: 42 }, { id: 'c2', x: 8, y: 42 }, { id: 'c3', x: 6, y: 43 }],
    dealers: [{ x: 6, y: 40 }, { x: 7, y: 40 }]
  },
  {
    id: 'T8', label: 'HIGH CARD', sublabel: 'Complexity Clash', route: 'highcard', x: 25, y: 41,
    chairs: [{ id: 'c1', x: 24, y: 42 }, { id: 'c2', x: 28, y: 42 }, { id: 'c3', x: 26, y: 43 }],
    dealers: [{ x: 26, y: 40 }, { x: 27, y: 40 }]
  },
  // Row 5
  {
    id: 'T9', label: 'COIN FLIP', sublabel: 'Algorithm Auction', route: 'coinflip', x: 5, y: 53,
    chairs: [{ id: 'c1', x: 4, y: 54 }, { id: 'c2', x: 8, y: 54 }, { id: 'c3', x: 6, y: 55 }],
    dealers: [{ x: 6, y: 52 }, { x: 7, y: 52 }]
  },
  {
    id: 'T10', label: 'THE VAULT', sublabel: 'DSA Challenge', route: 'vault', x: 25, y: 53,
    chairs: [{ id: 'c1', x: 24, y: 54 }, { id: 'c2', x: 28, y: 54 }, { id: 'c3', x: 26, y: 55 }],
    dealers: [{ x: 26, y: 52 }, { x: 27, y: 52 }]
  },
]

const FINAL_TABLE = {
  id: 'FINAL', label: 'FINAL SHOWDOWN', sublabel: 'All In',
  route: 'final',
  x: 15, y: 9,
  chairs: [
    { id: 'c1', x: 14, y: 9 }, { id: 'c2', x: 14, y: 10 },
    { id: 'c3', x: 15, y: 12 }, { id: 'c4', x: 16, y: 12 }, { id: 'c5', x: 17, y: 12 },
    { id: 'c6', x: 18, y: 9 }, { id: 'c7', x: 18, y: 10 },
  ],
  dealers: [{ x: 16, y: 8 }, { x: 17, y: 8 }]
}

// --- DECORATIONS — Emoji furniture & plants ---
const DECORATIONS_R1: any[] = []

const DECORATIONS_R2: any[] = []

interface MapClientProps {
  userData: {
    id: string
    access_code: string
    wallet_balance: number
    avatar_id: number
    in_round_2?: boolean
  }
}

type Player = {
  id: string
  x: number
  y: number
  avatar_id: number
}

export default function MapClient({ userData }: MapClientProps) {
  const router = useRouter()
  const [CELL, setCELL] = useState(40)
  const [position, setPosition] = useState({ x: 17, y: 58 })
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [otherPlayers, setOtherPlayers] = useState<Record<string, Player>>({})
  const [nearTable, setNearTable] = useState<string | null>(null)

  const [isMoving, setIsMoving] = useState(false)
  // --- ROUND 2 STATE ---
  const [inRound2, setInRound2] = useState<boolean>(userData.in_round_2 || false)
  const [isRound2Open, setIsRound2Open] = useState<boolean>(false)
  const [showBetModal, setShowBetModal] = useState<boolean>(false)
  const [betAmount, setBetAmount] = useState<number | ''>(() => Math.min(500, userData.wallet_balance))
  const [isBetting, setIsBetting] = useState<boolean>(false)

  // --- HUD STATE ---
  const [walletBalance, setWalletBalance] = useState<number>(userData.wallet_balance)
  const [stamps, setStamps] = useState<Record<string, boolean>>({})
  const [history, setHistory] = useState<any[]>([])
  const [isWarning, setIsWarning] = useState<boolean>(false)
  const [showHistory, setShowHistory] = useState(false)

  // --- BROADCAST STATE ---
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null)

  // --- STATE REFS FOR EVENT LISTENERS ---
  const posRef = useRef(position)
  const dirRef = useRef(direction)
  const nearTableRef = useRef(nearTable)
  const inRound2Ref = useRef(inRound2)
  const isRound2OpenRef = useRef(isRound2Open)

  useEffect(() => { posRef.current = position }, [position])
  useEffect(() => { dirRef.current = direction }, [direction])
  useEffect(() => { nearTableRef.current = nearTable }, [nearTable])
  useEffect(() => { inRound2Ref.current = inRound2 }, [inRound2])
  useEffect(() => { isRound2OpenRef.current = isRound2Open }, [isRound2Open])

  const lastUpdate = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const moveTimeout = useRef<NodeJS.Timeout | null>(null)

  // --- RESPONSIVE CELL SIZING ---
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== 'undefined') {
        const vw = window.innerWidth
        setCELL(vw / GRID_W)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // --- CAMERA FOLLOW ---
  useEffect(() => {
    if (scrollRef.current) {
      const playerPixelX = position.x * CELL + (CELL / 2)
      const playerPixelY = position.y * CELL + (CELL / 2)
      const vw = scrollRef.current.clientWidth
      const vh = scrollRef.current.clientHeight
      scrollRef.current.scrollTo({
        left: playerPixelX - vw / 2 + 32,
        top: playerPixelY - vh / 2 + 32,
        behavior: 'smooth'
      })
    }
  }, [position, CELL])

  // --- GET MY AVATAR URL ---
  const mySeed = AVATAR_LIST.find(a => a.id === userData.avatar_id)?.seed || 'Felix'
  const mySpriteUrl = getAvatarUrl(mySeed)

  // --- COLLISION LOGIC (uses refs for always-fresh state) ---
  const isBlocked = (x: number, y: number) => {
    const r2 = inRound2Ref.current
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return true

    const wallSet = r2 ? wallSetR2 : wallSetR1
    if (wallSet.has(`${x},${y}`)) return true

    const activeTables = r2 ? [FINAL_TABLE] : TABLES
    for (const t of activeTables) {
      if (x >= t.x && x <= t.x + 2 && y >= t.y && y <= t.y + 1) return true
    }
    for (const t of activeTables) {
      for (const d of t.dealers) {
        if (x === d.x && y === d.y) return true
      }
    }

    // Block decorations
    const decos = r2 ? DECORATIONS_R2 : DECORATIONS_R1
    for (const d of decos) {
      if (x === d.x && y === d.y) return true
    }

    return false
  }

  const handleTeleportToRound2 = async () => {
    setInRound2(true)
    setPosition({ x: 17, y: 5 })
    const { updateRound2Status } = await import('@/app/actions')
    await updateRound2Status(userData.id, true)
  }

  const handleTeleportToRound1 = async () => {
    setInRound2(false)
    setPosition({ x: 17, y: 58 })
    const { updateRound2Status } = await import('@/app/actions')
    await updateRound2Status(userData.id, false)
  }

  // --- MULTIPLAYER P2P SYNC ---
  useEffect(() => {
    async function fetchHud() {
      const { fetchTeamHistory, unlockPlayer } = await import('@/app/actions')
      await unlockPlayer(userData.id)
      const teamData = await supabase.from('teams').select('stamps, wallet_balance').eq('id', userData.id).maybeSingle().then(res => res.data as any)
      if (teamData) {
        if (teamData.stamps) setStamps(teamData.stamps as Record<string, boolean>)
        setWalletBalance(teamData.wallet_balance)
      }
      const txData = await fetchTeamHistory(userData.id)
      if (txData.history) setHistory(txData.history)
    }
    fetchHud()

    const teamChannel = supabase.channel('map_team_hud')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${userData.id}` }, (payload) => {
        const newRecord = payload.new as any
        setWalletBalance(newRecord.wallet_balance)
        if (newRecord.stamps) setStamps(newRecord.stamps as Record<string, boolean>)
        if (newRecord.current_locked_table === 'WARNING') {
          setIsWarning(true)
          setTimeout(() => setIsWarning(false), 3000)
        } else if (newRecord.current_locked_table === 'BANNED') {
          alert("YOU ARE BANNED FROM THE CASINO.")
          window.location.href = '/'
        }
      })
      .subscribe()

    const txChannel = supabase.channel('map_tx_hud')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `team_id=eq.${userData.id}` }, (payload) => {
        setHistory(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    const channel = supabase.channel('room_1')
      .on('broadcast', { event: 'pos' }, (payload) => {
        if (payload.payload.id !== userData.id) {
          setOtherPlayers(prev => ({ ...prev, [payload.payload.id]: payload.payload }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(teamChannel)
      supabase.removeChannel(txChannel)
    }
  }, [userData.id])

  // --- GLOBAL BROADCAST RECEIVER ---
  useEffect(() => {
    if (broadcastMessage && broadcastMessage.trim() !== '') {
      const timer = setTimeout(() => setBroadcastMessage(null), 60000)
      return () => clearTimeout(timer)
    }
  }, [broadcastMessage])

  useEffect(() => {
    const eventChannel = supabase.channel('map_event_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_control', filter: 'id=eq.1' }, (payload) => {
        const newRecord = payload.new as any
        const portalNowClosed = newRecord.round_2_open === false
        setIsRound2Open(!portalNowClosed)
        if (inRound2 && portalNowClosed) handleTeleportToRound1()
        if (newRecord.current_round && newRecord.current_round.startsWith('BROADCAST:')) {
          setBroadcastMessage(newRecord.current_round.replace('BROADCAST:', ''))
        } else {
          setBroadcastMessage(null)
        }
      })
      .subscribe()

    const pollInterval = setInterval(async () => {
      const eventData = await supabase.from('event_control').select('current_round, round_2_open').eq('id', 1).maybeSingle().then(res => res.data as any)
      if (eventData) {
        const portalNowClosed = eventData.round_2_open === false
        setIsRound2Open(!portalNowClosed)
        if (inRound2 && portalNowClosed) handleTeleportToRound1()
        if (eventData.current_round && eventData.current_round.startsWith('BROADCAST:')) {
          setBroadcastMessage(eventData.current_round.replace('BROADCAST:', ''))
        } else {
          setBroadcastMessage(null)
        }
      }
    }, 5000)

    return () => {
      supabase.removeChannel(eventChannel)
      clearInterval(pollInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRound2])

  // --- MOVEMENT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const movementKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]
      if (movementKeys.includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }

      const currentPos = posRef.current
      const currentDir = dirRef.current
      const r2 = inRound2Ref.current
      const r2open = isRound2OpenRef.current
      const newPos = { ...currentPos }
      let newDir = currentDir

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newPos.y -= 1
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newPos.y += 1
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { newPos.x -= 1; newDir = 'left' }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { newPos.x += 1; newDir = 'right' }

      if (newPos.x === currentPos.x && newPos.y === currentPos.y && newDir === currentDir) return

      if (isBlocked(newPos.x, newPos.y)) {
        if (newDir !== currentDir) setDirection(newDir)
        return
      }

      // Valid move -> Commit state updates
      setPosition(newPos)
      setDirection(newDir)
      setIsMoving(true)
      if (moveTimeout.current) clearTimeout(moveTimeout.current)
      moveTimeout.current = setTimeout(() => setIsMoving(false), 200)

      // Check for Chair "Snapping"
      let foundTableRoute = null
      const activeTables = r2 ? [FINAL_TABLE] : TABLES
      for (const t of activeTables) {
        if (t.chairs.some(c => c.x === newPos.x && c.y === newPos.y)) {
          foundTableRoute = t.route
        }
      }
      setNearTable(foundTableRoute)

      // Portal Logic
      if (!r2 && newPos.x >= 15 && newPos.x <= 18 && newPos.y >= 60 && newPos.y <= 61) {
        if (r2open) handleTeleportToRound2()
        return
      }
      if (r2 && newPos.x >= 15 && newPos.x <= 18 && newPos.y >= 2 && newPos.y <= 3) {
        if (r2open) handleTeleportToRound1()
        return
      }

      // Broadcast Position
      const now = Date.now()
      if (now - lastUpdate.current > 50) {
        supabase.channel('room_1').send({
          type: 'broadcast', event: 'pos',
          payload: { id: userData.id, x: newPos.x, y: newPos.y, avatar_id: userData.avatar_id }
        })
        lastUpdate.current = now
      }

      if (e.key === 'Enter' && foundTableRoute) {
        if (foundTableRoute === 'final') {
          setShowBetModal(true)
        } else {
          router.push(`/game/${foundTableRoute}`)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // Only re-register if these rarely-changing values change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.id, userData.avatar_id, router])

  // Badge count
  const badgeCount = Object.values(stamps).filter(Boolean).length

  // Active data
  const activeRooms = inRound2 ? FINAL_ROOMS : ROOMS
  const activeWalls = inRound2 ? ALL_WALLS_R2 : ALL_WALLS_R1
  const activeTables = inRound2 ? [FINAL_TABLE] : TABLES
  const activeDecos = inRound2 ? DECORATIONS_R2 : DECORATIONS_R1

  // Collect all Y-sortable entities for depth rendering
  const allEntities: { type: string, y: number, key: string, data: any }[] = []

  // Tables
  activeTables.forEach(t => {
    allEntities.push({ type: 'table', y: t.y + 1, key: `table-${t.id}`, data: t })
  })
  // Dealers
  activeTables.forEach(t => {
    t.dealers.forEach((d, i) => {
      allEntities.push({ type: 'dealer', y: d.y, key: `dealer-${t.id}-${i}`, data: { ...d, tableId: t.id } })
    })
  })
  // Chairs
  activeTables.forEach(t => {
    t.chairs.forEach((c, i) => {
      allEntities.push({ type: 'chair', y: c.y, key: `chair-${t.id}-${i}`, data: { ...c, tableRoute: t.route } })
    })
  })
  // Decorations
  activeDecos.forEach((d, i) => {
    allEntities.push({ type: 'deco', y: d.y, key: `deco-${i}`, data: d })
  })
  // Other players
  Object.values(otherPlayers).forEach(p => {
    allEntities.push({ type: 'other-player', y: p.y, key: `player-${p.id}`, data: p })
  })
  // My player
  allEntities.push({ type: 'my-player', y: position.y, key: 'me', data: position })

  // Sort by Y for depth
  allEntities.sort((a, b) => a.y - b.y)

  // Near table info for tooltip
  const nearTableData = nearTable ? activeTables.find(t => t.route === nearTable) : null

  return (
    <div className="flex w-full h-screen bg-[#3a3028] select-none overflow-hidden relative">

      {/* WARNING OVERLAY */}
      <AnimatePresence>
        {isWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur flex items-center justify-center pointer-events-auto">
            <div className="bg-retro-burgundy p-10 rounded-2xl border-4 border-red-400 shadow-retro-lg text-center">
              <h1 className="text-3xl md:text-5xl font-pixel text-retro-cream">⚠️ WARNING ⚠️</h1>
              <p className="text-retro-cream/80 font-mono mt-4">The Pit Boss is watching you!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BETTING MODAL FOR FINAL ROUND */}
      <AnimatePresence>
        {showBetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-retro-walnut border-2 border-retro-brass rounded-xl p-8 max-w-md w-full space-y-6 shadow-retro-lg">
              <h2 className="text-2xl font-pixel text-retro-gold text-center tracking-widest">🏆 FINAL WAGER</h2>
              <div className="space-y-4">
                <p className="font-mono text-sm text-retro-cream/80 text-center leading-relaxed">
                  Minimum Bet: <b className="text-retro-gold">500 Credits</b><br />
                  Your Balance: <b className="text-retro-green font-hud">${walletBalance}</b>
                </p>
                <div className="bg-black/30 p-6 rounded-lg border border-retro-brass/30">
                  <input type="number" min="500" max={walletBalance}
                    value={betAmount === '' ? '' : betAmount}
                    onChange={(e) => { const val = e.target.value; if (val === '') setBetAmount(''); else setBetAmount(Number(val)) }}
                    className="w-full bg-transparent border-b-2 border-retro-brass/50 font-hud text-center text-4xl py-2 text-retro-gold focus:outline-none focus:border-retro-gold transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowBetModal(false)} disabled={isBetting}
                  className="flex-1 py-3 bg-retro-slate/50 border border-retro-cream/20 text-retro-cream font-pixel text-xs rounded-lg transition-colors hover:bg-retro-slate">BACK OUT</button>
                <button onClick={async () => {
                  const finalBet = Number(betAmount)
                  if (isNaN(finalBet) || finalBet < 500) { alert('Minimum bet is 500 credits.'); return }
                  if (finalBet > walletBalance) { alert('Insufficient funds.'); return }
                  setIsBetting(true)
                  const { submitFinalBet } = await import('@/app/actions')
                  await submitFinalBet(userData.id, finalBet)
                  router.push('/game/final')
                }} disabled={isBetting}
                  className="flex-1 py-3 bg-retro-gold text-black hover:bg-yellow-400 font-pixel text-xs rounded-lg transition-colors shadow-retro uppercase tracking-widest">
                  {isBetting ? 'LOADING...' : 'ALL IN'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BROADCAST TOAST */}
      <AnimatePresence>
        {broadcastMessage && broadcastMessage.trim() !== '' && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md bg-retro-burgundy/95 text-retro-cream p-4 rounded-xl border border-red-400/40 shadow-retro-lg backdrop-blur">
            <div className="flex items-center gap-2 mb-1">
              <span>📢</span>
              <h3 className="font-bold font-pixel text-[10px] uppercase text-retro-gold">Pit Boss</h3>
            </div>
            <p className="font-mono text-xs leading-relaxed">{broadcastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          THE MAP VIEWPORT
          ======================================== */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative pb-[76px] hide-scrollbar" style={{ overflowX: 'hidden' }}>
        <div
          className="relative floor-wood mx-auto shadow-2xl"
          style={{ 
            width: GRID_W * CELL, 
            height: GRID_H * CELL, 
            minWidth: GRID_W * CELL, 
            minHeight: GRID_H * CELL,
            backgroundSize: `${CELL}px ${CELL}px`
          }}
        >
          {/* ROOM FLOOR ZONES */}
          {activeRooms.map(room => (
            <div key={room.id} className={`absolute ${room.floor} rounded-sm`}
              style={{
                left: (room.x + 1) * CELL, top: (room.y + 1) * CELL,
                width: (room.w - 2) * CELL, height: (room.h - 2) * CELL
              }}
            />
          ))}

          {/* ROOM SIGNS — floating above each room */}
          {activeRooms.map(room => (
            <div key={`sign-${room.id}`}
              className="absolute z-[45] pointer-events-none flex justify-center"
              style={{ left: room.x * CELL, top: (room.y - 1) * CELL, width: room.w * CELL }}
            >
              <div className="room-sign font-pixel">{room.label}</div>
            </div>
          ))}

          {/* WALL TILES */}
          {activeWalls.map((w, i) => (
            <div key={`wall-${i}`}
              className={`absolute ${activeRooms.find(r =>
                w.x >= r.x && w.x < r.x + r.w && w.y >= r.y && w.y < r.y + r.h
              )?.wallType || 'wall-wood'}`}
              style={{
                left: w.x * CELL, top: w.y * CELL,
                width: CELL, height: CELL,
                zIndex: w.y * 10 + 1
              }}
            />
          ))}

          {/* PORTAL (Round 1 → Round 2) */}
          {!inRound2 && (
            <div className={`absolute z-[40] transition-all overflow-hidden rounded
              ${isRound2Open ? 'stairs-up cursor-pointer' : 'stairs-up opacity-70'}`}
              style={{ left: 15 * CELL, top: 60 * CELL, width: CELL * 4, height: CELL * 2 }}>
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                {!isRound2Open && <span className="text-3xl drop-shadow-xl z-10">🔒</span>}
                <div className={`font-pixel text-[8px] whitespace-nowrap tracking-widest bg-black/60 px-2 py-1 rounded border border-white/10 shadow-lg z-10
                  ${isRound2Open ? 'text-retro-gold font-bold animate-pulse' : 'text-gray-500'}`}>
                  {isRound2Open ? 'STAIRS TO ROUND 2' : 'LOCKED'}
                </div>
              </div>
            </div>
          )}

          {/* PORTAL (Round 2 → Round 1) */}
          {inRound2 && (
            <div className={`absolute z-[40] transition-all overflow-hidden rounded stairs-up cursor-pointer`}
              style={{ left: 15 * CELL, top: 2 * CELL, width: CELL * 4, height: CELL * 2 }}>
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <span className="text-xl drop-shadow-xl z-10">🪜</span>
                <div className="font-pixel text-[8px] whitespace-nowrap tracking-widest bg-black/60 px-2 py-1 rounded border border-white/10 shadow-lg z-10 text-retro-gold font-bold">
                  RETURN
                </div>
              </div>
            </div>
          )}

          {/* Y-SORTED ENTITIES */}
          {allEntities.map(entity => {
            const zIndex = entity.y * 10 + 5

            // --- TABLE ---
            if (entity.type === 'table') {
              const t = entity.data
              const isVip = t.route === 'final' || t.route === 'blackjack'
              return (
                <div key={entity.key} className="absolute"
                  style={{ left: t.x * CELL, top: t.y * CELL, width: 3 * CELL, height: 2 * CELL, zIndex }}>
                  <div className={`w-full h-full ${isVip ? 'retro-table-vip' : 'retro-table'} relative`}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full pointer-events-none">
                      <span className="text-lg mb-0.5">{TABLE_EMOJI[t.route]}</span>
                      <span className="text-[6px] font-pixel text-retro-cream/80 font-bold">{t.label}</span>
                    </div>
                  </div>
                </div>
              )
            }

            // --- DEALER ---
            if (entity.type === 'dealer') {
              const d = entity.data
              return (
                <div key={entity.key} className="absolute avatar-shadow"
                  style={{ left: d.x * CELL, top: d.y * CELL, width: CELL, height: CELL, zIndex }}>
                  <img src={DEALER_AVATAR} className="w-full h-full scale-90 animate-avatar-bob" alt="Dealer" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 name-tag-dealer font-pixel">DEALER</div>
                </div>
              )
            }

            // --- CHAIR ---
            if (entity.type === 'chair') {
              const c = entity.data
              return (
                <div key={entity.key} className="absolute"
                  style={{ left: c.x * CELL, top: c.y * CELL, width: CELL, height: CELL, zIndex }}>
                  <div className={`w-[28px] h-[28px] mx-auto mt-[6px] ${nearTable === c.tableRoute ? 'retro-chair-active' : 'retro-chair'}`}>
                    <div className={`w-full h-[35%] rounded-t-sm ${nearTable === c.tableRoute ? 'bg-retro-gold/30' : 'bg-white/10'}`} />
                  </div>
                </div>
              )
            }

            // --- DECORATION ---
            if (entity.type === 'deco') {
              const d = entity.data
              return (
                <div key={entity.key} className="absolute flex items-center justify-center pointer-events-none"
                  style={{ left: d.x * CELL, top: d.y * CELL, width: CELL, height: CELL, zIndex }}>
                  <span className="deco-sprite" style={{ transform: `scale(${d.scale || 1})` }}>{d.emoji}</span>
                </div>
              )
            }

            // --- OTHER PLAYER ---
            if (entity.type === 'other-player') {
              const p = entity.data
              const otherSeed = AVATAR_LIST.find(a => a.id === p.avatar_id)?.seed || 'Felix'
              const otherSpriteUrl = getAvatarUrl(otherSeed)
              return (
                <div key={entity.key} className="absolute transition-all duration-200 ease-linear avatar-shadow"
                  style={{ left: p.x * CELL, top: p.y * CELL, width: CELL, height: CELL, zIndex }}>
                  <img src={otherSpriteUrl} className="w-full h-full drop-shadow-md opacity-70 animate-avatar-bob" alt="Player" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 name-tag font-pixel">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />PLAYER
                  </div>
                </div>
              )
            }

            // --- MY PLAYER ---
            if (entity.type === 'my-player') {
              return (
                <div key={entity.key}
                  className={`absolute transition-all duration-100 ease-linear avatar-shadow ${isMoving ? 'animate-avatar-walk' : 'animate-avatar-bob'}`}
                  style={{ left: position.x * CELL, top: position.y * CELL, width: CELL, height: CELL, zIndex: zIndex + 2 }}>
                  {/* Interaction Tooltip */}
                  <AnimatePresence>
                    {nearTableData && (
                      <motion.div initial={{ opacity: 0, y: 5, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.8 }}
                        className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap z-50">
                        <div className="interact-tooltip text-center">
                          <div className="text-[9px] font-bold font-pixel text-gray-700">{TABLE_EMOJI[nearTableData.route]} {nearTableData.label}</div>
                          <div className="text-[8px] text-gray-500 mt-0.5">Press ENTER</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className={`w-full h-full transform transition-transform duration-200 ${direction === 'left' ? '-scale-x-100' : 'scale-x-100'}`}>
                    <img src={mySpriteUrl}
                      className={`w-full h-full drop-shadow-lg ${isMoving ? 'animate-walk-wobble' : 'animate-avatar-bob'}`}
                      alt="Me" />
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 name-tag-you font-pixel">YOU</div>
                </div>
              )
            }

            return null
          })}

          {/* MAP WATERMARK */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none opacity-10 z-[1]">
            <h1 className="text-[32px] font-pixel text-retro-walnut whitespace-nowrap tracking-[0.2em]">
              {inRound2 ? 'ROUND 2' : 'CODESPRINT \'26'}
            </h1>
          </div>

        </div>
      </div>

      {/* ========================================
          FULL WIDTH BOTTOM HUD BAR
          ======================================== */}
      <div className="fixed bottom-0 left-0 w-full z-[1000] hud-bar-full flex items-center justify-between px-8 py-3 border-t-2 border-retro-brass/50">
        
        {/* LEFT: Team Details */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={mySpriteUrl} className="w-12 h-12 rounded bg-retro-oak/50 border border-retro-brass/50 shadow-inner" alt="Me" />
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-black ${inRound2 ? 'bg-retro-burgundy animate-pulse' : 'bg-green-500'}`} />
          </div>
          <div>
            <div className="text-[10px] font-pixel text-retro-gold uppercase tracking-wider mb-0.5">Team Name</div>
            <div className="text-lg font-mono text-retro-cream font-bold">{userData.access_code}</div>
          </div>
        </div>

        {/* CENTER: Core Stats */}
        <div className="flex items-center gap-12 bg-black/40 px-8 py-2 rounded-xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-md">💰</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-pixel text-retro-gold uppercase tracking-wider">Total Score / Credits</span>
              <span className="text-2xl font-hud text-retro-gold font-bold leading-none">${walletBalance}</span>
            </div>
          </div>
          
          <div className="w-px h-8 bg-white/10" />

          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-md">🏅</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-pixel text-retro-gold uppercase tracking-wider">Challenge Badges</span>
              <span className="text-2xl font-hud text-retro-cream font-bold leading-none">{badgeCount}<span className="text-sm text-retro-cream/50">/5</span></span>
            </div>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 bg-retro-slate/30 hover:bg-retro-slate/60 border border-white/10 px-4 py-3 rounded-lg transition-colors shadow-sm">
            <span className="text-lg">📜</span>
            <span className="text-[10px] font-pixel text-retro-cream tracking-widest">VIEW LOG</span>
          </button>
          
          <LogoutButton teamId={userData.id}
            className="px-6 py-3 bg-retro-burgundy border border-red-400/40 text-retro-cream font-pixel text-[10px] rounded-lg hover:bg-retro-mahogany transition-colors shadow-retro uppercase tracking-widest" />
        </div>
      </div>

      {/* HISTORY POPOVER */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-8 z-[1010] bg-[#2a221c] border-2 border-retro-brass/40 rounded-xl shadow-2xl w-96 max-h-80 overflow-hidden flex flex-col">
            <h3 className="text-xs font-pixel text-retro-gold mb-3 border-b border-retro-brass/20 pb-2">CREDIT HISTORY</h3>
            {history.length === 0 ? (
              <div className="text-xs text-retro-cream/40 font-mono text-center py-4">No transactions yet.</div>
            ) : (
              <div className="space-y-2">
                {history.map((tx: any, i: number) => (
                  <div key={i} className={`p-2 rounded-lg border-l-2 flex justify-between items-start gap-2
                    ${tx.amount >= 0 ? 'border-l-green-500/50 bg-green-900/10' : 'border-l-red-500/50 bg-red-900/10'}`}>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-retro-cream/80 break-words">{tx.description}</div>
                      <div className="text-[8px] text-retro-cream/40 font-mono mt-0.5">{new Date(tx.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div className={`font-hud text-xs font-bold shrink-0 ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
