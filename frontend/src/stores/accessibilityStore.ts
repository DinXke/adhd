/**
 * Toegankelijkheidsvoorkeuren — OpenDyslexic, grote tekst, hoog contrast
 * Opgeslagen in localStorage, direct toegepast op <html>
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AccessibilityState {
  dyslexicFont: boolean
  largeText: boolean
  highContrast: boolean
  setDyslexicFont: (v: boolean) => void
  setLargeText: (v: boolean) => void
  setHighContrast: (v: boolean) => void
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      dyslexicFont: false,
      largeText: false,
      highContrast: false,
      setDyslexicFont: (v) => {
        set({ dyslexicFont: v })
        applyToHtml()
      },
      setLargeText: (v) => {
        set({ largeText: v })
        applyToHtml()
      },
      setHighContrast: (v) => {
        set({ highContrast: v })
        applyToHtml()
      },
    }),
    { name: 'grip-accessibility' }
  )
)

// CSS klassen op <html> zetten
function applyToHtml() {
  // Wordt aangeroepen na set, maar state is nog niet bijgewerkt.
  // Lees direct uit store:
  setTimeout(() => {
    const { dyslexicFont, largeText, highContrast } = useAccessibilityStore.getState()
    const html = document.documentElement
    html.classList.toggle('font-dyslexic', dyslexicFont)
    html.classList.toggle('text-large', largeText)
    html.classList.toggle('high-contrast', highContrast)
  }, 0)
}

// Initieel toepassen bij app-start
export function initAccessibility() {
  const { dyslexicFont, largeText, highContrast } = useAccessibilityStore.getState()
  const html = document.documentElement
  html.classList.toggle('font-dyslexic', dyslexicFont)
  html.classList.toggle('text-large', largeText)
  html.classList.toggle('high-contrast', highContrast)
}
