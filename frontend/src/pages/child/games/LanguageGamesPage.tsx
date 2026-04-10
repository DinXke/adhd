/**
 * Taalspelletjes — 7 interactieve spelletjes voor taal en spelling.
 *
 * Spelletjes:
 * 1. WordScramble  — Woordpuzzel (letters in juiste volgorde)
 * 2. WordSearch    — Woordzoeker (woorden vinden in een raster)
 * 3. LetterMemory  — Memory met lettercombinaties
 * 4. SentenceBuilder — Zinnen bouwen uit losse woorden
 * 5. SpellingBee   — Woorden spellen bij een afbeelding
 * 6. CategorySort  — Woorden sorteren in categorieen
 * 7. WordCircle    — Woordcirkel (letters verbinden tot woorden)
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { api } from '../../../lib/api'
import { soundTap, soundMatch, soundFlip, soundPickup, soundDrop, soundWin, feedbackCorrect, feedbackWrong, feedbackWin, isMuted, toggleMute } from '../../../lib/sounds'

// ── Hulpfuncties ─────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pick<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

function starRating(pct: number): number {
  return pct >= 80 ? 3 : pct >= 50 ? 2 : 1
}

async function awardTokens(childId: string, amount: number, note: string) {
  try {
    await api.post(`/api/tokens/${childId}/grant`, { amount, note })
  } catch {
    // Silently fail — tokens are bonus, not critical
  }
}

// ── Woordenlijsten ───────────────────────────────────────────

const WORDS_EASY = [
  'kat', 'hond', 'vis', 'boom', 'huis', 'bal', 'bed', 'dak', 'zon', 'maan',
  'rood', 'bos', 'oog', 'oor', 'neus', 'hand', 'voet', 'melk', 'brood', 'soep',
  'boek', 'pen', 'tas', 'deur', 'raam', 'lam', 'koe', 'poes', 'bus', 'kar',
  'mus', 'vos', 'beer', 'zee', 'ijs',
]

const WORDS_MEDIUM = [
  'school', 'tafel', 'stoel', 'fiets', 'trein', 'appel', 'wortel', 'konijn',
  'bloem', 'wolken', 'kaars', 'feest', 'molen', 'rivier', 'beker', 'koffer',
  'mantel', 'winter', 'zomer', 'lente', 'herfst', 'middel', 'sleutel', 'planten',
  'sterren', 'bruggen', 'lepels', 'bergen', 'eiland', 'water',
]

const WORDS_HARD = [
  'vlinder', 'olifant', 'giraf', 'chocolade', 'bibliotheek', 'schommel',
  'verjaardag', 'sprinkhaan', 'zonnebloem', 'elfenboom', 'ontbijt',
  'vakantie', 'avontuur', 'toverkracht', 'speelplaats', 'nachtegaal',
  'schilderij', 'zwembad', 'pannenkoe', 'muzikant', 'snoepwinkel',
  'dierentuin', 'groenten', 'frietjes', 'slagroom', 'trampoline',
  'regenboog', 'buitenspel', 'luchtballon', 'kinderkamer',
]

function getWordList(difficulty: number): string[] {
  if (difficulty === 1) return WORDS_EASY
  if (difficulty === 2) return WORDS_MEDIUM
  return WORDS_HARD
}

// Woordzoeker-thema's
const WORDSEARCH_THEMES: Record<string, { label: string; words: string[] }> = {
  dieren: {
    label: 'Dieren',
    words: ['kat', 'hond', 'vis', 'poes', 'beer', 'vos', 'lam', 'koe', 'muis', 'eend', 'uil', 'haas'],
  },
  kleuren: {
    label: 'Kleuren',
    words: ['rood', 'geel', 'blauw', 'groen', 'wit', 'roze', 'oranje', 'paars', 'bruin', 'grijs'],
  },
  school: {
    label: 'School',
    words: ['boek', 'pen', 'tas', 'bord', 'juf', 'bel', 'les', 'map', 'lat', 'gum', 'potlood', 'stift'],
  },
  lichaam: {
    label: 'Lichaam',
    words: ['oog', 'oor', 'neus', 'mond', 'hand', 'voet', 'arm', 'been', 'rug', 'teen', 'buik', 'kin'],
  },
}

// Letter-memory combinaties
const LETTER_COMBOS: { combo: string; word: string; emoji: string; blanked: string }[] = [
  { combo: 'oe', word: 'boek', emoji: '📚', blanked: 'b__k' },
  { combo: 'ie', word: 'brief', emoji: '✉️', blanked: 'br__f' },
  { combo: 'ei', word: 'ei', emoji: '🥚', blanked: '__' },
  { combo: 'au', word: 'auto', emoji: '🚗', blanked: '__to' },
  { combo: 'ou', word: 'goud', emoji: '🪙', blanked: 'g__d' },
  { combo: 'eu', word: 'neus', emoji: '👃', blanked: 'n__s' },
  { combo: 'ui', word: 'huis', emoji: '🏠', blanked: 'h__s' },
  { combo: 'ij', word: 'bij', emoji: '🐝', blanked: 'b__' },
  { combo: 'aa', word: 'maan', emoji: '🌙', blanked: 'm__n' },
  { combo: 'oo', word: 'boom', emoji: '🌳', blanked: 'b__m' },
  { combo: 'ee', word: 'been', emoji: '🦵', blanked: 'b__n' },
  { combo: 'uu', word: 'vuur', emoji: '🔥', blanked: 'v__r' },
]

// Zinnen per moeilijkheidsgraad
const SENTENCES_EASY: string[] = [
  'De kat zit op de mat',
  'Ik ga naar school',
  'De bal is rood',
  'Mama maakt eten klaar',
  'De hond blaft hard',
  'Het regent buiten',
  'Ik heb een boek',
  'De zon schijnt mooi',
  'Papa leest de krant',
  'De vis zwemt snel',
  'Ik speel met de bal',
  'De vogel zingt luid',
  'Wij gaan naar huis',
  'Het kind lacht blij',
  'De boom is groot',
  'Ik drink warme melk',
  'De auto rijdt snel',
  'Het is koud buiten',
  'De baby slaapt rustig',
  'Ik hou van jou',
  'De bloem is mooi',
  'Het paard eet gras',
  'De maan is rond',
  'Ik heb een zus',
  'De trein vertrekt nu',
]

const SENTENCES_MEDIUM: string[] = [
  'De grote hond rent door het park',
  'Mama bakt een lekkere taart vandaag',
  'Ik ga morgen naar de dierentuin',
  'Het kleine konijn eet een wortel',
  'De kinderen spelen samen op het plein',
  'Papa koopt bloemen voor mama vandaag',
  'De juf leest een mooi verhaal voor',
  'Wij gaan met de trein naar Gent',
  'Het is vandaag heel mooi weer buiten',
  'De kat vangt een muis in de tuin',
  'Ik maak mijn huiswerk na school klaar',
  'De vogels vliegen hoog in de lucht',
  'Oma brengt altijd lekkere koekjes mee',
  'Het regent al de hele dag buiten',
  'De hond speelt graag met zijn bal',
  'Wij eten vanavond spaghetti met saus',
  'De meester schrijft sommen op het bord',
  'Mijn broer is jarig op woensdag',
  'De kerstboom staat mooi versierd in de kamer',
  'Ik lees een boek over piraten vanavond',
  'De eend zwemt in de vijver vandaag',
  'Het meisje tekent een paard met krijtjes',
  'Opa vertelt graag grappige verhalen aan ons',
  'De slak kruipt heel langzaam over het pad',
  'Wij gaan op vakantie naar de zee',
]

const SENTENCES_HARD: string[] = [
  'De vlinder vliegt van bloem naar bloem in de tuin',
  'Mijn vriendin heeft een schattig konijn dat Flap heet',
  'Gisteren zijn wij naar het zwembad geweest met de klas',
  'De boer melkt elke ochtend zijn koeien in de stal',
  'Ik heb een mooie tekening gemaakt voor de juf op school',
  'De kinderen bouwen een groot kasteel van zand op het strand',
  'Papa heeft een nieuwe fiets voor mij gekocht bij de winkel',
  'De herfstbladeren vallen zachtjes van de bomen in het park',
  'Mama maakt elke zondag pannenkoeken met suiker en citroen klaar',
  'Wij hebben op school een liedje gezongen voor het kerstfeest',
  'De brandweer kwam snel toen de kat in de boom zat',
  'Mijn oma breit een warme sjaal voor de koude winter',
  'De clown maakte grappige kunstjes op het verjaardagsfeest',
  'Ik heb vandaag geleerd hoe je een brief moet schrijven',
  'De sneeuwpop in de tuin heeft een wortel als neus',
  'Wij gaan morgen met de hele familie naar het pretpark',
  'De schildpad loopt heel langzaam maar wint toch de race',
  'Mijn zus speelt heel mooi viool op het schoolconcert',
  'De bakker maakt elke dag vers brood en lekkere taartjes',
  'Het kleine vogeltje heeft een nestje gebouwd in onze boom',
  'De bibliotheek heeft heel veel boeken over dieren en natuur',
  'Wij hebben een nieuw huisdier gekregen het is een hamster',
  'De regenboog verscheen aan de hemel na het onweer gisteren',
  'Papa leert mij fietsen zonder zijwieltjes in het park',
  'De luchtballon zweeft hoog boven de groene weilanden vandaag',
]

function getSentences(difficulty: number): string[] {
  if (difficulty === 1) return SENTENCES_EASY
  if (difficulty === 2) return SENTENCES_MEDIUM
  return SENTENCES_HARD
}

// SpellingBee woorden met emoji
const SPELLING_WORDS: { word: string; emoji: string }[] = [
  { word: 'huis', emoji: '🏠' }, { word: 'kat', emoji: '🐱' }, { word: 'boek', emoji: '📚' },
  { word: 'boom', emoji: '🌳' }, { word: 'zon', emoji: '☀️' }, { word: 'vis', emoji: '🐟' },
  { word: 'hond', emoji: '🐕' }, { word: 'bal', emoji: '⚽' }, { word: 'auto', emoji: '🚗' },
  { word: 'fiets', emoji: '🚲' }, { word: 'bloem', emoji: '🌸' }, { word: 'appel', emoji: '🍎' },
  { word: 'trein', emoji: '🚂' }, { word: 'maan', emoji: '🌙' }, { word: 'ster', emoji: '⭐' },
  { word: 'hart', emoji: '❤️' }, { word: 'sleutel', emoji: '🔑' }, { word: 'lamp', emoji: '💡' },
  { word: 'paard', emoji: '🐴' }, { word: 'vlinder', emoji: '🦋' }, { word: 'regen', emoji: '🌧️' },
  { word: 'brood', emoji: '🍞' }, { word: 'kaas', emoji: '🧀' }, { word: 'melk', emoji: '🥛' },
  { word: 'vogel', emoji: '🐦' }, { word: 'konijn', emoji: '🐰' }, { word: 'taart', emoji: '🎂' },
  { word: 'muis', emoji: '🐭' }, { word: 'beer', emoji: '🐻' }, { word: 'school', emoji: '🏫' },
]

// Categorieen voor CategorySort
const CATEGORY_SETS: { categories: { name: string; words: string[] }[] }[] = [
  {
    categories: [
      { name: 'Dieren', words: ['kat', 'hond', 'vis', 'paard', 'konijn', 'vogel', 'muis', 'beer'] },
      { name: 'Eten', words: ['appel', 'brood', 'kaas', 'taart', 'soep', 'melk', 'wortel', 'frietjes'] },
    ],
  },
  {
    categories: [
      { name: 'Kleuren', words: ['rood', 'blauw', 'geel', 'groen', 'wit', 'roze', 'paars', 'oranje'] },
      { name: 'Getallen', words: ['een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht'] },
    ],
  },
  {
    categories: [
      { name: 'School', words: ['boek', 'pen', 'juf', 'bord', 'les', 'stoel', 'tafel', 'tas'] },
      { name: 'Thuis', words: ['bed', 'bank', 'keuken', 'deur', 'raam', 'lamp', 'tuin', 'trap'] },
    ],
  },
  {
    categories: [
      { name: 'Fruit', words: ['appel', 'peer', 'banaan', 'druif', 'kers', 'sinaas'] },
      { name: 'Groenten', words: ['wortel', 'tomaat', 'sla', 'ui', 'boon', 'paprika'] },
      { name: 'Snoep', words: ['lolly', 'chocola', 'drop', 'kauwgom', 'koek', 'wafel'] },
    ],
  },
  {
    categories: [
      { name: 'Kleding', words: ['broek', 'jas', 'muts', 'sjaal', 'schoen', 'trui', 'rok', 'sok'] },
      { name: 'Weer', words: ['regen', 'sneeuw', 'wind', 'storm', 'hagel', 'mist', 'wolken', 'zon'] },
    ],
  },
  {
    categories: [
      { name: 'Voertuigen', words: ['auto', 'fiets', 'trein', 'bus', 'boot', 'vliegtuig'] },
      { name: 'Gebouwen', words: ['huis', 'school', 'kerk', 'winkel', 'ziekenhuis', 'station'] },
      { name: 'Natuur', words: ['boom', 'berg', 'rivier', 'bos', 'meer', 'bloem'] },
    ],
  },
]

// ── Gedeelde UI-componenten ──────────────────────────────────

function MuteButton() {
  const [m, setM] = useState(isMuted())
  return (
    <button
      onClick={() => { const newM = toggleMute(); setM(newM) }}
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{ background: 'var(--bg-surface)' }}
      title={m ? 'Geluid aan' : 'Geluid uit'}
    >
      {m ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
    </button>
  )
}

function GameHeader({
  title,
  round,
  totalRounds,
  score,
  onBack,
  onSkip,
}: {
  title: string
  round?: number
  totalRounds?: number
  score?: number
  onBack: () => void
  onSkip?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ background: 'var(--bg-primary)' }}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        className="font-display font-bold text-sm px-3 py-1.5 rounded-full"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
      >
        {'\u2190'} Terug
      </motion.button>
      {onSkip ? (
        <button onClick={onSkip} className="text-xs font-body underline" style={{ color: 'var(--text-muted)' }}>Overslaan {'\u2192'}</button>
      ) : null}
      <MuteButton />
      <div className="text-center flex-1">
        <h2 className="font-display font-bold text-ink" style={{ fontSize: 16 }}>{title}</h2>
        {round !== undefined && totalRounds !== undefined && (
          <p className="font-body text-ink-muted text-xs">{round} / {totalRounds}</p>
        )}
      </div>
      {score !== undefined ? (
        <div className="font-display font-bold px-3 py-1 rounded-full" style={{ background: 'var(--accent-token)', color: '#3D3229', fontSize: 15 }}>
          {score} pt
        </div>
      ) : (
        <div className="w-12" />
      )}
    </div>
  )
}

function GameResult({
  score,
  maxScore,
  label,
  onReplay,
  onBack,
  tokensEarned,
}: {
  score: number
  maxScore: number
  label?: string
  onReplay: () => void
  onBack: () => void
  tokensEarned: number
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const stars = starRating(pct)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      >
        <div className="text-5xl mb-3">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        <h2
          className="font-display font-bold text-ink mb-1"
          style={{ fontSize: 'clamp(24px, 6vw, 32px)' }}
        >
          {pct >= 80 ? 'Geweldig!' : pct >= 50 ? 'Goed gedaan!' : 'Blijf oefenen!'}
        </h2>
        <p className="font-body text-ink-muted text-lg mb-1">
          {label || `${score} van ${maxScore} goed (${pct}%)`}
        </p>
        {tokensEarned > 0 && (
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="font-display font-bold text-xl mb-6"
            style={{ color: 'var(--accent-token)' }}
          >
            +{tokensEarned} ⭐ verdiend!
          </motion.p>
        )}
        {tokensEarned === 0 && <div className="mb-6" />}
      </motion.div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onReplay}
          className="font-display font-bold py-4 text-lg"
          style={{
            background: 'var(--accent-primary)',
            color: 'white',
            borderRadius: '999px',
          }}
        >
          Nog een keer!
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onBack}
          className="font-body font-semibold py-3.5"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
          }}
        >
          Terug naar spelletjes
        </motion.button>
      </div>
    </motion.div>
  )
}

function SuccessOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ background: 'rgba(91,140,90,0.15)' }}
    >
      <span className="text-8xl">⭐</span>
    </motion.div>
  )
}

// ── 1. WordScramble — Woordpuzzel ────────────────────────────

function WordScramble({
  onBack,
  difficulty,
}: {
  onBack: () => void
  difficulty: number
}) {
  const { user } = useAuthStore()
  const TOTAL_ROUNDS = 8
  const [gameKey, setGameKey] = useState(0)
  const words = useMemo(() => pick(getWordList(difficulty), TOTAL_ROUNDS), [difficulty, gameKey])

  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [placed, setPlaced] = useState<(string | null)[]>([])
  const [available, setAvailable] = useState<{ letter: string; id: number }[]>([])
  const [showHint, setShowHint] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [done, setDone] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)
  const [showSkipAnswer, setShowSkipAnswer] = useState(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentWord = words[round] || ''

  // Initialiseer de ronde
  useEffect(() => {
    if (round >= TOTAL_ROUNDS) return
    const w = words[round]
    if (!w) return
    setPlaced(Array(w.length).fill(null))
    // Scramble — zorg dat het niet hetzelfde is als origineel
    let scrambled = shuffle(w.split(''))
    while (scrambled.join('') === w && w.length > 1) {
      scrambled = shuffle(w.split(''))
    }
    setAvailable(scrambled.map((l, i) => ({ letter: l, id: i })))
    setShowHint(false)
    setCorrect(false)
    // Hint na 10 seconden
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => setShowHint(true), 10000)
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [round, words])

  const handleLetterTap = useCallback(
    (item: { letter: string; id: number }) => {
      if (correct) return
      soundTap()
      // Vind eerste lege plek
      const idx = placed.indexOf(null)
      if (idx === -1) return
      const newPlaced = [...placed]
      newPlaced[idx] = item.letter
      setPlaced(newPlaced)
      setAvailable((prev) => prev.filter((a) => a.id !== item.id))
      // Check of woord compleet en correct is
      if (newPlaced.every((l) => l !== null)) {
        const attempt = newPlaced.join('')
        if (attempt === currentWord) {
          feedbackCorrect()
          setCorrect(true)
          setShowSuccess(true)
          setScore((s) => s + 1)
          if (navigator.vibrate) navigator.vibrate(30)
          setTimeout(() => {
            setShowSuccess(false)
            if (round + 1 >= TOTAL_ROUNDS) {
              finishGame(score + 1)
            } else {
              setRound((r) => r + 1)
            }
          }, 900)
        } else {
          // Fout — schud en reset
          setTimeout(() => {
            setPlaced(Array(currentWord.length).fill(null))
            let scrambled = shuffle(currentWord.split(''))
            while (scrambled.join('') === currentWord && currentWord.length > 1) {
              scrambled = shuffle(currentWord.split(''))
            }
            setAvailable(scrambled.map((l, i) => ({ letter: l, id: i })))
          }, 600)
        }
      }
    },
    [placed, correct, currentWord, round, score],
  )

  const handleSlotTap = useCallback(
    (idx: number) => {
      if (correct || placed[idx] === null) return
      // Zet letter terug
      const letter = placed[idx]!
      const newPlaced = [...placed]
      newPlaced[idx] = null
      setPlaced(newPlaced)
      setAvailable((prev) => [...prev, { letter, id: Date.now() + idx }])
    },
    [placed, correct],
  )

  const handleSkipWordScramble = () => {
    if (correct || showSkipAnswer) return
    setShowSkipAnswer(true)
    setPlaced(currentWord.split(''))
    setAvailable([])
    setTimeout(() => {
      setShowSkipAnswer(false)
      if (round + 1 >= TOTAL_ROUNDS) {
        finishGame(score)
      } else {
        setRound((r) => r + 1)
      }
    }, 1500)
  }

  const finishGame = async (finalScore: number) => {
    soundWin()
    const tokens = Math.max(1, Math.round((finalScore / TOTAL_ROUNDS) * 3))
    setTokensEarned(tokens)
    if (user?.id) await awardTokens(user.id, tokens, `Woordpuzzel: ${finalScore}/${TOTAL_ROUNDS}`)
    setDone(true)
  }

  if (done) {
    return (
      <GameResult
        score={score}
        maxScore={TOTAL_ROUNDS}
        onReplay={() => {
          setRound(0)
          setScore(0)
          setDone(false)
          setTokensEarned(0)
          setGameKey((k) => k + 1)
        }}
        onBack={onBack}
        tokensEarned={tokensEarned}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <GameHeader title="Woordpuzzel" round={round + 1} totalRounds={TOTAL_ROUNDS} score={score} onBack={onBack} onSkip={handleSkipWordScramble} />
      <AnimatePresence>{showSuccess && <SuccessOverlay />}</AnimatePresence>

      <div className="flex-1 overflow-auto flex flex-col items-center justify-center px-5 pb-24 gap-6">
        {/* Hint */}
        <AnimatePresence>
          {showHint && !correct && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl px-4 py-2 font-body text-sm text-center"
              style={{ background: 'rgba(168,197,214,0.2)', color: 'var(--text-primary)' }}
            >
              💡 Het woord begint met <strong>&ldquo;{currentWord[0].toUpperCase()}&rdquo;</strong>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Doelvakjes */}
        <div className="flex gap-2 flex-wrap justify-center">
          {placed.map((letter, i) => (
            <motion.button
              key={i}
              whileTap={letter ? { scale: 0.9 } : {}}
              onClick={() => handleSlotTap(i)}
              className="font-display font-bold flex items-center justify-center"
              style={{
                width: 'clamp(44px, 12vw, 60px)',
                height: 'clamp(52px, 14vw, 68px)',
                fontSize: 'clamp(20px, 6vw, 30px)',
                borderRadius: 16,
                background: letter
                  ? correct
                    ? 'var(--accent-success)'
                    : 'var(--accent-calm)'
                  : showHint && i === 0
                  ? 'rgba(168,197,214,0.3)'
                  : 'var(--bg-card)',
                color: letter ? 'white' : 'var(--text-muted)',
                border: `2px dashed ${letter ? 'transparent' : 'var(--border-color)'}`,
                textTransform: 'uppercase',
              }}
              layout
            >
              {letter || (showHint && i === 0 ? currentWord[0].toUpperCase() : '')}
            </motion.button>
          ))}
        </div>

        {/* Beschikbare letters — draggable + tappable */}
        <div className="flex gap-2 flex-wrap justify-center mt-4">
          <AnimatePresence>
            {available.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                drag
                dragSnapToOrigin
                dragElastic={0.5}
                onDragEnd={(_e, info) => {
                  // If dragged far enough upward (toward target slots), place the letter
                  if (Math.abs(info.offset.y) > 40 || Math.abs(info.offset.x) > 40) {
                    handleLetterTap(item)
                  }
                }}
                onTap={() => handleLetterTap(item)}
                whileTap={{ scale: 0.85 }}
                whileDrag={{ scale: 1.15, zIndex: 50 }}
                className="font-display font-bold flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                style={{
                  width: 'clamp(48px, 13vw, 64px)',
                  height: 'clamp(48px, 13vw, 64px)',
                  fontSize: 'clamp(22px, 6vw, 32px)',
                  borderRadius: '999px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  textTransform: 'uppercase',
                }}
              >
                {item.letter}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── 2. WordSearch — Woordzoeker ──────────────────────────────

