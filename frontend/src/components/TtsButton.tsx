/**
 * Gedeelde TTS (Text-to-Speech) knop voor de kind-interface.
 * Spreekt tekst uit in Vlaams Nederlands (nl-BE), met fallback naar nl-NL.
 */
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// Voices cachen — worden asynchroon geladen door de browser
let cachedVoices: SpeechSynthesisVoice[] = []
function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  cachedVoices = window.speechSynthesis.getVoices()
  if (cachedVoices.length === 0) {
    // Voices nog niet geladen — luister naar event
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoices = window.speechSynthesis.getVoices()
    }, { once: true })
  }
}
loadVoices()

function getDutchVoice(): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0) cachedVoices = window.speechSynthesis?.getVoices() ?? []
  return cachedVoices.find(v => v.lang === 'nl-BE')
    ?? cachedVoices.find(v => v.lang === 'nl-NL')
    ?? cachedVoices.find(v => v.lang.startsWith('nl'))
    ?? null
}

interface TtsButtonProps {
  text: string
  /** Breedte/hoogte van de knop in px. Standaard 36. */
  size?: number
  /** CSS position class, bv. 'absolute top-2 right-2'. Standaard geen positionering. */
  className?: string
}

export function TtsButton({ text, size = 36, className = '' }: TtsButtonProps) {
  const [speaking, setSpeaking] = useState(false)

  const speak = () => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (speaking) {
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    // Gebruik gecachte Nederlandse voice
    const voice = getDutchVoice()
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? 'nl-BE'
    utterance.rate = 0.9
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  if (!window.speechSynthesis) return null

  const iconSize = Math.round(size * 0.44)

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={speak}
      title={speaking ? 'Stop voorlezen' : 'Voorlezen'}
      className={`rounded-full flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: speaking ? 'var(--accent-warm, var(--accent-primary))' : 'var(--bg-surface)',
        border: '1.5px solid var(--accent-calm, var(--accent-secondary))',
        flexShrink: 0,
      }}
    >
      {speaking ? (
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="white" stroke="none">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        </motion.div>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8C7B6B)" strokeWidth="2" strokeLinecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      )}
    </motion.button>
  )
}

export default TtsButton
