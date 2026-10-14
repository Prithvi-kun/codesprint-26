'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react'

interface TestPassedModalProps {
  isOpen: boolean
  onClose: () => void
  gameTitle?: string
  totalCases?: number
}

export default function TestPassedModal({
  isOpen,
  onClose,
  gameTitle,
  totalCases
}: TestPassedModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#12131c] border-2 border-green-500/80 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.35)] overflow-hidden p-6 md:p-8 text-center"
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 100, 0.2) 2px, rgba(0, 255, 100, 0.2) 4px)'
            }}
          />

          {/* Glowing Green Halo */}
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-green-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="relative mx-auto mb-4 w-20 h-20 rounded-2xl bg-green-950/60 border-2 border-green-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.4)]">
            <CheckCircle2 className="w-10 h-10 text-green-400 animate-pulse" />
          </div>

          {/* Heading */}
          <h2 className="text-xl md:text-2xl font-pixel text-green-400 tracking-wider uppercase mb-1 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
            ALL TEST CASES PASSED!
          </h2>
          <p className="text-[10px] md:text-xs font-mono text-yellow-400 tracking-widest uppercase mb-4">
            {gameTitle || 'TABLE CHALLENGE'} {totalCases ? `• ${totalCases} TESTS PASSED` : '• VERIFIED'}
          </p>

          {/* Call to action notice */}
          <div className="bg-black/60 border border-green-500/40 rounded-xl p-4 mb-6 text-left relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-900/40 border border-green-500/50 text-green-300 shrink-0 mt-0.5">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-pixel uppercase tracking-wide">
                  CALL PIT BOSS / DEALER
                </h4>
                <p className="text-xs font-mono text-gray-300 leading-relaxed">
                  Call the Dealer to your table now. Once they review your code and approve it from the Admin Panel, your <span className="text-yellow-400 font-bold">Jackpot & Badge</span> will unlock!
                </p>
              </div>
            </div>

            {/* Waiting status pill */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-gray-400">Approval Status:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-950/70 border border-yellow-500/60 text-yellow-300 text-[10px] font-pixel animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                AWAITING PIT BOSS APPROVAL
              </span>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-black font-pixel font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.7)] active:scale-95 transition-all"
          >
            OK, WAITING FOR DEALER
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