interface GridCell {
  letter: string
  row: number
  col: number
  partOf: string[]  // welke woorden op deze cel staan
}

function generateWordSearchGrid(
  words: string[],
  size: number,
): { grid: GridCell[][]; placedWords: string[] } {
  const grid: GridCell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      letter: '',
      row: r,
      col: c,
      partOf: [],
    })),
  )
  const directions = [
    [0, 1],   // horizontaal
    [1, 0],   // verticaal
    [1, 1],   // diagonaal rechts-omlaag
  ]
  const placedWords: string[] = []

  for (const word of words) {
    let placed = false
    for (let attempt = 0; attempt < 80; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)]
      const maxR = size - word.length * dir[0]
      const maxC = size - word.length * dir[1]
      if (maxR < 0 || maxC < 0) continue
      const startR = Math.floor(Math.random() * (maxR + (dir[0] === 0 ? size : 0)))
      const startC = Math.floor(Math.random() * (maxC + (dir[1] === 0 ? size : 0)))
      // Check of het woord past
      let fits = true
      for (let i = 0; i < word.length; i++) {
        const r = startR + i * dir[0]
        const c = startC + i * dir[1]
        if (r < 0 || r >= size || c < 0 || c >= size) { fits = false; break }
        const existing = grid[r][c].letter
        if (existing && existing !== word[i]) { fits = false; break }
      }
      if (fits) {
        for (let i = 0; i < word.length; i++) {
          const r = startR + i * dir[0]
          const c = startC + i * dir[1]
          grid[r][c].letter = word[i]
          grid[r][c].partOf.push(word)
        }
        placedWords.push(word)
        placed = true
        break
      }
    }
  }

  // Vul lege cellen met willekeurige letters
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c].letter) {
        grid[r][c].letter = alphabet[Math.floor(Math.random() * alphabet.length)]
      }
    }
  }

  return { grid, placedWords }
}

