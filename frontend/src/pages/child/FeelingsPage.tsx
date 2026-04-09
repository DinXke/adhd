import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EMOTIONS = [
  { level: 'great', emoji: '😄', label: 'Super goed!' },
  { level: 'good', emoji: '🙂', label: 'Goed' },
  { level: 'okay', emoji: '😐', label: 'Zo zo' },
  { level: 'sad', emoji: '😢', label: 'Niet zo goed' },
  { level: 'angry', emoji: '😤', label: 'Moeilijk' },
]

export default function FeelingsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSelect = async (level: string) => {
    setSelected(level)
    // In Fase 4: API call
    setTimeout(() => setSaved(true), 300)
  }

  if (saved && selected) {
    const emotion = EMOTIONS.find((e) => e.level === selected)!
    return (
      <div className="p-5 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center"
        >
          <span className="text-8xl block mb-4">{emotion.emoji}</span>
          <h2 className="font-display font-bold text-ink text-2xl mb-2">
            {emotion.label}
          </h2>
          <p className="text-ink-muted font-body text-base">
            Dank je dat je dat vertelt! 💛
          </p>
          <button
            onClick={() => { setSaved(false); setSelected(null) }}
            className="btn-secondary mt-8 font-body text-base"
          >
            Opnieuw invullen
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-5">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-display font-bold text-ink" style={{ fontSize: 'var(--font-size-heading)' }}>
          Hoe voel jij je?
        </h1>
        <p className="text-ink-muted font-body text-base mt-2">
          Tik op het gezichtje dat het beste past
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 max-w-sm mx-auto">
        {EMOTIONS.map(({ level, emoji, label }, i) => (
          <motion.button
            key={level}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => handleSelect(level)}
            className="card flex items-center gap-5 px-5 py-4 w-full text-left"
            style={{
              background: selected === level ? 'var(--bg-surface)' : undefined,
              borderColor: selected === level ? 'var(--accent-primary)' : undefined,
              borderWidth: selected === level ? 2 : undefined,
            }}
            whileTap={{ scale: 0.97 }}
            whileHover={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <span className="text-4xl">{emoji}</span>
            <span className="font-display font-bold text-ink text-xl">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
