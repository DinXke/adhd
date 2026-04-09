/**
 * "Nu Doen"-modus — fullscreen, één stap tegelijk, geen afleiding.
 * Visuele tijdbalk (groen→geel→rood).
 * Swipe of knop voor volgende stap.
 * Confetti bij voltooiing.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Activity, ActivityStep } from '../../lib/queries'
import { IconBack, IconCheck } from '../../components/icons/NavIcons'

// Simpele confetti-animatie via canvas (geen externe lib nodig)
function useConfetti(active: boolean) {
  useEffect(() => {
    if (!active) return
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      size: Math.random() * 8 + 4,
      color: ['#E8734A', '#F2C94C', '#7BAFA3', '#5B8C5A', '#A8C5D6'][Math.floor(Math.random() * 5)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    }))

    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.rotation += p.rotSpeed
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      })
      if (particles.some((p) => p.y < canvas.height)) {
        frame = requestAnimationFrame(draw)
      } else {
        document.body.removeChild(canvas)
      }
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); canvas.remove() }
  }, [active])
}

// Visuele tijdbalk
function TimerBar({ durationMinutes, startedAt }: { durationMinutes: number; startedAt: number }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const totalMs = durationMinutes * 60_000
  const pct = Math.min(elapsed / totalMs, 1)
  const color = pct < 0.6 ? 'var(--accent-success)' : pct < 0.85 ? 'var(--accent-token)' : 'var(--accent-danger)'

  const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 60_000))

  return (
    <div className="px-6">
      <div className="progress-bar" style={{ height: 14 }}>
        <motion.div
          className="progress-bar__fill"
          style={{ background: color, transition: 'background 2s ease, width 1s linear', width: `${pct * 100}%` }}
        />
      </div>
      <p className="text-center font-body text-ink-muted text-sm mt-1.5">
        {remaining > 0 ? `Nog ${remaining} min` : 'Tijd is om!'}
      </p>
    </div>
  )
}

export default function NuDoenPage() {
  const { activityId } = useParams<{ activityId: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const activity: Activity | undefined = location.state?.activity
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)
  const [startedAt] = useState(Date.now())

  useConfetti(done)

  const steps = activity?.steps ?? []
  const currentStep: ActivityStep | undefined = steps[currentStepIdx]
  const totalSteps = steps.length

  const markStepDone = useCallback(() => {
    if (!currentStep) return
    const newCompleted = new Set(completed)
    newCompleted.add(currentStep.id)
    setCompleted(newCompleted)

    if (navigator.vibrate) navigator.vibrate(50)

    if (currentStepIdx < totalSteps - 1) {
      setTimeout(() => setCurrentStepIdx((i) => i + 1), 400)
    } else {
      setTimeout(() => setDone(true), 400)
    }
  }, [currentStep, completed, currentStepIdx, totalSteps])

  const handleSwipe = (_: any, info: PanInfo) => {
    if (info.offset.x < -60 && currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx((i) => i + 1)
    } else if (info.offset.x > 60 && currentStepIdx > 0) {
      setCurrentStepIdx((i) => i - 1)
    }
  }

  if (!activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-surface">
        <p className="font-body text-ink-muted">Activiteit niet gevonden.</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">Terug</button>
      </div>
    )
  }

  // Volledig klaar-scherm
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-surface p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center"
        >
          <span className="text-8xl block mb-4">🎉</span>
          <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: 'var(--font-size-heading)' }}>
            Supergedaan!
          </h1>
          <p className="font-body text-ink-muted text-lg mb-8">
            {activity.title} is klaar!
          </p>
          <motion.button
            onClick={() => navigate('/app/day')}
            className="btn-primary text-xl px-10"
            whileTap={{ scale: 0.95 }}
          >
            Terug naar mijn dag
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // Geen stappen — dan is de activiteit zelf de "taak"
  if (totalSteps === 0) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-surface">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate(-1)} className="text-ink-muted" aria-label="Terug">
            <IconBack size={24} />
          </button>
          <h2 className="font-display font-bold text-ink text-lg flex-1">{activity.title}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <span className="text-8xl block mb-6">{activity.icon}</span>
          <h1 className="font-display font-bold text-ink mb-8" style={{ fontSize: 'var(--font-size-big)' }}>
            {activity.title}
          </h1>
          {activity.durationMinutes < 600 && (
            <div className="w-full mb-8">
              <TimerBar durationMinutes={activity.durationMinutes} startedAt={startedAt} />
            </div>
          )}
          <motion.button
            onClick={() => setDone(true)}
            className="btn-primary text-xl px-10"
            whileTap={{ scale: 0.95 }}
          >
            ✅ Klaar!
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface select-none">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="text-ink-muted p-1" aria-label="Terug">
          <IconBack size={22} />
        </button>
        <div className="flex-1">
          <p className="font-body text-ink-muted text-sm">{activity.icon} {activity.title}</p>
        </div>
        <p className="font-body text-ink-muted text-sm">
          {currentStepIdx + 1} / {totalSteps}
        </p>
      </div>

      {/* Voortgang puntjes */}
      <div className="flex justify-center gap-2 py-2">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            className="h-2 rounded-pill"
            animate={{
              width: i === currentStepIdx ? 24 : 8,
              backgroundColor:
                completed.has(steps[i].id)
                  ? 'var(--accent-success)'
                  : i === currentStepIdx
                  ? 'var(--accent-primary)'
                  : 'var(--bg-surface)',
            }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </div>

      {/* Tijdbalk */}
      {activity.durationMinutes < 600 && (
        <div className="mt-2">
          <TimerBar durationMinutes={activity.durationMinutes} startedAt={startedAt} />
        </div>
      )}

      {/* Huidige stap — swipeable */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIdx}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleSwipe}
            className="text-center w-full max-w-xs"
          >
            {currentStep?.icon && (
              <span className="text-6xl block mb-6">{currentStep.icon}</span>
            )}
            <h1
              className="font-display font-bold text-ink leading-tight"
              style={{ fontSize: currentStep && currentStep.title.length > 20 ? '2rem' : 'var(--font-size-big)' }}
            >
              {currentStep?.title}
            </h1>
            <p className="font-body text-ink-muted text-base mt-4 opacity-60">
              Veeg om te navigeren
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Voltooi-knop */}
      <div className="px-6 pb-8">
        <motion.button
          onClick={markStepDone}
          className="w-full btn-primary text-xl"
          style={{ minHeight: 64 }}
          whileTap={{ scale: 0.96 }}
        >
          <span className="flex items-center gap-3 justify-center">
            <IconCheck size={28} />
            {currentStepIdx < totalSteps - 1 ? 'Gedaan! Volgende →' : '🎉 Alles klaar!'}
          </span>
        </motion.button>
      </div>
    </div>
  )
}
