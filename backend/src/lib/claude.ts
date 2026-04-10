/**
 * Claude Haiku client voor oefening-generatie en hint-generatie.
 * Graceful fallback als CLAUDE_API_KEY niet ingesteld is.
 */
import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY niet ingesteld. Voeg toe in .env om AI-functies te activeren.')
    }
    _client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
  }
  return _client
}

export function hasClaudeKey(): boolean {
  return !!process.env.CLAUDE_API_KEY
}

// ── Oefeningen genereren ──────────────────────────────────────

export interface GeneratedExercise {
  type: string
  title?: string
  question: string
  options?: string[]
  answer: string | number
  hints: { type: 'text'; content: string }[]
  explanation: string
  tags: string[]
}

export async function generateExercises(opts: {
  subject: string
  theme: string
  difficulty: number
  count: number
  childAge?: number
  recentErrors?: string[]
}): Promise<GeneratedExercise[]> {
  const client = getClient()

  // Map difficulty to an effective age so content matches the child's level.
  // difficulty 1 = childAge - 1 year (makkelijker)
  // difficulty 2 = childAge - 0.5 year
  // difficulty 3 = childAge (op niveau)
  // difficulty 4 = childAge + 0.5 year
  // difficulty 5 = childAge + 1 year
  const ageOffsetMap: Record<number, number> = { 1: -1, 2: -0.5, 3: 0, 4: 0.5, 5: 1 }
  const effectiveAge = opts.childAge
    ? opts.childAge + (ageOffsetMap[opts.difficulty] ?? 0)
    : undefined

  const ageGuidance = opts.childAge
    ? `- Leeftijd van het kind: ${opts.childAge} jaar
- Effectieve leeftijd voor dit niveau: ${effectiveAge} jaar
  (niveau ${opts.difficulty}/5 → ${opts.difficulty <= 2 ? 'makkelijker dan leeftijd' : opts.difficulty === 3 ? 'op leeftijdsniveau' : 'uitdagender dan leeftijd'})
- BELANGRIJK: Pas de complexiteit, woordenschat en getallen aan voor een kind van ~${effectiveAge} jaar.
  Niveau 1 = makkelijker (leerstof van ~1 jaar jonger), niveau 5 = uitdagender (leerstof van ~1 jaar ouder).`
    : ''

  const prompt = `Je bent een oefening-generator voor kinderen met ADHD in Vlaanderen.

Genereer ${opts.count} oefeningen voor:
- Vak: ${opts.subject}
- Thema: ${opts.theme}
- Niveau: ${opts.difficulty}/5 (${opts.difficulty <= 2 ? 'basis' : opts.difficulty <= 3 ? 'gemiddeld' : 'gevorderd'})
${ageGuidance}
${opts.recentErrors?.length ? `- Vermijd deze fouten recent gemaakt: ${opts.recentErrors.join(', ')}` : ''}

REGELS:
- Taal: Vlaams Nederlands, B1-niveau, korte zinnen
- Nooit: "FOUT", "verkeerd", negatieve feedback
- Wel: positieve, concrete formuleringen
- Antwoorden: altijd een enkel getal of kort woord (max 20 tekens)
- Voor meerkeuze: exact 4 opties, waarvan 1 correct
- Hints: visueel en concreet (bv. "denk aan 3 groepen van 4 blokjes")
- Type keuze: gebruik 'multiple_choice' voor de meeste oefeningen

Geef ALLEEN geldig JSON terug (array), geen andere tekst:
[
  {
    "type": "multiple_choice",
    "title": "Korte titel",
    "question": "De vraag tekst",
    "options": ["optie1", "optie2", "optie3", "optie4"],
    "answer": "correct antwoord (zelfde als één van de opties)",
    "hints": [
      {"type": "text", "content": "Eerste hint, concreet en positief"},
      {"type": "text", "content": "Tweede hint, nog meer uitleg"}
    ],
    "explanation": "Uitleg van het juiste antwoord",
    "tags": ["tag1", "tag2"]
  }
]`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''

  // JSON extraheren (soms staat er extra tekst omheen)
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Claude gaf geen geldige JSON terug')

  const parsed = JSON.parse(match[0]) as GeneratedExercise[]
  return parsed.slice(0, opts.count)
}

// ── Hint genereren bij fout antwoord ─────────────────────────

export async function generateHint(opts: {
  question: string
  wrongAnswer: string
  correctAnswer: string | number
  subject: string
  difficulty: number
}): Promise<string> {
  const client = getClient()

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Kind (ADHD, niveau ${opts.difficulty}/5) antwoordde "${opts.wrongAnswer}" op:
"${opts.question}"

Het juiste antwoord is: ${opts.correctAnswer}

Geef EEN korte, positieve hint (max 2 zinnen, Vlaams Nederlands, B1, concreet voorbeeld).
Zeg NIET wat fout is, maar help het kind nadenken.
Geef ALLEEN de hint-tekst terug, geen andere uitleg.`,
      },
    ],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}
