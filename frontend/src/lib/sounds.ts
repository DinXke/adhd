/**
 * Geluidssysteem — Web Audio API synthesized geluiden
 * Geen externe bestanden nodig, werkt op alle apparaten
 */

let muted = false
export function isMuted() { return muted }
export function setMuted(m: boolean) { muted = m }
export function toggleMute() { muted = !muted; return muted }

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // Resume als suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = volume
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

function playNotes(notes: [number, number][], type: OscillatorType = 'sine', volume = 0.25) {
  try {
    const ctx = getCtx()
    let time = ctx.currentTime
    for (const [freq, dur] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.value = volume
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(time)
      osc.stop(time + dur)
      time += dur * 0.8
    }
  } catch {}
}

// ── Geluidseffecten ──────────────────────────────────────────

/** Correct antwoord — vrolijk belletje omhoog */
export function soundCorrect() {
  if (muted) return
  playNotes([[523, 0.1], [659, 0.1], [784, 0.15]], 'sine', 0.25)
}

/** Fout antwoord — zacht laag geluidje */
export function soundWrong() {
  if (muted) return
  playTone(220, 0.2, 'triangle', 0.15)
}

/** Token verdiend — bling! */
export function soundToken() {
  if (muted) return
  playNotes([[880, 0.08], [1108, 0.08], [1318, 0.12]], 'sine', 0.2)
}

/** Klik/tik — subtiel tikgeluid */
export function soundTap() {
  if (muted) return
  playTone(800, 0.05, 'sine', 0.1)
}

/** Match gevonden (memory) — twee tonen omhoog */
export function soundMatch() {
  if (muted) return
  playNotes([[440, 0.1], [660, 0.15]], 'sine', 0.2)
}

/** Spelletje gewonnen — feestelijke melodie */
export function soundWin() {
  if (muted) return
  playNotes([
    [523, 0.12], [587, 0.12], [659, 0.12], [784, 0.12],
    [880, 0.2], [784, 0.1], [880, 0.3],
  ], 'sine', 0.25)
}

/** Level compleet — kort fanfare */
export function soundLevelUp() {
  if (muted) return
  playNotes([[659, 0.1], [784, 0.1], [988, 0.2]], 'sine', 0.25)
}

/** Streak bonus — oplopende tonen */
export function soundStreak() {
  if (muted) return
  playNotes([[440, 0.06], [554, 0.06], [659, 0.06], [880, 0.1]], 'triangle', 0.2)
}

/** Hint weergegeven — zacht belletje */
export function soundHint() {
  if (muted) return
  playNotes([[660, 0.15], [550, 0.15]], 'sine', 0.12)
}

/** Bubbel poppen — kort plop */
export function soundPop() {
  if (muted) return
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 400
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1)
    gain.gain.value = 0.3
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch {}
}

/** Kaart flippen — kort klik */
export function soundFlip() {
  if (muted) return
  playTone(1200, 0.04, 'sine', 0.12)
}

/** Slepen / oppakken */
export function soundPickup() {
  if (muted) return
  playTone(600, 0.06, 'triangle', 0.1)
}

/** Neerleggen / droppen */
export function soundDrop() {
  if (muted) return
  playTone(400, 0.08, 'triangle', 0.15)
}

/** Countdown tik */
export function soundTick() {
  if (muted) return
  playTone(1000, 0.03, 'square', 0.08)
}

/** Timer bijna op — waarschuwing */
export function soundWarning() {
  if (muted) return
  playNotes([[440, 0.1], [380, 0.15]], 'sawtooth', 0.1)
}

/** Haptic feedback (als ondersteund) */
export function vibrate(ms: number | number[] = 50) {
  try {
    navigator.vibrate?.(ms)
  } catch {}
}

/** Gecombineerd: geluid + vibratie bij correct antwoord */
export function feedbackCorrect() {
  soundCorrect()
  vibrate(30)
}

/** Gecombineerd: geluid + vibratie bij fout */
export function feedbackWrong() {
  soundWrong()
  vibrate([20, 30, 20])
}

/** Gecombineerd: geluid + vibratie bij winst */
export function feedbackWin() {
  soundWin()
  vibrate([30, 50, 30, 50, 100])
}
