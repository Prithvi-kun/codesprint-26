'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

export interface OpenTableInfo {
  route: string
  label: string
  sublabel: string
  emoji: string
  count: number
  wing: string
}

interface EventFullModalProps {
  isOpen: boolean
  onClose: () => void
  tableLabel?: string
  tableEmoji?: string
  currentCount?: number
  maxCount?: number
  availableTables: OpenTableInfo[]
  stamps?: Record<string, boolean>
  onSelectTable?: (route: string) => void
  actionButtonText?: string
}

export default function EventFullModal({
  isOpen,
  onClose,
  tableLabel = 'EVENT',
  tableEmoji = '🎲',
  currentCount = 3,
  maxCount = 3,
  availableTables = [],
  stamps = {},
  onSelectTable,
  actionButtonText = 'BACK TO FLOOR',
}: EventFullModalProps) {
  // Sort available tables so uncompleted ones appear first as recommended
  const sortedTables = [...availableTables].sort((a, b) => {
    const aWon = !!stamps[a.route]
    const bWon = !!stamps[b.route]
    if (!aWon && bWon) return -1
    if (aWon && !bWon) return 1
    return a.count - b.count
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
        >
          <motion.div
            initial={{ scale: 0.88, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, y: 24 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#20140e] border-4 border-amber-500/80 rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-[0_0_55px_rgba(245,158,11,0.3)] relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Corner Decorative Accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-500/60" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-500/60" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-500/60" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-500/60" />

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-5 shrink-0">
              <div className="w-14 h-14 rounded-full bg-red-950/70 border-2 border-red-500/60 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)] mb-2.5">
                {tableEmoji}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-900/40 border border-red-500/50 rounded-full text-red-300 font-pixel text-[9px] tracking-widest uppercase mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>TABLE FULL ({currentCount}/{maxCount} SEATS OCCUPIED)</span>
              </div>
              <h2 className="text-xl md:text-2xl font-pixel text-retro-cream mt-1 uppercase tracking-wide">
                {tableLabel}
              </h2>
              <p className="text-xs font-mono text-retro-cream/70 mt-1 max-w-md">
                Each table only supports <b className="text-amber-400">up to 3 concurrent participants</b> (one per chair). Please wait for a chair to clear or join one of the free events below:
              </p>
            </div>

            {/* Available Events Section */}
            <div className="flex-1 min-h-0 flex flex-col mb-5">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-pixel text-retro-gold uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-retro-gold" />
                  <span>AVAILABLE TABLES ({sortedTables.length} OPEN)</span>
                </span>
                <span className="text-[9px] font-mono text-gray-400">
                  {maxCount} chairs per table
                </span>
              </div>

              {sortedTables.length === 0 ? (
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-center text-xs font-mono text-retro-cream/60">
                  All tables in the casino are currently full. Please wait a few moments!
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-64">
                  {sortedTables.map(t => {
                    const isWon = !!stamps[t.route]
                    const freeSeats = maxCount - t.count

                    return (
                      <div
                        key={t.route}
                        onClick={() => onSelectTable && onSelectTable(t.route)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isWon
                            ? 'bg-black/30 border-white/5 opacity-60'
                            : 'bg-black/50 border-amber-500/30 hover:border-amber-400/70 hover:bg-amber-950/20 cursor-pointer shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl shrink-0">{t.emoji}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-pixel text-retro-cream truncate">
                                {t.label}
                              </span>
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 shrink-0">
                                {t.wing}
                              </span>
                              {!isWon && (
                                <span className="text-[8px] font-pixel text-emerald-400 flex items-center gap-0.5 shrink-0">
                                  <Sparkles className="w-2.5 h-2.5" /> NEED BADGE
                                </span>
                              )}
                              {isWon && (
                                <span className="text-[8px] font-pixel text-green-400/80 flex items-center gap-0.5 shrink-0">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> BADGE WON
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 truncate">
                              {t.sublabel}
                            </div>
                          </div>
                        </div>

                        {/* Capacity pill */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-hud font-bold text-emerald-400">
                              {t.count}/{maxCount}
                            </span>
                            <span className="text-[8px] font-mono text-gray-400">
                              {freeSeats} {freeSeats === 1 ? 'seat' : 'seats'} free
                            </span>
                          </div>
                          {onSelectTable && !isWon && (
                            <ArrowRight className="w-4 h-4 text-retro-gold/70" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="shrink-0 pt-2 border-t border-white/10">
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-retro-cream font-pixel text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98] font-bold"
              >
                {actionButtonText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
