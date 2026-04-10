/**
 * useSpeechInput — Web Speech API (SpeechRecognition) voor stemantwoorden
 * Werkt in Chrome/Edge; Firefox en Safari zonder vlag ondersteunen het niet.
 */
import { useState, useRef, useCallback, useEffect } from 'react'

type SpeechState = 'idle' | 'listening' | 'unsupported'

export function useSpeechInput(onResult: (transcript: string) => void) {
  const [state, setState] = useState<SpeechState>('idle')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setState('unsupported')
    }
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'nl-BE'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => setState('listening')

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim()
      // Normaliseer gesproken getallen: "vijftien" → "15" etc.
      const normalized = normalizeSpokenNumber(transcript)
      onResult(normalized)
      setState('idle')
    }

    recognition.onerror = () => setState('idle')
    recognition.onend = () => setState('idle')

    recognitionRef.current = recognition
    recognition.start()
  }, [onResult])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setState('idle')
  }, [])

  return { state, start, stop, isListening: state === 'listening', isSupported: state !== 'unsupported' }
}

// Eenvoudige normalisatie van gesproken Nederlandse getallen
function normalizeSpokenNumber(text: string): string {
  const map: Record<string, string> = {
    'nul': '0', 'een': '1', 'één': '1', 'twee': '2', 'drie': '3',
    'vier': '4', 'vijf': '5', 'zes': '6', 'zeven': '7', 'acht': '8',
    'negen': '9', 'tien': '10', 'elf': '11', 'twaalf': '12',
    'dertien': '13', 'veertien': '14', 'vijftien': '15',
    'zestien': '16', 'zeventien': '17', 'achttien': '18',
    'negentien': '19', 'twintig': '20', 'dertig': '30',
    'veertig': '40', 'vijftig': '50', 'zestig': '60',
    'zeventig': '70', 'tachtig': '80', 'negentig': '90',
    'honderd': '100',
  }
  const lower = text.toLowerCase()
  return map[lower] ?? text
}
