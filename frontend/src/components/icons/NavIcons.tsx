/**
 * Handgetekende lijn-iconen voor de navigatie.
 * 3px stroke, ronde uiteinden, organisch maar herkenbaar.
 * GEEN Lucide, Heroicons of FontAwesome.
 */

interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

const iconProps = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 32 32',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: sw,
})

// 🏠 Mijn Dag — Huis met hartje
export function IconHome({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      {/* Dak */}
      <path d="M4 14L16 4L28 14" stroke="currentColor" />
      {/* Muren */}
      <path d="M6 13V26C6 26.6 6.4 27 7 27H12V20H20V27H25C25.6 27 26 26.6 26 26V13" stroke="currentColor" />
      {/* Hartje op de deur */}
      <path d="M16 17C16 17 13 15 13 13.5C13 12.1 14.1 11 15.5 11C15.8 11 16 11.2 16 11.2C16 11.2 16.2 11 16.5 11C17.9 11 19 12.1 19 13.5C19 15 16 17 16 17Z" stroke="currentColor" />
    </svg>
  )
}

// 📚 Oefenen — Boek met ster
export function IconExercise({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      {/* Boek */}
      <path d="M6 5H22C23.1 5 24 5.9 24 7V25C24 26.1 23.1 27 22 27H6V5Z" stroke="currentColor" />
      {/* Ruggetje */}
      <path d="M10 5V27" stroke="currentColor" />
      {/* Lijntjes pagina */}
      <path d="M14 11H21" stroke="currentColor" />
      <path d="M14 15H21" stroke="currentColor" />
      {/* Ster */}
      <path d="M17.5 18L18.3 20H20L18.8 21L19.2 23L17.5 22L15.8 23L16.2 21L15 20H16.7L17.5 18Z" stroke="currentColor" />
    </svg>
  )
}

// ⭐ Tokens — Ster met cirkel/spaarbalk
export function IconTokens({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      {/* Grote ster */}
      <path d="M16 4L18.5 11H26L20 15.5L22.5 22.5L16 18L9.5 22.5L12 15.5L6 11H13.5L16 4Z" stroke="currentColor" />
    </svg>
  )
}

// 😊 Hoe gaat het — Gezichtje
export function IconEmotion({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      {/* Gezicht */}
      <circle cx="16" cy="16" r="11" stroke="currentColor" />
      {/* Ogen */}
      <circle cx="12" cy="13" r="1.5" fill="currentColor" />
      <circle cx="20" cy="13" r="1.5" fill="currentColor" />
      {/* Glimlach */}
      <path d="M11 19C12.5 21.5 19.5 21.5 21 19" stroke="currentColor" />
    </svg>
  )
}

// 📋 Lijstjes — Klembord met afvinklijst
export function IconList({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      {/* Klembord */}
      <path d="M8 6H24V27C24 27.6 23.6 28 23 28H9C8.4 28 8 27.6 8 27V6Z" stroke="currentColor" />
      {/* Clip bovenaan */}
      <path d="M12 4H20V7H12V4Z" stroke="currentColor" />
      {/* Vinkje 1 */}
      <path d="M11 13L13 15L17 11" stroke="currentColor" />
      {/* Lijntje 1 */}
      <path d="M19 13H22" stroke="currentColor" />
      {/* Vinkje 2 */}
      <path d="M11 19L13 21L17 17" stroke="currentColor" />
      {/* Lijntje 2 */}
      <path d="M19 19H22" stroke="currentColor" />
    </svg>
  )
}

// ⚙️ Instellingen — Tandwiel (organisch)
export function IconSettings({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="4" stroke="currentColor" />
      <path d="M16 4V7M16 25V28M4 16H7M25 16H28M7.5 7.5L9.5 9.5M22.5 22.5L24.5 24.5M7.5 24.5L9.5 22.5M22.5 9.5L24.5 7.5" stroke="currentColor" />
    </svg>
  )
}

// 💬 Communicatie — Berichtjes
export function IconCommunication({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      {/* Groot bericht */}
      <path d="M4 7C4 5.9 4.9 5 6 5H22C23.1 5 24 5.9 24 7V17C24 18.1 23.1 19 22 19H14L8 23V19H6C4.9 19 4 18.1 4 17V7Z" stroke="currentColor" />
      {/* Dots */}
      <circle cx="10" cy="13" r="1.2" fill="currentColor" />
      <circle cx="16" cy="13" r="1.2" fill="currentColor" />
    </svg>
  )
}

// 📁 Dossier — Map
export function IconDossier({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      <path d="M4 10C4 8.9 4.9 8 6 8H12L14 11H26C27.1 11 28 11.9 28 13V24C28 25.1 27.1 26 26 26H6C4.9 26 4 25.1 4 24V10Z" stroke="currentColor" />
    </svg>
  )
}

// ✅ Taak afgerond — Vinkje in rondje
export function IconCheck({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="11" stroke="currentColor" />
      <path d="M10 16L14 20L22 12" stroke="currentColor" />
    </svg>
  )
}

// ← Terug-pijl
export function IconBack({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      <path d="M20 16H8M8 16L13 11M8 16L13 21" stroke="currentColor" />
    </svg>
  )
}

// + Toevoegen
export function IconPlus({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      <path d="M16 6V26M6 16H26" stroke="currentColor" />
    </svg>
  )
}

// 🎉 Feest — confetti
export function IconCelebrate({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      <path d="M5 27L12 10L22 20L5 27Z" stroke="currentColor" />
      <path d="M18 6L20 9" stroke="currentColor" />
      <path d="M23 9L26 8" stroke="currentColor" />
      <path d="M22 14L25 15" stroke="currentColor" />
      <circle cx="20" cy="6" r="1.5" fill="currentColor" />
    </svg>
  )
}

// 🔔 Notificatie
export function IconBell({ size = 28, className = '', strokeWidth = 3 }: IconProps) {
  return (
    <svg {...iconProps(size, strokeWidth)} className={className} aria-hidden="true">
      <path d="M16 4C16 4 10 6 10 14V20H22V14C22 6 16 4 16 4Z" stroke="currentColor" />
      <path d="M8 20H24" stroke="currentColor" />
      <path d="M14 24C14 25.1 14.9 26 16 26C17.1 26 18 25.1 18 24" stroke="currentColor" />
    </svg>
  )
}
