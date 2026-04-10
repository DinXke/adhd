/**
 * AvatarDisplay — toont de juiste avatar voor een kind.
 * Gebruikt emoji's uit de AVATARS array, met SVG-fallback voor onbekende ID's.
 */

export type AvatarCategory = 'meisje' | 'jongen' | 'neutraal' | 'dier' | 'fantasie' | 'grappig'

export interface AvatarEntry {
  id: string
  label: string
  emoji: string
  /** Category used for filtering in the picker */
  category: AvatarCategory
  /** Gender sent to backend — non-person avatars map to 'neutraal' */
  gender: 'meisje' | 'jongen' | 'neutraal'
}

export const AVATARS: AvatarEntry[] = [
  // ── Meisje ────────────────────────────────────────────────
  { id: 'meisje-1', label: 'Meisje',          emoji: '👧', category: 'meisje', gender: 'meisje' },
  { id: 'meisje-2', label: 'Prinses',         emoji: '👸', category: 'meisje', gender: 'meisje' },
  { id: 'meisje-3', label: 'Danseres',        emoji: '💃', category: 'meisje', gender: 'meisje' },

  // ── Jongen ────────────────────────────────────────────────
  { id: 'jongen-1', label: 'Jongen',          emoji: '👦', category: 'jongen', gender: 'jongen' },
  { id: 'jongen-2', label: 'Krullen',         emoji: '👨‍🦱', category: 'jongen', gender: 'jongen' },
  { id: 'jongen-3', label: 'Danser',          emoji: '🕺', category: 'jongen', gender: 'jongen' },

  // ── Neutraal ──────────────────────────────────────────────
  { id: 'neutraal-1', label: 'Kind',          emoji: '🧒', category: 'neutraal', gender: 'neutraal' },
  { id: 'neutraal-2', label: 'Baby',          emoji: '👶', category: 'neutraal', gender: 'neutraal' },
  { id: 'neutraal-3', label: 'Engel',         emoji: '👼', category: 'neutraal', gender: 'neutraal' },

  // ── Dieren ────────────────────────────────────────────────
  { id: 'dier-kat',        label: 'Kat',        emoji: '🐱', category: 'dier', gender: 'neutraal' },
  { id: 'dier-hond',       label: 'Hond',       emoji: '🐶', category: 'dier', gender: 'neutraal' },
  { id: 'dier-konijn',     label: 'Konijn',     emoji: '🐰', category: 'dier', gender: 'neutraal' },
  { id: 'dier-beer',       label: 'Beer',       emoji: '🐻', category: 'dier', gender: 'neutraal' },
  { id: 'dier-panda',      label: 'Panda',      emoji: '🐼', category: 'dier', gender: 'neutraal' },
  { id: 'dier-vos',        label: 'Vos',        emoji: '🦊', category: 'dier', gender: 'neutraal' },
  { id: 'dier-uil',        label: 'Uil',        emoji: '🦉', category: 'dier', gender: 'neutraal' },
  { id: 'dier-eenhoorn',   label: 'Eenhoorn',   emoji: '🦄', category: 'dier', gender: 'neutraal' },
  { id: 'dier-vlinder',    label: 'Vlinder',    emoji: '🦋', category: 'dier', gender: 'neutraal' },
  { id: 'dier-dolfijn',    label: 'Dolfijn',    emoji: '🐬', category: 'dier', gender: 'neutraal' },
  { id: 'dier-leeuw',      label: 'Leeuw',      emoji: '🦁', category: 'dier', gender: 'neutraal' },
  { id: 'dier-schildpad',  label: 'Schildpad',  emoji: '🐢', category: 'dier', gender: 'neutraal' },

  // ── Fantasie ──────────────────────────────────────────────
  { id: 'fantasie-alien',      label: 'Alien',      emoji: '👽', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-robot',      label: 'Robot',      emoji: '🤖', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-astronaut',  label: 'Astronaut',  emoji: '🧑‍🚀', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-superheld',  label: 'Superheld',  emoji: '🦸', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-draak',      label: 'Draak',      emoji: '🐉', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-tovenaar',   label: 'Tovenaar',   emoji: '🧙', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-fee',        label: 'Fee',        emoji: '🧚', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-zeemeermin', label: 'Zeemeermin', emoji: '🧜', category: 'fantasie', gender: 'neutraal' },
  { id: 'fantasie-geest',      label: 'Spookje',    emoji: '👻', category: 'fantasie', gender: 'neutraal' },

  // ── Grappig ───────────────────────────────────────────────
  { id: 'grappig-clown',     label: 'Clown',      emoji: '🤡', category: 'grappig', gender: 'neutraal' },
  { id: 'grappig-piraat',    label: 'Piraat',     emoji: '🏴‍☠️', category: 'grappig', gender: 'neutraal' },
  { id: 'grappig-ninja',     label: 'Ninja',      emoji: '🥷', category: 'grappig', gender: 'neutraal' },
  { id: 'grappig-detective', label: 'Detective',  emoji: '🕵️', category: 'grappig', gender: 'neutraal' },
  { id: 'grappig-chef',      label: 'Chef-kok',   emoji: '🧑‍🍳', category: 'grappig', gender: 'neutraal' },
  { id: 'grappig-cowboy',    label: 'Cowboy',     emoji: '🤠', category: 'grappig', gender: 'neutraal' },
  { id: 'grappig-nerd',      label: 'Nerd',       emoji: '🤓', category: 'grappig', gender: 'neutraal' },
  { id: 'grappig-cool',      label: 'Cool',       emoji: '😎', category: 'grappig', gender: 'neutraal' },
]

/** Quick lookup map for avatar entries by id */
const AVATAR_MAP = new Map(AVATARS.map((a) => [a.id, a]))

/** Fallback emoji per category (used when avatarId doesn't match any known entry) */
const FALLBACK_EMOJI: Record<string, string> = {
  meisje: '👧',
  jongen: '👦',
  neutraal: '🧒',
  dier: '🐾',
  fantasie: '✨',
  grappig: '🎭',
}

/** All distinct categories for use in filter UIs */
export const AVATAR_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'alle',     label: 'Alle',     emoji: '' },
  { key: 'meisje',   label: 'Meisje',   emoji: '👧' },
  { key: 'jongen',   label: 'Jongen',   emoji: '👦' },
  { key: 'neutraal', label: 'Neutraal', emoji: '🧒' },
  { key: 'dier',     label: 'Dieren',   emoji: '🐾' },
  { key: 'fantasie', label: 'Fantasie', emoji: '✨' },
  { key: 'grappig',  label: 'Grappig',  emoji: '🎭' },
]

