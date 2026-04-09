import { motion } from 'framer-motion'

export default function ExercisesPage() {
  return (
    <div className="p-5">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <span className="text-6xl block mb-4">📚</span>
        <h1 className="font-display font-bold text-ink text-2xl mb-2">Oefeningen</h1>
        <p className="text-ink-muted font-body text-base">
          Hier komen jouw oefeningen!
          <br />Fase 5 — binnenkort beschikbaar.
        </p>
      </motion.div>
    </div>
  )
}