function WordSearch({
  onBack,
  difficulty,
}: {
  onBack: () => void
  difficulty: number
}) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const size = difficulty === 1 ? 8 : 10
  const wordCount = difficulty === 1 ? 4 : difficulty === 2 ? 5 : 6
  const themeKey = useMemo(() => {
    const keys = Object.keys(WORDSEARCH_THEMES)
    return keys[Math.floor(Math.random() * keys.length)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])
  const theme = WORDSEARCH_THEMES[themeKey]
  const selectedWords = useMemo(() => {
    // Filter woorden die in het raster passen
    const fitting = theme.words.filter((w) => w.length <= size)
    return pick(fitting, wordCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey, size, wordCount, gameKey])

  const { grid, placedWords } = useMemo(
    () => generateWordSearchGrid(selectedWords, size),
    [selectedWords, size],
  )

  const [found, setFound] = useState<string[]>([])
  const [selecting, setSelecting] = useState<{ row: number; col: number }[]>([])
  const [done, setDone] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

  const cellSize = Math.min(40, (window.innerWidth - 48) / size)

  const getCellFromTouch = useCallback(
    (x: number, y: number): { row: number; col: number } | null => {
      if (!gridRef.current) return null
      const rect = gridRef.current.getBoundingClientRect()
      const col = Math.floor((x - rect.left) / cellSize)
      const row = Math.floor((y - rect.top) / cellSize)
      if (row < 0 || row >= size || col < 0 || col >= size) return null
      return { row, col }
    },
    [cellSize, size],
  )

  const handlePointerDown = useCallback(
    (row: number, col: number) => {
      soundTap()
      setSelecting([{ row, col }])
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (selecting.length === 0) return
      const cell = getCellFromTouch(e.clientX, e.clientY)
      if (!cell) return
      const start = selecting[0]
      // Bereken richting
      const dr = Math.sign(cell.row - start.row)
      const dc = Math.sign(cell.col - start.col)
      // Alleen hor, vert of diag
      if (dr !== 0 && dc !== 0 && Math.abs(cell.row - start.row) !== Math.abs(cell.col - start.col)) return
      if (dr === 0 && dc === 0) {
        setSelecting([start])
        return
      }
      const len = Math.max(Math.abs(cell.row - start.row), Math.abs(cell.col - start.col)) + 1
      const cells: { row: number; col: number }[] = []
      for (let i = 0; i < len; i++) {
        cells.push({ row: start.row + i * dr, col: start.col + i * dc })
      }
      setSelecting(cells)
    },
    [selecting, getCellFromTouch],
  )

  const handlePointerUp = useCallback(() => {
    if (selecting.length < 2) {
      setSelecting([])
      return
    }
    // Stel het geselecteerde woord samen
    const word = selecting.map((c) => grid[c.row][c.col].letter).join('')
    const wordReversed = [...selecting].reverse().map((c) => grid[c.row][c.col].letter).join('')
    if (placedWords.includes(word) && !found.includes(word)) {
      soundMatch()
      setFound((f) => [...f, word])
      if (navigator.vibrate) navigator.vibrate(30)
      // Check of alles gevonden
      if (found.length + 1 === placedWords.length) {
        feedbackWin()
        finishGame(found.length + 1)
      }
    } else if (placedWords.includes(wordReversed) && !found.includes(wordReversed)) {
      soundMatch()
      setFound((f) => [...f, wordReversed])
      if (navigator.vibrate) navigator.vibrate(30)
      if (found.length + 1 === placedWords.length) {
        feedbackWin()
        finishGame(found.length + 1)
      }
    }
    setSelecting([])
  }, [selecting, grid, placedWords, found])

  const handleSkipWordSearch = () => {
    // Reveal all remaining words and finish
    setFound([...placedWords])
    setTimeout(() => {
      finishGame(found.length)
    }, 1500)
  }

  const finishGame = async (finalFound: number) => {
    const tokens = Math.max(1, Math.round((finalFound / placedWords.length) * 3))
    setTokensEarned(tokens)
    if (user?.id) await awardTokens(user.id, tokens, `Woordzoeker: ${finalFound}/${placedWords.length}`)
    setDone(true)
  }

  const isSelected = (row: number, col: number) => selecting.some((c) => c.row === row && c.col === col)
  const isFound = (row: number, col: number) =>
    grid[row][col].partOf.some((w) => found.includes(w))

  const foundColors = ['var(--accent-calm)', 'var(--accent-primary)', 'var(--accent-success)', 'var(--accent-token)', '#9B7CC8', '#E8734A']

  if (done) {
    return (
      <GameResult
        score={found.length}
        maxScore={placedWords.length}
        label={`${found.length} van ${placedWords.length} woorden gevonden`}
        onReplay={() => {
          setFound([])
          setDone(false)
          setTokensEarned(0)
          setGameKey((k) => k + 1)
        }}
        onBack={onBack}
        tokensEarned={tokensEarned}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <GameHeader title={`Woordzoeker — ${theme.label}`} score={found.length} onBack={onBack} onSkip={handleSkipWordSearch} />

      <div className="flex-1 overflow-auto">
      {/* Woordenlijst */}
      <div className="flex flex-wrap gap-2 px-4 py-3 justify-center">
        {placedWords.map((w) => (
          <span
            key={w}
            className="font-body font-semibold px-3 py-1 rounded-full text-sm"
            style={{
              background: found.includes(w) ? 'var(--accent-success)' : 'var(--bg-card)',
              color: found.includes(w) ? 'white' : 'var(--text-primary)',
              textDecoration: found.includes(w) ? 'line-through' : 'none',
              border: `1.5px solid ${found.includes(w) ? 'var(--accent-success)' : 'var(--border-color)'}`,
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="flex items-center justify-center px-4 pb-6">
        <div
          ref={gridRef}
          className="touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
            gap: 1,
          }}
        >
          {grid.flat().map((cell) => {
            const sel = isSelected(cell.row, cell.col)
            const fnd = isFound(cell.row, cell.col)
            const foundWordIdx = fnd ? found.findIndex((w) => cell.partOf.includes(w)) : -1
            return (
              <motion.div
                key={`${cell.row}-${cell.col}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handlePointerDown(cell.row, cell.col)
                }}
                className="flex items-center justify-center font-display font-bold text-center select-none"
                style={{
                  width: cellSize,
                  height: cellSize,
                  fontSize: Math.max(12, cellSize * 0.5),
                  borderRadius: 6,
                  background: sel
                    ? 'var(--accent-primary)'
                    : fnd
                    ? foundColors[foundWordIdx % foundColors.length]
                    : 'var(--bg-card)',
                  color: sel || fnd ? 'white' : 'var(--text-primary)',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {cell.letter}
              </motion.div>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}

// ── 3. LetterMemory — Letter Memory ─────────────────────────

interface MemoryCard {
  id: number
  combo: string
  emoji: string
  word: string
  blanked: string
  pairId: number
  type: 'combo' | 'word'
}

function LetterMemory({
  onBack,
  difficulty,
}: {
  onBack: () => void
  difficulty: number
}) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)
  const pairCount = difficulty === 1 ? 6 : difficulty === 2 ? 8 : 10
  const cols = pairCount <= 6 ? 3 : 4
  const rows = pairCount <= 6 ? 4 : difficulty === 2 ? 4 : 5

  const cards = useMemo(() => {
    const combos = pick(LETTER_COMBOS, pairCount)
    const pairs: MemoryCard[] = []
    combos.forEach((c, i) => {
      pairs.push({ id: i * 2, combo: c.combo, emoji: c.emoji, word: c.word, blanked: c.blanked, pairId: i, type: 'combo' })
      pairs.push({ id: i * 2 + 1, combo: c.combo, emoji: c.emoji, word: c.word, blanked: c.blanked, pairId: i, type: 'word' })
    })
    return shuffle(pairs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairCount, gameKey])

  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [attempts, setAttempts] = useState(0)
  const [done, setDone] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)
  const lockRef = useRef(false)

  const handleCardTap = useCallback(
    (cardId: number) => {
      if (lockRef.current) return
      if (flipped.includes(cardId) || matched.includes(cardId)) return

      soundFlip()
      const newFlipped = [...flipped, cardId]
      setFlipped(newFlipped)

      if (newFlipped.length === 2) {
        lockRef.current = true
        setAttempts((a) => a + 1)
        const [first, second] = newFlipped
        const card1 = cards.find((c) => c.id === first)!
        const card2 = cards.find((c) => c.id === second)!

        if (card1.pairId === card2.pairId) {
          // Match!
          soundMatch()
          if (navigator.vibrate) navigator.vibrate(30)
          setTimeout(() => {
            const newMatched = [...matched, first, second]
            setMatched(newMatched)
            setFlipped([])
            lockRef.current = false
            if (newMatched.length === cards.length) {
              feedbackWin()
              finishGame(newMatched.length / 2)
            }
          }, 500)
        } else {
          setTimeout(() => {
            setFlipped([])
            lockRef.current = false
          }, 800)
        }
      }
    },
    [flipped, matched, cards],
  )

  const handleSkipLetterMemory = () => {
    // Reveal all remaining unmatched cards briefly, then finish
    const allIds = cards.map((c) => c.id)
    setFlipped(allIds)
    setTimeout(() => {
      setMatched(allIds)
      finishGame(matched.length / 2)
    }, 1500)
  }

  const finishGame = async (totalPairs: number) => {
    // Minder pogingen = meer tokens
    const efficiency = totalPairs / Math.max(attempts + 1, totalPairs)
    const tokens = Math.max(1, Math.round(efficiency * 4))
    setTokensEarned(tokens)
    if (user?.id) await awardTokens(user.id, tokens, `Letter Memory: ${totalPairs} paren in ${attempts + 1} beurten`)
    setDone(true)
  }

  if (done) {
    return (
      <GameResult
        score={pairCount}
        maxScore={pairCount}
        label={`Alle ${pairCount} paren gevonden in ${attempts} beurten`}
        onReplay={() => {
          setFlipped([])
          setMatched([])
          setAttempts(0)
          setDone(false)
          setTokensEarned(0)
          setGameKey((k) => k + 1)
        }}
        onBack={onBack}
        tokensEarned={tokensEarned}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <GameHeader title="Letter Memory" onBack={onBack} onSkip={handleSkipLetterMemory} />
      <div className="flex-1 overflow-auto px-4 pb-24">
      <p className="text-center font-body text-ink-muted text-sm mb-3">
        Zoek de paren: lettercombinatie + woord met ontbrekende letters
      </p>

      <div
        className="flex items-center justify-center pb-8"
      >
        <div
          className="gap-2"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            width: '100%',
            maxWidth: cols * 90,
          }}
        >
          {cards.map((card) => {
            const isFlipped = flipped.includes(card.id) || matched.includes(card.id)
            const isMatched = matched.includes(card.id)
            return (
              <motion.button
                key={card.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleCardTap(card.id)}
                className="font-display font-bold flex flex-col items-center justify-center"
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 14,
                  fontSize: 'clamp(14px, 4vw, 22px)',
                  background: isMatched
                    ? 'var(--accent-success)'
                    : isFlipped
                    ? 'var(--bg-card)'
                    : 'var(--accent-calm)',
                  color: isMatched
                    ? 'white'
                    : isFlipped
                    ? 'var(--text-primary)'
                    : 'white',
                  border: `2px solid ${isFlipped ? 'var(--accent-calm)' : 'transparent'}`,
                  transition: 'background 0.3s, transform 0.3s',
                  minHeight: 64,
                }}
                animate={{
                  rotateY: isFlipped ? 0 : 180,
                }}
                transition={{ duration: 0.3 }}
              >
                {isFlipped ? (
                  <>
                    {card.type === 'combo' ? (
                      <span style={{ fontSize: 'clamp(18px, 5vw, 28px)' }}>{card.combo}</span>
                    ) : (
                      <>
                        <span className="text-2xl mb-0.5">{card.emoji}</span>
                        <span style={{ fontSize: 'clamp(11px, 3vw, 15px)', letterSpacing: '0.05em' }}>{card.blanked}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 'clamp(20px, 5vw, 28px)' }}>?</span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}

// ── 4. SentenceBuilder — Zinnen bouwen ───────────────────────

function SentenceBuilder({
  onBack,
  difficulty,
}: {
  onBack: () => void
  difficulty: number
}) {
  const { user } = useAuthStore()
  const TOTAL_ROUNDS = 8
  const [gameKey, setGameKey] = useState(0)
  const allSentences = useMemo(() => pick(getSentences(difficulty), TOTAL_ROUNDS), [difficulty, gameKey])

  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [placed, setPlaced] = useState<string[]>([])
  const [available, setAvailable] = useState<{ word: string; id: number }[]>([])
  const [correct, setCorrect] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [done, setDone] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)
  const [showSkipAnswer, setShowSkipAnswer] = useState(false)

  const currentSentence = allSentences[round] || ''
  const targetWords = currentSentence.split(' ')

  useEffect(() => {
    if (round >= TOTAL_ROUNDS) return
    const words = allSentences[round].split(' ')
    setPlaced([])
    setAvailable(shuffle(words.map((w, i) => ({ word: w, id: i }))))
    setCorrect(false)
  }, [round, allSentences])

  const handleWordTap = useCallback(
    (item: { word: string; id: number }) => {
      if (correct) return
      soundPickup()
      const newPlaced = [...placed, item.word]
      setPlaced(newPlaced)
      soundDrop()
      setAvailable((prev) => prev.filter((a) => a.id !== item.id))

      // Check positie-voor-positie highlighting wordt visueel gedaan
      if (newPlaced.length === targetWords.length) {
        const isCorrect = newPlaced.join(' ') === currentSentence
        if (isCorrect) {
          feedbackCorrect()
          setCorrect(true)
          setShowSuccess(true)
          setScore((s) => s + 1)
          if (navigator.vibrate) navigator.vibrate(30)
          setTimeout(() => {
            setShowSuccess(false)
            if (round + 1 >= TOTAL_ROUNDS) {
              finishGame(score + 1)
            } else {
              setRound((r) => r + 1)
            }
          }, 1000)
        } else {
          // Fout — reset na korte pauze
          setTimeout(() => {
            const words = currentSentence.split(' ')
            setPlaced([])
            setAvailable(shuffle(words.map((w, i) => ({ word: w, id: i + 1000 * (round + 1) }))))
          }, 800)
        }
      }
    },
    [placed, correct, targetWords, currentSentence, round, score],
  )

  const handlePlacedTap = useCallback(
    (idx: number) => {
      if (correct) return
      const word = placed[idx]
      const newPlaced = placed.filter((_, i) => i !== idx)
      setPlaced(newPlaced)
      setAvailable((prev) => [...prev, { word, id: Date.now() + idx }])
    },
    [placed, correct],
  )

  const handleSkipSentenceBuilder = () => {
    if (correct || showSkipAnswer) return
    setShowSkipAnswer(true)
    setPlaced(targetWords)
    setAvailable([])
    setTimeout(() => {
      setShowSkipAnswer(false)
      if (round + 1 >= TOTAL_ROUNDS) {
        finishGame(score)
      } else {
        setRound((r) => r + 1)
      }
    }, 1500)
  }

  const finishGame = async (finalScore: number) => {
    const tokens = Math.max(1, Math.round((finalScore / TOTAL_ROUNDS) * 3))
    setTokensEarned(tokens)
    if (user?.id) await awardTokens(user.id, tokens, `Zinnen bouwen: ${finalScore}/${TOTAL_ROUNDS}`)
    setDone(true)
  }

  if (done) {
    return (
      <GameResult
        score={score}
        maxScore={TOTAL_ROUNDS}
        onReplay={() => {
          setRound(0)
          setScore(0)
          setDone(false)
          setTokensEarned(0)
          setGameKey((k) => k + 1)
        }}
        onBack={onBack}
        tokensEarned={tokensEarned}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <GameHeader title="Zinnen bouwen" round={round + 1} totalRounds={TOTAL_ROUNDS} score={score} onBack={onBack} onSkip={handleSkipSentenceBuilder} />
      <AnimatePresence>{showSuccess && <SuccessOverlay />}</AnimatePresence>

      <div className="flex-1 overflow-auto flex flex-col px-5 pb-24 gap-5 pt-4">
        {/* Geplaatste woorden (de zin die gebouwd wordt) */}
        <div
          className="min-h-[80px] rounded-2xl p-4 flex flex-wrap gap-2 items-start"
          style={{
            background: 'var(--bg-card)',
            border: `2px solid ${correct ? 'var(--accent-success)' : 'var(--border-color)'}`,
          }}
        >
          {placed.length === 0 && (
            <span className="font-body text-ink-muted text-base">Tik op de woorden hieronder...</span>
          )}
          <AnimatePresence>
            {placed.map((word, i) => {
              const isCorrectPos = word === targetWords[i]
              return (
                <motion.button
                  key={`placed-${i}-${word}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePlacedTap(i)}
                  className="font-body font-semibold px-3 py-2 rounded-xl text-base"
                  style={{
                    background: correct
                      ? 'var(--accent-success)'
                      : isCorrectPos
                      ? 'rgba(91,140,90,0.15)'
                      : 'var(--bg-surface)',
                    color: correct ? 'white' : 'var(--text-primary)',
                    border: `1.5px solid ${correct ? 'var(--accent-success)' : isCorrectPos ? 'var(--accent-success)' : 'var(--border-color)'}`,
                    minHeight: 42,
                  }}
                >
                  {word}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Beschikbare woorden — draggable + tappable */}
        <div className="flex flex-wrap gap-2 justify-center">
          <AnimatePresence>
            {available.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                drag
                dragSnapToOrigin
                dragElastic={0.5}
                onDragEnd={(_e, info) => {
                  if (Math.abs(info.offset.y) > 40 || Math.abs(info.offset.x) > 40) {
                    handleWordTap(item)
                  }
                }}
                onTap={() => handleWordTap(item)}
                whileTap={{ scale: 0.9 }}
                whileDrag={{ scale: 1.1, zIndex: 50 }}
                className="font-display font-bold px-4 py-3 text-lg cursor-grab active:cursor-grabbing touch-none"
                style={{
                  borderRadius: '999px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  minHeight: 48,
                }}
              >
                {item.word}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── 5. SpellingBee — Spellingbij ─────────────────────────────

function SpellingBee({
  onBack,
  difficulty,
}: {
  onBack: () => void
  difficulty: number
}) {
  const { user } = useAuthStore()
  const TOTAL_ROUNDS = 10
  const [gameKey, setGameKey] = useState(0)
  const wordList = useMemo(() => {
    const filtered = SPELLING_WORDS.filter((w) => {
      if (difficulty === 1) return w.word.length <= 4
      if (difficulty === 2) return w.word.length >= 4 && w.word.length <= 6
      return w.word.length >= 5
    })
    return pick(filtered.length >= TOTAL_ROUNDS ? filtered : SPELLING_WORDS, TOTAL_ROUNDS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [input, setInput] = useState<string[]>([])
  const [shake, setShake] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [done, setDone] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)
  const [showSkipAnswer, setShowSkipAnswer] = useState(false)

  const current = wordList[round]
  const target = current?.word || ''

  // TTS hint
  useEffect(() => {
    if (!current) return
    const timer = setTimeout(() => {
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(current.word)
        const voices = speechSynthesis.getVoices()
        const nlVoice = voices.find(v => v.lang === 'nl-BE') ?? voices.find(v => v.lang.startsWith('nl'))
        if (nlVoice) utter.voice = nlVoice
        utter.lang = nlVoice?.lang ?? 'nl-BE'
        utter.rate = 0.8
        speechSynthesis.speak(utter)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [round, current])

  const handleKeyTap = useCallback(
    (letter: string) => {
      if (correct) return
      soundTap()
      const nextIdx = input.length
      if (nextIdx >= target.length) return
      if (letter.toLowerCase() === target[nextIdx]) {
        const newInput = [...input, letter.toLowerCase()]
        setInput(newInput)
        if (navigator.vibrate) navigator.vibrate(15)
        // Woord compleet?
        if (newInput.length === target.length) {
          feedbackCorrect()
          setCorrect(true)
          setShowSuccess(true)
          setScore((s) => s + 1)
          setTimeout(() => {
            setShowSuccess(false)
            if (round + 1 >= TOTAL_ROUNDS) {
              finishGame(score + 1)
            } else {
              setRound((r) => r + 1)
              setInput([])
              setCorrect(false)
            }
          }, 1000)
        }
      } else {
        // Fout — shake
        feedbackWrong()
        setShake(true)
        if (navigator.vibrate) navigator.vibrate([50, 30, 50])
        setTimeout(() => setShake(false), 500)
      }
    },
    [input, target, correct, round, score],
  )

  const handleBackspace = useCallback(() => {
    if (correct || input.length === 0) return
    setInput((prev) => prev.slice(0, -1))
  }, [correct, input])

  const speakWord = () => {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(target)
      const voices = speechSynthesis.getVoices()
      const nlVoice = voices.find(v => v.lang === 'nl-BE') ?? voices.find(v => v.lang.startsWith('nl'))
      if (nlVoice) utter.voice = nlVoice
      utter.lang = nlVoice?.lang ?? 'nl-BE'
      utter.rate = 0.8
      speechSynthesis.speak(utter)
    }
  }

  const handleSkipSpellingBee = () => {
    if (correct || showSkipAnswer) return
    setShowSkipAnswer(true)
    setInput(target.split(''))
    setTimeout(() => {
      setShowSkipAnswer(false)
      if (round + 1 >= TOTAL_ROUNDS) {
        finishGame(score)
      } else {
        setRound((r) => r + 1)
        setInput([])
        setCorrect(false)
      }
    }, 1500)
  }

  const finishGame = async (finalScore: number) => {
    const tokens = Math.max(1, Math.round((finalScore / TOTAL_ROUNDS) * 3))
    setTokensEarned(tokens)
    if (user?.id) await awardTokens(user.id, tokens, `Spellingbij: ${finalScore}/${TOTAL_ROUNDS}`)
    setDone(true)
  }

  // AZERTY (Belgisch) toetsenbord
  const KEYBOARD_ROWS = [
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    ['w', 'x', 'c', 'v', 'b', 'n'],
  ]

  if (done) {
    return (
      <GameResult
        score={score}
        maxScore={TOTAL_ROUNDS}
        onReplay={() => {
          setRound(0)
          setScore(0)
          setInput([])
          setDone(false)
          setTokensEarned(0)
          setCorrect(false)
          setGameKey((k) => k + 1)
        }}
        onBack={onBack}
        tokensEarned={tokensEarned}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <GameHeader title="Spellingbij" round={round + 1} totalRounds={TOTAL_ROUNDS} score={score} onBack={onBack} onSkip={handleSkipSpellingBee} />
      <AnimatePresence>{showSuccess && <SuccessOverlay />}</AnimatePresence>

      <div className="flex-1 overflow-auto flex flex-col items-center justify-center px-4 pt-2 gap-3" style={{ paddingBottom: 180 }}>
        {/* Emoji + audio */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            className="text-7xl"
            animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {current?.emoji}
          </motion.div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={speakWord}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-body font-semibold text-sm"
            style={{ background: 'var(--accent-calm)', color: 'white' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            Luister
          </motion.button>
        </div>

        {/* Lettervakjes */}
        <motion.div
          className="flex gap-2 justify-center"
          animate={shake ? { x: [-5, 5, -4, 4, -2, 2, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {target.split('').map((letter, i) => {
            const filled = i < input.length
            const isLocked = filled
            return (
              <div
                key={i}
                className="font-display font-bold flex items-center justify-center"
                style={{
                  width: 'clamp(36px, 10vw, 50px)',
                  height: 'clamp(44px, 12vw, 58px)',
                  fontSize: 'clamp(18px, 5vw, 28px)',
                  borderRadius: 12,
                  background: isLocked ? 'var(--accent-success)' : 'var(--bg-card)',
                  color: isLocked ? 'white' : 'var(--text-muted)',
                  border: `2px solid ${isLocked ? 'var(--accent-success)' : 'var(--border-color)'}`,
                  textTransform: 'lowercase',
                  transition: 'all 0.2s',
                }}
              >
                {filled ? input[i] : ''}
              </div>
            )
          })}
        </motion.div>

        {/* Toetsenbord — fixed onderaan, boven de nav */}
        <div className="fixed bottom-0 left-0 right-0 z-[61] w-full max-w-md mx-auto flex flex-col gap-1 px-2 pb-3 pt-1" style={{ background: 'var(--bg-primary)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1">
              {ri === 1 && <div style={{ width: 10 }} />}
              {ri === 2 && <div style={{ width: 30 }} />}
              {row.map((letter) => (
                <motion.button
                  key={letter}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleKeyTap(letter)}
                  className="font-display font-bold flex items-center justify-center"
                  style={{
                    flex: '1 1 0',
                    maxWidth: 40,
                    height: 48,
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1.5px solid var(--border-color)',
                    fontSize: 17,
                    textTransform: 'lowercase',
                  }}
                >
                  {letter}
                </motion.button>
              ))}
              {ri === 2 && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleBackspace}
                  className="flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: 'var(--bg-surface)',
                    border: '1.5px solid var(--border-color)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                </motion.button>
              )}
            </div>
          ))}
        </div>
      </div> {/* einde keyboard fixed */}
    </div>
  )
}

// ── 6. CategorySort — Woorden sorteren ───────────────────────

function CategorySort({
  onBack,
  difficulty,
}: {
  onBack: () => void
  difficulty: number
}) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)

  const catSet = useMemo(() => {
    // Kies een set met het juiste aantal categorieen
    const validSets = CATEGORY_SETS.filter((s) =>
      difficulty <= 2 ? s.categories.length === 2 : s.categories.length >= 2,
    )
    return validSets[Math.floor(Math.random() * validSets.length)] || CATEGORY_SETS[0]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameKey])

  const wordsPerCat = difficulty === 1 ? 4 : difficulty === 2 ? 5 : 5
  const categories = useMemo(
    () => catSet.categories.map((c) => ({ ...c, words: pick(c.words, wordsPerCat) })),
    [catSet, wordsPerCat],
  )

  const allWords = useMemo(() => {
    const words: { word: string; category: string; id: number }[] = []
    categories.forEach((cat) => {
      cat.words.forEach((w, i) => {
        words.push({ word: w, category: cat.name, id: words.length })
      })
    })
    return shuffle(words)
  }, [categories])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [sorted, setSorted] = useState<Record<string, string[]>>({})
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showSkipAnswer, setShowSkipAnswer] = useState(false)

  const currentWord = allWords[currentIdx]
  const total = allWords.length

  const handleDrop = useCallback(
    (categoryName: string) => {
      if (!currentWord || feedback) return
      soundPickup()

      if (currentWord.category === categoryName) {
        feedbackCorrect()
        setScore((s) => s + 1)
        setSorted((prev) => ({
          ...prev,
          [categoryName]: [...(prev[categoryName] || []), currentWord.word],
        }))
        setFeedback('correct')
        setShowSuccess(true)
        if (navigator.vibrate) navigator.vibrate(30)
        setTimeout(() => {
          setFeedback(null)
          setShowSuccess(false)
          if (currentIdx + 1 >= total) {
            finishGame(score + 1)
          } else {
            setCurrentIdx((i) => i + 1)
          }
        }, 700)
      } else {
        feedbackWrong()
        setFeedback('wrong')
        if (navigator.vibrate) navigator.vibrate([50, 30, 50])
        setTimeout(() => setFeedback(null), 800)
      }
    },
    [currentWord, feedback, currentIdx, total, score],
  )

  const handleSkipCategorySort = () => {
    if (feedback || showSkipAnswer || !currentWord) return
    setShowSkipAnswer(true)
    // Show correct category briefly
    setSorted((prev) => ({
      ...prev,
      [currentWord.category]: [...(prev[currentWord.category] || []), currentWord.word],
    }))
    setTimeout(() => {
      setShowSkipAnswer(false)
      if (currentIdx + 1 >= total) {
        finishGame(score)
      } else {
        setCurrentIdx((i) => i + 1)
      }
    }, 1500)
  }

  const finishGame = async (finalScore: number) => {
    const tokens = Math.max(1, Math.round((finalScore / total) * 3))
    setTokensEarned(tokens)
    if (user?.id) await awardTokens(user.id, tokens, `Woorden sorteren: ${finalScore}/${total}`)
    setDone(true)
  }

  if (done) {
    return (
      <GameResult
        score={score}
        maxScore={total}
        onReplay={() => {
          setCurrentIdx(0)
          setScore(0)
          setSorted({})
          setDone(false)
          setTokensEarned(0)
          setGameKey((k) => k + 1)
        }}
        onBack={onBack}
        tokensEarned={tokensEarned}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <GameHeader
        title="Woorden sorteren"
        round={currentIdx + 1}
        totalRounds={total}
        score={score}
        onBack={onBack}
        onSkip={handleSkipCategorySort}
      />
      <AnimatePresence>{showSuccess && <SuccessOverlay />}</AnimatePresence>

      <div className="flex-1 overflow-auto flex flex-col px-4 pb-24 gap-5 pt-3">
        {/* Categorieen als knoppen */}
        <div className={`grid gap-3 ${categories.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {categories.map((cat) => {
            const count = (sorted[cat.name] || []).length
            return (
              <motion.button
                key={cat.name}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDrop(cat.name)}
                className="flex flex-col items-center gap-1 py-4 px-2 rounded-2xl relative"
                style={{
                  background: feedback === 'correct' && currentWord?.category === cat.name
                    ? 'var(--accent-success)'
                    : feedback === 'wrong' && currentWord?.category !== cat.name
                    ? 'var(--bg-card)'
                    : 'var(--bg-card)',
                  border: `2px solid ${
                    feedback === 'correct' && currentWord?.category === cat.name
                      ? 'var(--accent-success)'
                      : 'var(--border-color)'
                  }`,
                  color: feedback === 'correct' && currentWord?.category === cat.name ? 'white' : 'var(--text-primary)',
                  minHeight: 80,
                  transition: 'all 0.2s',
                }}
              >
                <span className="font-display font-bold text-base">{cat.name}</span>
                <span className="font-body text-xs opacity-70">{count} / {wordsPerCat}</span>
                {/* Gestapelde woorden */}
                {(sorted[cat.name] || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 justify-center">
                    {(sorted[cat.name] || []).slice(-3).map((w, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded-full" style={{
                        background: 'rgba(255,255,255,0.3)',
                        fontSize: 10,
                      }}>
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Huidig woord */}
        {currentWord && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              key={currentWord.id}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{
                opacity: feedback === 'correct' ? 0 : 1,
                y: feedback === 'wrong' ? [0, -5, 5, -3, 3, 0] : 0,
                scale: feedback === 'correct' ? 0.5 : 1,
              }}
              transition={feedback === 'wrong' ? { duration: 0.4 } : { type: 'spring', stiffness: 300, damping: 25 }}
              className="font-display font-bold text-center"
              style={{
                fontSize: 'clamp(28px, 8vw, 44px)',
                color: 'var(--text-primary)',
                padding: '24px 40px',
                borderRadius: 24,
                background: 'var(--bg-card)',
                border: `3px solid ${feedback === 'wrong' ? 'var(--accent-calm)' : 'var(--accent-primary)'}`,
                boxShadow: feedback === 'wrong' ? 'none' : undefined,
              }}
            >
              {currentWord.word}
            </motion.div>
          </div>
        )}

        {/* Hint bij fout */}
        <AnimatePresence>
          {feedback === 'wrong' && currentWord && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center font-body text-sm rounded-2xl px-4 py-2"
              style={{ background: 'rgba(168,197,214,0.2)', color: 'var(--text-primary)' }}
            >
              💡 Probeer nog eens! Denk goed na bij welke groep dit woord hoort.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── 7. WordCircle — Woordcirkel ─────────────────────────────

// Voorgedefinieerde lettersets met geldige Nederlandse woorden
const WORD_CIRCLE_SETS: { letters: string[]; words: string[] }[] = [
  // ── Makkelijk (5 letters, 3-4 woorden van 3-4 letters) ──
  { letters: ['K', 'A', 'T', 'S', 'E'], words: ['KAT', 'TAS', 'SAT', 'SET'] },
  { letters: ['B', 'O', 'S', 'T', 'E'], words: ['BOS', 'BOT', 'BET', 'SOB'] },
  { letters: ['H', 'A', 'N', 'D', 'E'], words: ['HAN', 'DEN', 'HEN', 'HAND'] },
  { letters: ['R', 'A', 'M', 'P', 'E'], words: ['RAM', 'MAP', 'RAMP', 'ARM'] },
  { letters: ['L', 'A', 'M', 'P', 'E'], words: ['LAM', 'PAL', 'AMP', 'LAMP'] },
  { letters: ['P', 'O', 'T', 'E', 'N'], words: ['POT', 'PEN', 'TEN', 'NET'] },
  { letters: ['B', 'E', 'D', 'R', 'A'], words: ['BED', 'BAD', 'BAR', 'RED'] },
  { letters: ['V', 'I', 'S', 'T', 'E'], words: ['VIS', 'SET', 'VET', 'VEST'] },
  { letters: ['K', 'O', 'E', 'L', 'S'], words: ['KOEL', 'SOL', 'OEL', 'SOEL'] },
  { letters: ['R', 'O', 'E', 'K', 'S'], words: ['ROEK', 'ROK', 'OER', 'KOER'] },
  { letters: ['D', 'A', 'K', 'E', 'N'], words: ['DAK', 'DEN', 'KAN', 'DAKEN'] },
  { letters: ['Z', 'E', 'E', 'R', 'S'], words: ['ZEE', 'ZEER', 'REE', 'REES'] },
  { letters: ['M', 'O', 'E', 'S', 'T'], words: ['MOET', 'MOST', 'STEM', 'TOES'] },
  { letters: ['B', 'A', 'L', 'K', 'E'], words: ['BAL', 'BAK', 'LAK', 'BALK'] },
  { letters: ['M', 'A', 'N', 'D', 'E'], words: ['MAN', 'MAND', 'DEN', 'MADE'] },
  // ── Gemiddeld (6 letters, 4-5 woorden) ──
  { letters: ['K', 'A', 'S', 'T', 'E', 'R'], words: ['KAT', 'TAS', 'STER', 'REST', 'RAST'] },
  { letters: ['B', 'L', 'O', 'E', 'M', 'S'], words: ['BLOEM', 'BOEL', 'BLOM', 'MOES', 'LOEB'] },
  { letters: ['S', 'T', 'O', 'E', 'L', 'P'], words: ['STOEL', 'STEP', 'POEL', 'SLOT', 'STEL'] },
  { letters: ['W', 'A', 'T', 'E', 'R', 'S'], words: ['WATER', 'WRAT', 'STER', 'REST', 'WAST'] },
  { letters: ['P', 'L', 'A', 'N', 'T', 'E'], words: ['PLANT', 'PLAT', 'PANT', 'PLAN', 'PLATEN'] },
  { letters: ['K', 'R', 'A', 'N', 'T', 'E'], words: ['KRANT', 'RANK', 'TANK', 'RENT', 'TREKN'] },
  { letters: ['B', 'R', 'O', 'E', 'K', 'S'], words: ['BROEK', 'BOER', 'BROK', 'KOER', 'ROBS'] },
  { letters: ['S', 'P', 'E', 'L', 'E', 'N'], words: ['SPEEL', 'PEEL', 'SPEL', 'LEEP', 'PENS'] },
  { letters: ['V', 'L', 'I', 'E', 'G', 'T'], words: ['VLIEG', 'GEIT', 'TGEL', 'VEIL', 'GILT'] },
  { letters: ['D', 'R', 'O', 'O', 'M', 'S'], words: ['DROOM', 'DORS', 'MOOR', 'DOOM', 'ROOD'] },
  // ── Moeilijk (7 letters, 5-6 woorden) ──
  { letters: ['S', 'C', 'H', 'O', 'O', 'L', 'T'], words: ['SCHOOL', 'STOOL', 'SCHOT', 'LOOT', 'SLOT', 'HOLS'] },
  { letters: ['V', 'R', 'I', 'E', 'N', 'D', 'S'], words: ['VRIEND', 'DRIES', 'RINS', 'DINS', 'VRIES', 'NERD'] },
  { letters: ['W', 'I', 'N', 'T', 'E', 'R', 'S'], words: ['WINTER', 'WRIST', 'TWINE', 'STERN', 'TRIEN', 'WENS'] },
  { letters: ['B', 'L', 'A', 'D', 'E', 'R', 'S'], words: ['BLADER', 'BLADE', 'SABEL', 'DALER', 'BLAAS', 'REEDS'] },
  { letters: ['K', 'L', 'E', 'U', 'R', 'E', 'N'], words: ['KLEUR', 'KNEEL', 'LUREN', 'REKEL', 'KNUL', 'LEUK'] },
]

function getWordCircleSets(difficulty: number): { letters: string[]; words: string[] }[] {
  if (difficulty === 1) return WORD_CIRCLE_SETS.slice(0, 15)
  if (difficulty === 2) return WORD_CIRCLE_SETS.slice(15, 25)
  return WORD_CIRCLE_SETS.slice(25)
}

function WordCircle({
  onBack,
  difficulty,
}: {
  onBack: () => void
  difficulty: number
}) {
  const { user } = useAuthStore()
  const [gameKey, setGameKey] = useState(0)

  const puzzleSets = useMemo(() => getWordCircleSets(difficulty), [difficulty])
  const puzzle = useMemo(() => {
    const set = puzzleSets[Math.floor(Math.random() * puzzleSets.length)]
    return { letters: shuffle(set.letters), words: set.words.map((w) => w.toUpperCase()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleSets, gameKey])

  const [foundWords, setFoundWords] = useState<string[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [done, setDone] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const letterRefs = useRef<(SVGCircleElement | null)[]>([])

  const cx = 150
  const cy = 150
  const radius = 105
  const letterRadius = 30

  const totalWords = puzzle.words.length
  const currentWord = selectedIndices.map((i) => puzzle.letters[i]).join('')

  // Bereken posities van letters in een cirkel
  const letterPositions = useMemo(() => {
    return puzzle.letters.map((_, i) => {
      const angle = (2 * Math.PI * i) / puzzle.letters.length - Math.PI / 2
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      }
    })
  }, [puzzle.letters.length])

  // Vind de dichtste letter bij een punt
  const findLetterAtPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      if (!svgRef.current) return null
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = 300 / rect.width
      const scaleY = 300 / rect.height
      const svgX = (clientX - rect.left) * scaleX
      const svgY = (clientY - rect.top) * scaleY

      for (let i = 0; i < letterPositions.length; i++) {
        const dx = svgX - letterPositions[i].x
        const dy = svgY - letterPositions[i].y
        if (Math.sqrt(dx * dx + dy * dy) < letterRadius + 8) {
          return i
        }
      }
      return null
    },
    [letterPositions],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (done || feedback) return
      const idx = findLetterAtPoint(e.clientX, e.clientY)
      if (idx !== null) {
        soundTap()
        setIsDragging(true)
        setSelectedIndices([idx])
        ;(e.target as Element)?.setPointerCapture?.(e.pointerId)
      }
    },
    [done, feedback, findLetterAtPoint],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || done || feedback) return
      const idx = findLetterAtPoint(e.clientX, e.clientY)
      if (idx !== null && !selectedIndices.includes(idx)) {
        soundTap()
        setSelectedIndices((prev) => [...prev, idx])
      }
    },
    [isDragging, done, feedback, findLetterAtPoint, selectedIndices],
  )

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    const word = selectedIndices.map((i) => puzzle.letters[i]).join('')
    if (word.length >= 3 && puzzle.words.includes(word) && !foundWords.includes(word)) {
      soundMatch()
      feedbackCorrect()
      setFeedback('correct')
      setShowSuccess(true)
      if (navigator.vibrate) navigator.vibrate(30)
      const newFound = [...foundWords, word]
      setFoundWords(newFound)

      setTimeout(() => {
        setFeedback(null)
        setSelectedIndices([])
        setShowSuccess(false)
        if (newFound.length >= totalWords) {
          finishGame(newFound.length)
        }
      }, 700)
    } else {
      if (word.length >= 2) {
        feedbackWrong()
        setFeedback('wrong')
        setTimeout(() => {
          setFeedback(null)
          setSelectedIndices([])
        }, 500)
      } else {
        setSelectedIndices([])
      }
    }
  }, [isDragging, selectedIndices, puzzle, foundWords, totalWords])

  const handleSkipWordCircle = () => {
    // Reveal all remaining words and finish
    setFoundWords([...puzzle.words])
    setTimeout(() => {
      finishGame(foundWords.length)
    }, 1500)
  }

  const finishGame = async (finalScore: number) => {
    const tokens = Math.max(1, Math.round((finalScore / totalWords) * 3))
    setTokensEarned(tokens)
    if (user?.id) await awardTokens(user.id, tokens, `Woordcirkel: ${finalScore}/${totalWords}`)
    setDone(true)
  }

  if (done) {
    return (
      <GameResult
        score={foundWords.length}
        maxScore={totalWords}
        onReplay={() => {
          setFoundWords([])
          setSelectedIndices([])
          setDone(false)
          setTokensEarned(0)
          setGameKey((k) => k + 1)
        }}
        onBack={onBack}
        tokensEarned={tokensEarned}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <GameHeader
        title="Woordcirkel"
        score={foundWords.length}
        onBack={onBack}
        onSkip={handleSkipWordCircle}
      />
      <AnimatePresence>{showSuccess && <SuccessOverlay />}</AnimatePresence>

      <div className="flex-1 overflow-auto flex flex-col items-center px-4 pb-24 gap-3 pt-2">
        {/* Huidig woord dat gevormd wordt */}
        <div
          className="w-full rounded-2xl py-3 text-center font-display font-bold"
          style={{
            fontSize: 'clamp(24px, 7vw, 36px)',
            background: 'var(--bg-card)',
            border: `2px solid ${
              feedback === 'correct'
                ? 'var(--accent-success)'
                : feedback === 'wrong'
                ? 'var(--hint-color)'
                : 'var(--border-color)'
            }`,
            color: feedback === 'correct' ? 'var(--accent-success)' : 'var(--text-primary)',
            minHeight: 56,
            transition: 'border-color 0.2s, color 0.2s',
          }}
        >
          {currentWord || '\u00A0'}
        </div>

        {/* SVG cirkel met letters */}
        <svg
          ref={svgRef}
          viewBox="0 0 300 300"
          className="w-full max-w-xs touch-none select-none"
          style={{ maxHeight: '40vh' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Verbindingslijnen */}
          {selectedIndices.length > 1 &&
            selectedIndices.slice(1).map((idx, i) => {
              const from = letterPositions[selectedIndices[i]]
              const to = letterPositions[idx]
              return (
                <line
                  key={`line-${i}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={feedback === 'correct' ? '#5B8C5A' : feedback === 'wrong' ? '#A8C5D6' : '#E8734A'}
                  strokeWidth={4}
                  strokeLinecap="round"
                  opacity={0.7}
                />
              )
            })}

          {/* Letter-cirkels */}
          {puzzle.letters.map((letter, i) => {
            const pos = letterPositions[i]
            const isSelected = selectedIndices.includes(i)
            return (
              <g key={`letter-${i}`}>
                <circle
                  ref={(el) => { letterRefs.current[i] = el }}
                  cx={pos.x}
                  cy={pos.y}
                  r={letterRadius}
                  fill={
                    isSelected
                      ? feedback === 'correct'
                        ? '#5B8C5A'
                        : feedback === 'wrong'
                        ? '#A8C5D6'
                        : '#E8734A'
                      : '#FFF9F0'
                  }
                  stroke={isSelected ? 'transparent' : '#E8E0D6'}
                  strokeWidth={2.5}
                />
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? 'white' : '#3D3229'}
                  fontSize={22}
                  fontWeight={700}
                  fontFamily="var(--font-display)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {letter}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Gevonden woorden */}
        <div className="w-full">
          <p className="font-body font-semibold text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Gevonden: {foundWords.length} / {totalWords}
          </p>
          <div className="flex flex-wrap gap-2">
            {puzzle.words.map((word, i) => {
              const found = foundWords.includes(word)
              return (
                <motion.span
                  key={word}
                  initial={found ? { scale: 0.5 } : {}}
                  animate={found ? { scale: 1 } : {}}
                  className="font-display font-bold px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: found ? 'var(--accent-success)' : 'var(--bg-surface)',
                    color: found ? 'white' : 'var(--text-muted)',
                    border: `1.5px solid ${found ? 'var(--accent-success)' : 'var(--border-color)'}`,
                    minHeight: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {found ? word : word.split('').map(() => '_').join(' ')}
                </motion.span>
              )
            })}
          </div>
        </div>

        {/* Hint */}
        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center font-body text-sm rounded-2xl px-4 py-2"
              style={{ background: 'rgba(168,197,214,0.2)', color: 'var(--text-primary)' }}
            >
              Dat is geen woord. Probeer een ander pad!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Spelletjes-overzicht ─────────────────────────────────────

interface GameDef {
  id: string
  emoji: string
  name: string
  description: string
  color: string
  component: React.ComponentType<{ onBack: () => void; difficulty: number }>
}

const GAMES: GameDef[] = [
  {
    id: 'word-scramble',
    emoji: '🔤',
    name: 'Woordpuzzel',
    description: 'Zet de letters in de juiste volgorde',
    color: 'var(--accent-primary)',
    component: WordScramble,
  },
  {
    id: 'word-search',
    emoji: '🔍',
    name: 'Woordzoeker',
    description: 'Vind de verborgen woorden in het raster',
    color: 'var(--accent-calm)',
    component: WordSearch,
  },
  {
    id: 'letter-memory',
    emoji: '🧠',
    name: 'Letter Memory',
    description: 'Zoek de letterparen bij elkaar',
    color: '#9B7CC8',
    component: LetterMemory,
  },
  {
    id: 'sentence-builder',
    emoji: '📝',
    name: 'Zinnen bouwen',
    description: 'Maak een zin van de losse woorden',
    color: 'var(--accent-success)',
    component: SentenceBuilder,
  },
  {
    id: 'spelling-bee',
    emoji: '🐝',
    name: 'Spellingbij',
    description: 'Spel het woord bij de afbeelding',
    color: 'var(--accent-token)',
    component: SpellingBee,
  },
  {
    id: 'category-sort',
    emoji: '📦',
    name: 'Woorden sorteren',
    description: 'Sleep elk woord naar de juiste groep',
    color: '#E8734A',
    component: CategorySort,
  },
  {
    id: 'word-circle',
    emoji: '🔵',
    name: 'Woordcirkel',
    description: 'Verbind letters in de cirkel tot woorden',
    color: '#7BAFA3',
    component: WordCircle,
  },
]

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Makkelijk' },
  { value: 2, label: 'Gemiddeld' },
  { value: 3, label: 'Moeilijk' },
]

export function LanguageGamesPage() {
  const [selectedGame, setSelectedGame] = useState<GameDef | null>(null)
  const [difficulty, setDifficulty] = useState(1)

  if (selectedGame) {
    const GameComponent = selectedGame.component
    return <GameComponent onBack={() => setSelectedGame(null)} difficulty={difficulty} />
  }

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-24" style={{ background: 'var(--bg-primary)', minHeight: '100dvh' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1
          className="font-display font-bold text-ink mb-1"
          style={{ fontSize: 'var(--font-size-heading)' }}
        >
          Taalspelletjes 📖
        </h1>
        <p className="font-body text-ink-muted text-base">
          Kies een spelletje en oefen je taal!
        </p>
      </motion.div>

      {/* Moeilijkheidsgraad */}
      <div className="mb-6">
        <p className="font-body font-semibold text-ink text-sm mb-2">Niveau</p>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDifficulty(opt.value)}
              className="flex-1 py-3 font-display font-bold text-base"
              style={{
                borderRadius: '999px',
                background: difficulty === opt.value ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: difficulty === opt.value ? 'white' : 'var(--text-muted)',
                border: `2px solid ${difficulty === opt.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              }}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Spelletjes-grid */}
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game, i) => (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedGame(game)}
            className="flex flex-col items-center text-center p-5 gap-2"
            style={{
              borderRadius: 20,
              background: 'var(--bg-card)',
              border: '2px solid var(--border-color)',
              minHeight: 140,
            }}
          >
            <span className="text-4xl">{game.emoji}</span>
            <span
              className="font-display font-bold text-base"
              style={{ color: 'var(--text-primary)' }}
            >
              {game.name}
            </span>
            <span
              className="font-body text-xs leading-snug"
              style={{ color: 'var(--text-secondary)' }}
            >
              {game.description}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default LanguageGamesPage
