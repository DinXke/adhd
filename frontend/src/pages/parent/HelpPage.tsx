/**
 * Help / Handleiding — Toegankelijk voor alle volwassen rollen
 * FAQ, changelog en contactinformatie
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Hoe voeg ik een kind toe?',
    answer:
      'Ga naar "Kinderen" in het zijmenu. Klik op "Toevoegen" en vul de naam, geboortedatum en een 4-cijferige PIN in. Het kind kan daarna inloggen via het profielkeuze-scherm met deze PIN.',
  },
  {
    question: 'Hoe maak ik een dagschema?',
    answer:
      'Ga naar "Schema\'s" en klik op een dag. Voeg activiteiten toe met een titel, icoon, starttijd en duur. Je kunt activiteiten slepen om de volgorde aan te passen. Kopieer een schema naar andere dagen via het kopieer-icoon.',
  },
  {
    question: 'Hoe werken tokens en beloningen?',
    answer:
      'Kinderen verdienen tokens door taken af te ronden, oefeningen te maken en emotie-check-ins in te vullen. Ga naar "Beloningen" om doelen in te stellen (bijv. 20 tokens = samen een spelletje). Het kind ziet een spaarbalk en kan beloningen inwisselen wanneer het doel bereikt is.',
  },
  {
    question: 'Hoe genereer ik oefeningen met AI?',
    answer:
      'Ga naar "Oef. review" en klik op "Genereer oefeningen". Kies een vak (bijv. wiskunde), thema (bijv. tafels van 3-5) en niveau. Claude Haiku genereert dan een batch oefeningen die je kunt reviewen voordat ze zichtbaar worden voor het kind. Hiervoor is een Claude API-sleutel nodig in de instellingen.',
  },
  {
    question: 'Hoe nodig ik een hulpverlener uit?',
    answer:
      'Ga naar "Hulpverleners" en klik op "Uitnodigen". Vul de naam en het e-mailadres in en kies welke modules de hulpverlener mag zien (communicatie, dossier, voortgang, oefeningen). De hulpverlener ontvangt een link om een account aan te maken. Je kunt de toegang op elk moment intrekken.',
  },
  {
    question: 'Hoe werkt de TRMNL e-paper koppeling?',
    answer:
      'Ga naar "Systeem" en scroll naar het TRMNL-gedeelte. Download de plugin-ZIP en upload deze naar je TRMNL-account via usetrmnl.com. Configureer de server-URL in de plugin-instellingen. Het e-paper scherm toont dan automatisch het dagschema en de token-voortgang.',
  },
  {
    question: 'Hoe stel ik vakantieperiodes in?',
    answer:
      'Ga naar "Afspraken" en maak een nieuw item aan van het type "Vakantie". Stel de begin- en einddatum in. Tijdens vakantieperiodes kan het dagschema automatisch aangepast worden, of je kunt aparte vakantieschema\'s aanmaken.',
  },
  {
    question: 'Hoe koppel ik Google Calendar?',
    answer:
      'Ga naar "Instellingen" en zoek de kalender-sectie. Klik op "Google Calendar koppelen" en log in met je Google-account. Afspraken van het kind (arts, logo, kine) worden automatisch gesynchroniseerd. Je kunt per kalender kiezen welke afspraken zichtbaar zijn.',
  },
  {
    question: 'Hoe werkt het communicatieportaal?',
    answer:
      'Ga naar "Communicatie" om berichten uit te wisselen met hulpverleners. Er zijn kanalen per thema (logopedie, school, kine, algemeen). Hulpverleners kunnen gestructureerde updates invullen met een template. Je ziet leesbevestigingen en ontvangt push-notificaties bij nieuwe berichten.',
  },
  {
    question: 'Hoe exporteer ik een PDF-rapport?',
    answer:
      'Ga naar "Voortgang" of het "Dossier" en klik op de export-knop (rechtsboven). Kies de periode en welke data je wilt opnemen (oefenresultaten, emotielogs, taakafronding). Het PDF-rapport wordt gegenereerd en kan gedeeld worden met school of therapeut.',
  },
]

interface ChangelogEntry {
  version: string
  description: string
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.0.0',
    description: 'Eerste release: dagschema, taken, tokens, oefeningen, emoties',
  },
  {
    version: 'v1.1.0',
    description: 'Communicatie, dossier, hulpverleners, vaardigheden, sociale scripts',
  },
  {
    version: 'v1.2.0',
    description: 'Push notificaties, PWA, AI tips, geld, recepten',
  },
  {
    version: 'v1.3.0',
    description: 'Afspraken, vakantie, TRMNL, TTS, wereldoriëntatie',
  },
]

function AccordionItem({ item, isOpen, onToggle }: {
  item: FaqItem
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface/50 transition-colors"
      >
        <span className="font-medium text-ink text-sm pr-4">{item.question}</span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 text-ink-muted"
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-sm text-ink-muted leading-relaxed border-t border-border pt-3">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggleFaq(index: number) {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(193,122,58,0.1)' }}
          >
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" stroke="#C17A3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="16" cy="16" r="12" />
              <path d="M12.5 12.5a3.5 3.5 0 0 1 6.36 2c0 2.33-3.5 3.5-3.5 3.5" />
              <circle cx="16" cy="22" r="0.5" fill="#C17A3A" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Help & Handleiding</h1>
            <p className="text-sm text-ink-muted">GRIP v1.0.0</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted mt-3 leading-relaxed">
          GRIP staat voor <strong>G</strong>roei, <strong>R</strong>outine, <strong>I</strong>nzicht, <strong>P</strong>lanning.
          Een app gebouwd voor kinderen met ADHD op basis van de Barkley-methode: externe structuur,
          directe beloning en visuele ondersteuning.
        </p>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-semibold text-ink text-lg mb-4">Veelgestelde vragen</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => toggleFaq(index)}
            />
          ))}
        </div>
      </div>

      {/* Changelog */}
      <div className="card p-5">
        <h2 className="font-semibold text-ink text-lg mb-4">Changelog</h2>
        <div className="space-y-4">
          {CHANGELOG.map((entry, i) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-4 items-start"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: i === 0 ? 'rgba(193,122,58,0.15)' : 'rgba(193,122,58,0.07)',
                    border: i === 0 ? '2px solid rgba(193,122,58,0.4)' : '1px solid rgba(193,122,58,0.15)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C17A3A" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                {i < CHANGELOG.length - 1 && (
                  <div className="w-px flex-1 min-h-[20px]" style={{ background: 'rgba(193,122,58,0.15)' }} />
                )}
              </div>
              <div className="pb-4">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-1.5"
                  style={{
                    background: i === 0 ? 'rgba(193,122,58,0.12)' : 'rgba(193,122,58,0.06)',
                    color: '#C17A3A',
                  }}
                >
                  {entry.version}
                </span>
                <p className="text-sm text-ink-muted leading-relaxed">{entry.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="card p-5">
        <h2 className="font-semibold text-ink text-lg mb-2">Contact & Support</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-4">
          GRIP is een prive-applicatie gebouwd voor de familie Scheepers. Meld problemen,
          suggesties of bugs via GitHub.
        </p>
        <a
          href="https://github.com/bjornscheepers/julieapp/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-ink hover:border-accent hover:text-accent transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Meld een probleem op GitHub
        </a>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-ink-muted pb-4">
        GRIP v1.0.0 — Gebouwd met zorg voor Julie
      </p>
    </div>
  )
}

export default HelpPage