interface AvatarDisplayProps {
  avatarId?: string | null
  avatarUrl?: string | null
  name?: string
  size?: number
  className?: string
}

export function AvatarDisplay({ avatarId, avatarUrl, name, size = 64, className = '' }: AvatarDisplayProps) {
  // Check if avatarId matches a known entry — if so, render its emoji directly
  const knownAvatar = avatarId ? AVATAR_MAP.get(avatarId) : null

  if (knownAvatar) {
    return (
      <span
        role="img"
        aria-label={knownAvatar.label}
        style={{ fontSize: size * 0.7, lineHeight: `${size}px`, display: 'inline-block', width: size, height: size, textAlign: 'center' } as React.CSSProperties}
        className={className}
      >
        {knownAvatar.emoji}
      </span>
    )
  }

  // Unknown avatarId — try loading as SVG file (backward compat)
  if (avatarId) {
    const category = avatarId.split('-')[0] ?? 'neutraal'
    const fallback = FALLBACK_EMOJI[category] ?? '🧒'

    return (
      <img
        src={`/avatars/${avatarId}.svg`}
        alt={name ?? 'Avatar'}
        width={size}
        height={size}
        className={className}
        onError={(e) => {
          const el = e.currentTarget
          el.style.display = 'none'
          const span = document.createElement('span')
          span.style.fontSize = `${size * 0.7}px`
          span.style.lineHeight = `${size}px`
          span.style.display = 'inline-block'
          span.style.width = `${size}px`
          span.style.height = `${size}px`
          span.style.textAlign = 'center'
          span.textContent = fallback
          el.parentNode?.insertBefore(span, el)
        }}
      />
    )
  }

  // Custom avatar URL (uploaded photo)
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        width={size}
        height={size}
        className={className}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }

  // No avatar at all — show generic fallback
  return (
    <span
      style={{ fontSize: size * 0.7, lineHeight: `${size}px`, display: 'inline-block', width: size, height: size, textAlign: 'center' } as React.CSSProperties}
      className={className}
    >
      🧒
    </span>
  )
}
