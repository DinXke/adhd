/**
 * Communicatieportaal voor ouders en hulpverleners.
 * Kanalen (per thema) + chatinterface + gestructureerde updates.
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import {
  useMyChildren, useChannels, useMessages, useSendMessage, useCreateChannel,
  Channel, Message,
} from '../../lib/queries'
import { AvatarDisplay } from '../../components/AvatarDisplay'
import { format, isToday, isYesterday } from 'date-fns'
import { nl } from 'date-fns/locale'

// ── Hulpfuncties ──────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  general: '#7BAFA3',
  therapy: '#E8734A',
  school: '#5B8C5A',
  medical: '#A8C5D6',
}

const CHANNEL_LABELS: Record<string, string> = {
  general: 'Algemeen',
  therapy: 'Therapie',
  school: 'School',
  medical: 'Medisch',
}

const CHANNEL_ICONS: Record<string, string> = {
  general: '💬',
  therapy: '🧠',
  school: '📚',
  medical: '💊',
}

function formatMessageDate(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Gisteren'
  return format(d, 'd MMM', { locale: nl })
}

function formatMessageTime(iso: string): string {
  return format(new Date(iso), 'HH:mm')
}

// ── Gestructureerde update template ───────────────────────────
function StructuredUpdatePreview({ data }: { data: any }) {
  if (!data) return null
  return (
    <div className="mt-2 bg-white/60 rounded-xl p-3 text-sm space-y-1 border border-white/40">
      {data.workedOn && <div><span className="font-semibold text-ink-muted">Vandaag: </span>{data.workedOn}</div>}
      {data.goingWell && <div><span className="font-semibold text-[var(--accent-success)]">Gaat goed: </span>{data.goingWell}</div>}
      {data.attention && <div><span className="font-semibold text-amber-700">Aandachtspunt: </span>{data.attention}</div>}
      {data.homework && <div><span className="font-semibold text-blue-700">Oefening thuis: </span>{data.homework}</div>}
    </div>
  )
}

// ── Template formulier ─────────────────────────────────────────
function TemplateForm({ onSend, onCancel }: {
  onSend: (content: string, templateData: any) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ workedOn: '', goingWell: '', attention: '', homework: '' })
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const lines = []
    if (form.workedOn) lines.push(`📋 Vandaag gewerkt aan: ${form.workedOn}`)
    if (form.goingWell) lines.push(`✅ Gaat goed: ${form.goingWell}`)
    if (form.attention) lines.push(`⚠️ Aandachtspunt: ${form.attention}`)
    if (form.homework) lines.push(`🏠 Oefening thuis: ${form.homework}`)
    if (lines.length === 0) return
    onSend(lines.join('\n'), form)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold text-ink text-sm">Gestructureerde update</h3>
      {[
        { key: 'workedOn', label: 'Vandaag gewerkt aan', placeholder: 'Bv. letters schrijven, rekenen tot 10...' },
        { key: 'goingWell', label: 'Gaat goed', placeholder: 'Bv. concentratie, motivatie...' },
        { key: 'attention', label: 'Aandachtspunt', placeholder: 'Bv. vermoeid, moeilijk bij thema X...' },
        { key: 'homework', label: 'Oefening voor thuis', placeholder: 'Bv. dagelijks 10 min hardop lezen...' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-xs font-medium text-ink-muted block mb-1">{label}</label>
          <input
            value={(form as any)[key]}
            onChange={e => set(key)(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl border border-border text-sm text-ink-muted">
          Annuleren
        </button>
        <button type="submit" className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium">
          Versturen
        </button>
      </div>
    </form>
  )
}

// ── Berichtbel ─────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={`flex gap-2 mb-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-surface flex-shrink-0 overflow-hidden flex items-center justify-center border border-border">
        <AvatarDisplay avatarId={msg.author.avatarId} avatarUrl={msg.author.avatarUrl} name={msg.author.name} size={28} />
      </div>

      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className={`text-xs text-ink-muted ${isMine ? 'mr-1 text-right' : 'ml-1'}`}>
          {msg.author.name}
        </span>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isMine
              ? 'bg-accent text-white rounded-tr-sm'
              : 'bg-card border border-border text-ink rounded-tl-sm'
          } ${msg.isStructuredUpdate ? 'min-w-[200px]' : ''}`}
        >
          {msg.content}
          {msg.isStructuredUpdate && <StructuredUpdatePreview data={msg.templateData} />}

          {/* Bijlagen */}
          {msg.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {msg.attachments.map(att => (
                <a
                  key={att.id}
                  href={`/api/communication/files/${encodeURIComponent(att.storageKey)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-surface hover:bg-border'} transition-colors`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {att.filename}
                </a>
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-ink-muted mx-1">{formatMessageTime(msg.createdAt)}</span>
      </div>
    </div>
  )
}

// ── Kanaal item in sidebar ─────────────────────────────────────
function ChannelItem({ channel, isSelected, onClick }: {
  channel: Channel
  isSelected: boolean
  onClick: () => void
}) {
  const lastMsg = channel.messages[0]
  const color = CHANNEL_COLORS[channel.type] ?? '#7BAFA3'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
        isSelected ? 'bg-accent/10 border border-accent/30' : 'hover:bg-surface border border-transparent'
      }`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: color + '22', color }}>
        {CHANNEL_ICONS[channel.type] ?? '💬'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`font-medium text-sm truncate ${isSelected ? 'text-accent' : 'text-ink'}`}>
            {channel.name}
          </span>
          {lastMsg && <span className="text-[10px] text-ink-muted flex-shrink-0">{formatMessageDate(lastMsg.createdAt)}</span>}
        </div>
        {lastMsg && (
          <p className="text-xs text-ink-muted truncate mt-0.5">
            {lastMsg.author.name}: {lastMsg.content.replace(/\n/g, ' ')}
          </p>
        )}
      </div>
      {channel.unreadCount > 0 && (
        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-white font-bold">{channel.unreadCount > 9 ? '9+' : channel.unreadCount}</span>
        </div>
      )}
    </button>
  )
}

// ── Nieuw kanaal formulier ────────────────────────────────────
function NewChannelForm({ childId, onDone }: { childId: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('general')
  const createChannel = useCreateChannel()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createChannel.mutateAsync({ name: name.trim(), type, childId })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-border space-y-3">
      <h3 className="font-semibold text-ink text-sm">Nieuw kanaal</h3>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Naam (bv. Logopedie)"
        autoFocus
        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:border-accent focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => setType(k)}
            className={`py-2 rounded-xl text-xs font-medium border transition-all ${
              type === k ? 'border-accent bg-accent/10 text-accent' : 'border-border text-ink-muted'
            }`}
          >
            {CHANNEL_ICONS[k]} {v}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="flex-1 py-2 rounded-xl border border-border text-sm text-ink-muted">
          Annuleren
        </button>
        <button type="submit" disabled={createChannel.isPending} className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50">
          Aanmaken
        </button>
      </div>
    </form>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────
export function CommunicationPage() {
  const { user } = useAuthStore()
  const { data: childrenData } = useMyChildren()
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [message, setMessage] = useState('')
  const [showTemplate, setShowTemplate] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const children = childrenData?.children ?? []
  const childId = selectedChildId || children[0]?.id

  const { data: channelsData, refetch: refetchChannels } = useChannels(childId)
  const { data: messagesData, refetch: refetchMessages } = useMessages(selectedChannelId || undefined)
  const sendMessage = useSendMessage()

  const channels = channelsData?.channels ?? []
  const messages = messagesData?.messages ?? []
  const selectedChannel = channels.find(c => c.id === selectedChannelId)

  // Scroll naar onderkant bij nieuwe berichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    if (!message.trim() || !selectedChannelId) return
    await sendMessage.mutateAsync({ channelId: selectedChannelId, content: message.trim() })
    setMessage('')
  }

  async function handleTemplateSend(content: string, templateData: any) {
    if (!selectedChannelId) return
    await sendMessage.mutateAsync({ channelId: selectedChannelId, content, isStructuredUpdate: true, templateData })
    setShowTemplate(false)
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row bg-surface rounded-2xl overflow-hidden border border-border">

      {/* Sidebar — kanalen */}
      <aside className="w-full md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-border flex flex-col bg-card">
        {/* Kind-selector */}
        {children.length > 1 && (
          <div className="p-3 border-b border-border">
            <select
              value={childId}
              onChange={e => { setSelectedChildId(e.target.value); setSelectedChannelId('') }}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:border-accent focus:outline-none"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Kanalen header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <span className="font-semibold text-sm text-ink">Kanalen</span>
          {(user?.role === 'parent' || user?.role === 'admin') && (
            <button
              onClick={() => setShowNewChannel(!showNewChannel)}
              className="w-7 h-7 rounded-lg bg-surface hover:bg-border transition-colors flex items-center justify-center text-ink-muted"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Nieuw kanaal formulier */}
        <AnimatePresence>
          {showNewChannel && childId && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <NewChannelForm childId={childId} onDone={() => { setShowNewChannel(false); refetchChannels() }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kanaallijst */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm">
              <div className="text-3xl mb-2">💬</div>
              <p>Nog geen kanalen.</p>
              {(user?.role === 'parent' || user?.role === 'admin') && (
                <button onClick={() => setShowNewChannel(true)} className="mt-2 text-accent text-xs underline">
                  Maak een kanaal aan
                </button>
              )}
            </div>
          ) : (
            channels.map(ch => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                isSelected={ch.id === selectedChannelId}
                onClick={() => setSelectedChannelId(ch.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Chatvenster */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: (CHANNEL_COLORS[selectedChannel.type] ?? '#7BAFA3') + '22' }}
              >
                {CHANNEL_ICONS[selectedChannel.type] ?? '💬'}
              </div>
              <div>
                <h2 className="font-semibold text-ink text-sm">{selectedChannel.name}</h2>
                <p className="text-xs text-ink-muted">
                  {selectedChannel.members.length} leden ·{' '}
                  <span style={{ color: CHANNEL_COLORS[selectedChannel.type] }}>
                    {CHANNEL_LABELS[selectedChannel.type]}
                  </span>
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {selectedChannel.members.slice(0, 4).map(m => (
                  <div key={m.user.id} className="w-7 h-7 rounded-full bg-surface border border-card flex items-center justify-center overflow-hidden" title={m.user.name}>
                    <AvatarDisplay avatarId={m.user.avatarId} name={m.user.name} size={24} />
                  </div>
                ))}
              </div>
            </div>

            {/* Berichten */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-ink-muted text-sm">
                  <div className="text-center">
                    <div className="text-4xl mb-2">👋</div>
                    <p>Nog geen berichten. Stuur het eerste bericht!</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={msg.author.id === user?.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Template formulier */}
            <AnimatePresence>
              {showTemplate && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden px-4 pb-2"
                >
                  <TemplateForm onSend={handleTemplateSend} onCancel={() => setShowTemplate(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Berichtinvoer */}
            <div className="border-t border-border bg-card px-3 py-3 flex items-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowTemplate(!showTemplate)}
                title="Gestructureerde update"
                className="p-2 rounded-xl border border-border text-ink-muted hover:border-accent hover:text-accent transition-colors flex-shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </button>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Schrijf een bericht... (Enter = versturen)"
                rows={1}
                className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-surface text-sm text-ink focus:border-accent focus:outline-none resize-none min-h-[40px] max-h-32"
                style={{ height: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="p-2.5 rounded-xl bg-accent text-white disabled:opacity-40 transition-opacity flex-shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-muted">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="font-semibold text-ink text-lg">Selecteer een kanaal</p>
              <p className="text-sm mt-1">Kies een kanaal uit de lijst links om te starten</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CommunicationPage
