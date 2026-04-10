/**
 * Dossier — centraal kind-dossier met timeline, verslagen, IHP, medicatie, notities.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import {
  useMyChildren,
  useDossier,
  useCreateDossierEntry,
  useUpdateDossierEntry,
  useDeleteDossierEntry,
  DossierEntry,
} from '../../lib/queries'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

// ── Configuratie per categorie ────────────────────────────────
const CATEGORIES = [
  { key: 'all', label: 'Alles', icon: '📋', color: '#7BAFA3' },
  { key: 'report', label: 'Verslagen', icon: '📄', color: '#E8734A' },
  { key: 'plan', label: 'IHP / Plan', icon: '🎯', color: '#5B8C5A' },
  { key: 'medication', label: 'Medicatie', icon: '💊', color: '#A8C5D6' },
  { key: 'note', label: 'Notities', icon: '✏️', color: '#F2C94C' },
  { key: 'progress', label: 'Voortgang', icon: '📈', color: '#C17A3A' },
]

function getCatConfig(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[0]
}

// ── Nieuw item formulier ───────────────────────────────────────
function EntryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<DossierEntry>
  onSave: (data: { category: string; title: string; content: string }) => Promise<void>
  onCancel: () => void
}) {
  const [category, setCategory] = useState<string>(initial?.category ?? 'note')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return setError('Vul titel en inhoud in')
    setSaving(true)
    try {
      await onSave({ category, title: title.trim(), content: content.trim() })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Categorie */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-2">Categorie</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter(c => c.key !== 'all').map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                category === c.key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Titel */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Titel</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Bv. Logopedieverslag april 2026"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {/* Inhoud */}
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Inhoud</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Schrijf hier de inhoud van het verslag, plan of notitie..."
          rows={6}
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-ink focus:border-accent focus:outline-none resize-y"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-border text-ink-muted hover:bg-surface transition-colors font-medium">
          Annuleren
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  )
}

// ── Tijdlijn item ─────────────────────────────────────────────
function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: DossierEntry
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const cat = getCatConfig(entry.category)

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-4 w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-xs"
        style={{ background: cat.color }}
      >
        <span className="text-[10px]">{cat.icon}</span>
      </div>

      <motion.div
        layout
        className="bg-card rounded-2xl border border-border overflow-hidden mb-4"
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left px-4 py-3.5 flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: cat.color + '22', color: cat.color }}>
                {cat.label}
              </span>
              <span className="text-xs text-ink-muted">
                {format(new Date(entry.createdAt), 'd MMM yyyy', { locale: nl })}
              </span>
            </div>
            <h3 className="font-semibold text-ink truncate">{entry.title}</h3>
            <p className="text-xs text-ink-muted mt-0.5">door {entry.author.name}</p>
          </div>
          <svg
            width="16" height="16"
            className={`flex-shrink-0 text-ink-muted transition-transform mt-1 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Uitgevouwen inhoud */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border pt-3">
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{entry.content}</p>

                {entry.attachments.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {entry.attachments.map(att => (
                      <a key={att.id}
                        href={`/api/communication/files/${encodeURIComponent(att.storageKey)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-accent hover:underline"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {att.filename}
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button onClick={onEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-ink-muted hover:border-accent hover:text-accent transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Bewerken
                  </button>
                  {confirming ? (
                    <div className="flex gap-1 ml-auto">
                      <button onClick={onDelete} className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-medium">Verwijderen</button>
                      <button onClick={() => setConfirming(false)} className="px-3 py-1.5 rounded-xl border border-border text-xs">Nee</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirming(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-ink-muted hover:border-red-400 hover:text-red-500 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      Verwijderen
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────
export function DossierPage() {
  const { user } = useAuthStore()
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DossierEntry | null>(null)

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data, isLoading } = useDossier(childId, activeCategory === 'all' ? undefined : activeCategory)
  const createEntry = useCreateDossierEntry()
  const updateEntry = useUpdateDossierEntry()
  const deleteEntry = useDeleteDossierEntry()

  const entries = data?.entries ?? []

  async function handleCreate(formData: { category: string; title: string; content: string }) {
    await createEntry.mutateAsync({ childId: childId!, ...formData })
    setShowForm(false)
  }

  async function handleUpdate(formData: { category: string; title: string; content: string }) {
    if (!editingEntry) return
    await updateEntry.mutateAsync({ childId: childId!, id: editingEntry.id, ...formData })
    setEditingEntry(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dossier</h1>
          <p className="text-sm text-ink-muted mt-0.5">Verslagen, plannen en notities</p>
        </div>
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <select
              value={childId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
            >
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            onClick={() => { setShowForm(true); setEditingEntry(null) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:opacity-90 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Toevoegen
          </button>
        </div>
      </div>

      {/* Categorie filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium flex-shrink-0 border transition-all ${
              activeCategory === c.key
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:border-accent/50'
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Nieuw item formulier */}
      <AnimatePresence>
        {(showForm && !editingEntry) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-card border border-accent/30 rounded-2xl p-6">
              <h2 className="font-semibold text-ink text-lg mb-5">Nieuw item toevoegen</h2>
              <EntryForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tijdlijn */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-semibold text-ink text-lg">Nog geen items</p>
          <p className="text-ink-muted text-sm mt-1">
            {activeCategory === 'all'
              ? 'Voeg het eerste dossieritem toe via de knop hierboven'
              : `Geen ${getCatConfig(activeCategory).label.toLowerCase()} gevonden`}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Tijdlijn lijn */}
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

          {entries.map(entry => (
            <div key={entry.id}>
              {editingEntry?.id === entry.id ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-card border border-accent/30 rounded-2xl p-6 mb-4 ml-8"
                >
                  <h2 className="font-semibold text-ink text-lg mb-5">Item bewerken</h2>
                  <EntryForm
                    initial={entry}
                    onSave={handleUpdate}
                    onCancel={() => setEditingEntry(null)}
                  />
                </motion.div>
              ) : (
                <EntryCard
                  entry={entry}
                  onEdit={() => { setEditingEntry(entry); setShowForm(false) }}
                  onDelete={() => deleteEntry.mutate({ childId: childId!, id: entry.id })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DossierPage
