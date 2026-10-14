'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Award, CheckCircle2, ShieldAlert } from 'lucide-react'

interface BadgeAlreadyWonModalProps {
  isOpen: boolean
  onClose: () => void
  label?: string
  sublabel?: string
  emoji?: string
  actionButtonText?: string
}

export default function BadgeAlreadyWonModal({
  isOpen,
  onClose,
  label = 'CHALLENGE',
  sublabel = 'Event Table',
  emoji = '🏅',
  actionButtonText = 'BACK TO FLOOR',
}: BadgeAlreadyWonModalProps) {
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
            className="bg-[#221811] border-4 border-retro-gold rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-[0_0_50px_rgba(212,175,55,0.35)] relative overflow-hidden"
          >
            {/* Corner Decorative Brass Accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-retro-gold/70" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-retro-gold/70" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-retro-gold/70" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-retro-gold/70" />

            {/* Glowing Header Banner */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-retro-gold/20 border-2 border-retro-gold flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(212,175,55,0.4)] mb-3 animate-bounce">
                {emoji}
              </div>
              <div className="flex items-center gap-2 text-retro-gold font-pixel text-xs tracking-widest uppercase">
                <Award className="w-4 h-4 text-retro-gold" />
                <span>BADGE ALREADY WON</span>
                <Award className="w-4 h-4 text-retro-gold" />
              </div>
              <h2 className="text-xl md:text-2xl font-pixel text-retro-cream mt-2 uppercase tracking-wide">
                {label}
              </h2>
              {sublabel && (
                <p className="text-xs font-mono text-retro-gold/80 mt-1 uppercase tracking-wider">
                  {sublabel}
                </p>
              )}
            </div>

            {/* Badge Card Status */}
            <div className="bg-black/50 border border-retro-gold/30 rounded-xl p-4 mb-6 flex items-center gap-4 shadow-inner">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-pixel text-green-400 uppercase tracking-widest">
                  STATUS: BADGE CLAIMED & RECORDED
                </div>
                <div className="text-xs font-mono text-retro-cream/80 mt-0.5">
                  Your syndicate has already conquered this table and received the challenge badge.
                </div>
              </div>
            </div>

            {/* Body Explanation */}
            <div className="bg-[#18110b]/80 border-l-4 border-amber-500/80 p-3 rounded-r-lg mb-6">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs font-mono text-retro-cream/90 leading-relaxed">
                  <b className="text-amber-400">Rule of the Casino:</b> Participants cannot replay a game once its badge has been claimed. Please head to other tables to collect remaining badges!
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-retro-gold to-yellow-500 text-black font-pixel text-xs uppercase tracking-widest rounded-xl hover:from-yellow-400 hover:to-retro-gold transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-[0.98] font-bold"
            >
              {actionButtonText}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
