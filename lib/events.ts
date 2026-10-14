export interface CasinoEventInfo {
  id: string
  label: string
  sublabel: string
  route: string
  wing: 'WING_1' | 'WING_2'
  emoji: string
  maxParticipants: number
}

export const CASINO_EVENTS: CasinoEventInfo[] = [
  { id: 'T1', label: 'SLOTS', sublabel: 'Bug Bounty', route: 'slots', wing: 'WING_1', emoji: '🎰', maxParticipants: 3 },
  { id: 'T2', label: 'ROULETTE', sublabel: 'Output Oracle', route: 'roulette', wing: 'WING_1', emoji: '🎯', maxParticipants: 3 },
  { id: 'T3', label: 'BLACKJACK', sublabel: 'Code Relay', route: 'blackjack', wing: 'WING_1', emoji: '🃏', maxParticipants: 3 },
  { id: 'T4', label: 'CRAPS', sublabel: 'Debug Detective', route: 'craps', wing: 'WING_1', emoji: '🎲', maxParticipants: 3 },
  { id: 'T5', label: 'POKER', sublabel: 'Cipher Crack', route: 'poker', wing: 'WING_1', emoji: '🕵️', maxParticipants: 3 },
  { id: 'T6', label: 'BACCARAT', sublabel: 'SQL Heist', route: 'baccarat', wing: 'WING_2', emoji: '🏦', maxParticipants: 3 },
  { id: 'T7', label: 'DICE', sublabel: 'Stack Attack', route: 'dice', wing: 'WING_2', emoji: '🎲', maxParticipants: 3 },
  { id: 'T8', label: 'HIGH CARD', sublabel: 'Complexity Clash', route: 'highcard', wing: 'WING_2', emoji: '🃏', maxParticipants: 3 },
  { id: 'T9', label: 'COIN FLIP', sublabel: 'Algorithm Auction', route: 'coinflip', wing: 'WING_2', emoji: '🪙', maxParticipants: 3 },
  { id: 'T10', label: 'THE VAULT', sublabel: 'DSA Challenge', route: 'vault', wing: 'WING_2', emoji: '🔐', maxParticipants: 3 },
]

export const EVENT_BY_ROUTE: Record<string, CasinoEventInfo> = Object.fromEntries(
  CASINO_EVENTS.map(e => [e.route, e])
)
