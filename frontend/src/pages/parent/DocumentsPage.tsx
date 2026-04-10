/**
 * Documenten-overzicht — alle bijlagen in het systeem.
 * Toont bestanden met uploader, datum, grootte en gekoppelde entiteit.
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, apiFetch } from '../../lib/api'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface DocumentItem {
  id: string
  filename: string
  mimeType: string
  storageKey: string
  sizeBytes: number
  uploadedAt: string
  uploader: { id: string; name: string; role: string }
  linkedTo: {
    type: 'message' | 'dossier'
    id: string
    channelName?: string
    channelType?: string
    title?: string
    category?: string
  } | null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getMimeIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📕'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊'
  if (mime === 'text/plain') return '📃'
  return '📎'
}

function getLinkedLabel(linkedTo: DocumentItem['linkedTo']): string {
  if (!linkedTo) return 'Los bestand'
  if (linkedTo.type === 'message') {
    return `Communicatie${linkedTo.channelName ? ` — ${linkedTo.channelName}` : ''}`
  }
  return `Dossier${linkedTo.title ? ` — ${linkedTo.title}` : ''}`
}

type FilterType = 'all' | 'dossier' | 'communicatie' | 'los'

export function DocumentsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<{ documents: DocumentItem[] }>('/api/upload/documents'),
  })

  const documents = data?.documents ?? []

  const filtered = useMemo(() => {
    let result = documents
    if (filter === 'dossier') result = result.filter(d => d.linkedTo?.type === 'dossier')
    else if (filter === 'communicatie') result = result.filter(d => d.linkedTo?.type === 'message')
    else if (filter === 'los') result = result.filter(d => !d.linkedTo)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(d => d.filename.toLowerCase().includes(q))
    }
    return result
  }, [documents, filter, search])

  async function handleDownload(doc: DocumentItem) {
    try {
      const resp = await apiFetch<{ url: string; filename: string }>(`/api/upload/download/${doc.id}`)
      // Open pre-signed URL in new tab
      window.open(resp.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Download failed', err)
    }
  }

  const filterOptions: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'Alles', icon: '📋' },
    { key: 'dossier', label: 'Dossier', icon: '📁' },
    { key: 'communicatie', label: 'Communicatie', icon: '💬' },
    { key: 'los', label: 'Los', icon: '📎' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Documenten</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Alle gedeelde bestanden op een plek — {documents.length} bestanden
        </p>
      </div>

      {/* Filters + zoeken */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filterOptions.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium flex-shrink-0 border transition-all ${
                filter === f.key
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-ink-muted hover:border-accent/50'
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Zoeken */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op bestandsnaam..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border">
          <div className="text-5xl mb-4">📂</div>
          <p className="font-semibold text-ink text-lg">Geen documenten gevonden</p>
          <p className="text-ink-muted text-sm mt-1">
            {search ? 'Probeer een andere zoekterm' : 'Er zijn nog geen bestanden geupload'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Tabel header */}
          <div className="hidden sm:grid grid-cols-[1fr_140px_100px_160px_80px] gap-3 px-4 py-2.5 border-b border-border text-xs text-ink-muted font-medium uppercase tracking-wide">
            <span>Bestand</span>
            <span>Geupload door</span>
            <span>Grootte</span>
            <span>Gekoppeld aan</span>
            <span></span>
          </div>

          {/* Rijen */}
          {filtered.map(doc => (
            <div
              key={doc.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_140px_100px_160px_80px] gap-2 sm:gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors items-center"
            >
              {/* Bestandsnaam */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{getMimeIcon(doc.mimeType)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{doc.filename}</p>
                  <p className="text-xs text-ink-muted sm:hidden">
                    {doc.uploader.name} · {formatFileSize(doc.sizeBytes)} · {format(new Date(doc.uploadedAt), 'd MMM yyyy', { locale: nl })}
                  </p>
                </div>
              </div>

              {/* Uploader */}
              <div className="hidden sm:block">
                <p className="text-sm text-ink truncate">{doc.uploader.name}</p>
                <p className="text-xs text-ink-muted">
                  {format(new Date(doc.uploadedAt), 'd MMM yyyy', { locale: nl })}
                </p>
              </div>

              {/* Grootte */}
              <p className="hidden sm:block text-sm text-ink-muted">{formatFileSize(doc.sizeBytes)}</p>

              {/* Gekoppeld aan */}
              <div className="hidden sm:block">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  doc.linkedTo?.type === 'dossier'
                    ? 'bg-[#E8734A]/10 text-[#E8734A]'
                    : doc.linkedTo?.type === 'message'
                      ? 'bg-[#7BAFA3]/10 text-[#7BAFA3]'
                      : 'bg-surface text-ink-muted'
                }`}>
                  {getLinkedLabel(doc.linkedTo)}
                </span>
              </div>

              {/* Download */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-ink-muted hover:border-accent hover:text-accent transition-colors"
                  title="Downloaden"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DocumentsPage
