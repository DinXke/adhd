/**
 * Toegankelijkheidsvoorkeuren + thema-keuze
 * Opgeslagen in localStorage, direct toegepast op <html>
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ChildTheme = 'default' | 'oceaan' | 'jungle' | 'ruimte'
export type AdultTheme = 'default' | 'dark'

export const CHILD_THEMES: { key: ChildTheme; label: string; emoji: string; desc: string }[] = [
  { key: 'default', label: 'Warme Speeltuin', emoji: '🌻', desc: 'Zacht oranje en groen' },
  { key: 'oceaan', label: 'Oceaan Avontuur', emoji: '🐬', desc: 'Blauw en turquoise' },
  { key: 'jungle', label: 'Jungle Safari', emoji: '🦁', desc: 'Goud en groen' },
  { key: 'ruimte', label: 'Ruimte Ontdekker', emoji: '🚀', desc: 'Donker met paars en neon' },
]

export const ADULT_THEMES: { key: AdultTheme; label: string; emoji: string; desc: string }[] = [
  { key: 'default', label: 'Warm Licht', emoji: '☀️', desc: 'Standaard warm professioneel' },
  { key: 'dark', label: 'Donker', emoji: '🌙', desc: 'Donkere modus' },
]

interface AccessibilityState {
  dyslexicFont: boolean
  largeText: boolean
  highContrast: boolean
  childTheme: ChildTheme
  adultTheme: AdultTheme
  setDyslexicFont: (v: boolean) => void
  setLargeText: (v: boolean) => void
  setHighContrast: (v: boolean) => void
  setChildTheme: (v: ChildTheme) => void
  setAdultTheme: (v: AdultTheme) => void
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      dyslexicFont: false,
      largeText: false,
      highContrast: false,
      childTheme: 'default' as ChildTheme,
      adultTheme: 'default' as AdultTheme,
      setDyslexicFont: (v) => { set({ dyslexicFont: v }); applyToHtml() },
      setLargeText: (v) => { set({ largeText: v }); applyToHtml() },
      setHighContrast: (v) => { set({ highContrast: v }); applyToHtml() },
      setChildTheme: (v) => { set({ childTheme: v }); applyToHtml() },
      setAdultTheme: (v) => { set({ adultTheme: v }); applyToHtml() },
    }),
    { name: 'grip-accessibility' }
  )
)

function applyToHtml() {
  setTimeout(() => {
    const { dyslexicFont, largeText, highContrast, childTheme, adultTheme } = useAccessibilityStore.getState()
    const html = document.documentElement
    html.classList.toggle('font-dyslexic', dyslexicFont)
    html.classList.toggle('text-large', largeText)
    html.classList.toggle('high-contrast', highContrast)
    // Thema attributen
    if (childTheme !== 'default') {
      html.setAttribute('data-child-theme', childTheme)
    } else {
      html.removeAttribute('data-child-theme')
    }
    if (adultTheme !== 'default') {
      html.setAttribute('data-adult-theme', adultTheme)
    } else {
      html.removeAttribute('data-adult-theme')
    }
  }, 0)
}

export function initAccessibility() {
  const { dyslexicFont, largeText, highContrast, childTheme, adultTheme } = useAccessibilityStore.getState()
  const html = document.documentElement
  html.classList.toggle('font-dyslexic', dyslexicFont)
  html.classList.toggle('text-large', largeText)
  html.classList.toggle('high-contrast', highContrast)
  if (childTheme !== 'default') html.setAttribute('data-child-theme', childTheme)
  if (adultTheme !== 'default') html.setAttribute('data-adult-theme', adultTheme)
}
