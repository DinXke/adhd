/**
 * Kind-lijstjes — kinderen kunnen eigen to-do lijstjes maken en beheren.
 * Route: /app/lijstjes
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────

interface ChildListItem {
  id: string
  title: string
  isCompleted: boolean
  completedAt: string | null
  sortOrder: number
}

interface ChildList {
  id: string
  title: string
  icon: string
  color: string
  sortOrder: number
  items: ChildListItem[]
}

// ── Emoji-keuzes ──────────────────────────────────────────────

const EMOJI_OPTIONS = ['📝', '📋', '🎯', '🎒', '🎮', '📚', '🏠', '🎨', '🎵', '🌟', '💪', '🧹']
const COLOR_OPTIONS = ['#7BAFA3', '#E8734A', '#5B8C5A', '#D4973B', '#F2C94C', '#A8C5D6']

// ── Hooks ─────────────────────────────────────────────────────

function useChildLists() {
  return useQuery({
    queryKey: ['childlists'],
    queryFn: () => api.get<{ lists: ChildList[] }>('/api/childlists'),
    staleTime: 15_000,
  })
}

function useCreateList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; icon?: string; color?: string }) =>
      api.post<{ list: ChildList }>('/api/childlists', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['childlists'] }),
  })
}

function useUpdateList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; icon?: string; color?: string }) =>
      api.put<{ list: ChildList }>(`/api/childlists/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['childlists'] }),
  })
}

function useDeleteList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/childlists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['childlists'] }),
  })
}

function useAddItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, title }: { listId: string; title: string }) =>
      api.post<{ item: ChildListItem }>(`/api/childlists/${listId}/items`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['childlists'] }),
  })
}

function useToggleItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
      api.patch<{ item: ChildListItem }>(`/api/childlists/items/${itemId}`, { isCompleted }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['childlists'] }),
  })
}

function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/api/childlists/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['childlists'] }),
  })
}

// ── Subcomponents ─────────────────────────────────────────────

function ListItemRow({
  item,
  color,
  onToggle,
  onDelete,
}: {
  item: ChildListItem
  color: string
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  const [celebrating, setCelebrating] = useState(false)

  const handleToggle = () => {
    const newState = !item.isCompleted
    if (newState) {
      setCelebrating(true)
      if (navigator.vibrate) navigator.vibrate([30, 15, 30])
      setTimeout(() => setCelebrating(false), 800)
    }
    onToggle(item.id, newState)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 py-2.5 relative"
    >
      {/* Checkbox */}
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.85 }}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: item.isCompleted ? color : 'transparent',
          border: item.isCompleted ? 'none' : `2.5px solid ${color}66`,
        }}
        aria-label={item.isCompleted ? 'Markeer als niet klaar' : 'Markeer als klaar'}
      >
        <AnimatePresence mode="wait">
          {item.isCompleted && (
            <motion.span
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="text-white text-sm font-bold"
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Titel */}
      <span
        className="flex-1 font-body text-base transition-all"
        style={{
          color: item.isCompleted ? `${color}99` : 'var(--text-primary)',
          textDecoration: item.isCompleted ? 'line-through' : 'none',
        }}
      >
        {item.title}
      </span>

      {/* Verwijder knop */}
      <motion.button
        onClick={() => onDelete(item.id)}
        whileTap={{ scale: 0.85 }}
        className="w-7 h-7 rounded-full flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Verwijder item"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeWidth="2">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" />
        </svg>
      </motion.button>

      {/* Celebrate burst */}
      <AnimatePresence>
        {celebrating && (
          <motion.span
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xl absolute left-4"
            aria-hidden="true"
          >
            ⭐
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function NewItemInput({
  listId,
  color,
  onAdd,
}: {
  listId: string
  color: string
  onAdd: (listId: string, title: string) => void
}) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    onAdd(listId, value.trim())
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nieuw item..."
        className="flex-1 px-3 py-2 rounded-full font-body text-sm border-2 bg-transparent outline-none transition-colors"
        style={{
          borderColor: `${color}44`,
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = color }}
        onBlur={(e) => { e.currentTarget.style.borderColor = `${color}44` }}
      />
      <motion.button
        type="submit"
        whileTap={{ scale: 0.9 }}
        disabled={!value.trim()}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold transition-opacity"
        style={{
          background: color,
          opacity: value.trim() ? 1 : 0.4,
        }}
        aria-label="Toevoegen"
      >
        +
      </motion.button>
    </form>
  )
}

function ListCard({
  list,
  isOpen,
  onOpen,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onDeleteList,
}: {
  list: ChildList
  isOpen: boolean
  onOpen: (id: string | null) => void
  onToggleItem: (itemId: string, completed: boolean) => void
  onAddItem: (listId: string, title: string) => void
  onDeleteItem: (itemId: string) => void
  onDeleteList: (id: string) => void
}) {
  const doneCount = list.items.filter((i) => i.isCompleted).length
  const totalCount = list.items.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  return (
    <motion.div layout className="w-full">
      {/* Kaart-header */}
      <motion.button
        onClick={() => onOpen(isOpen ? null : list.id)}
        layout
        whileTap={{ scale: 0.98 }}
        className="w-full text-left rounded-3xl p-4 border-2 transition-all"
        style={{
          background: isOpen ? `${list.color}12` : 'var(--bg-card)',
          borderColor: isOpen ? list.color : 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl flex-shrink-0">{list.icon}</span>
          <div className="flex-1 min-w-0">
            <p
              className="font-display font-bold text-lg truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {list.title}
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: `${list.color}cc` }}>
              {totalCount === 0
                ? 'Nog geen items'
                : doneCount === totalCount
                  ? 'Alles klaar!'
                  : `${doneCount} van ${totalCount} klaar`}
            </p>
          </div>
          {/* Mini progress ring */}
          {totalCount > 0 && (
            <div className="w-10 h-10 flex-shrink-0 relative">
              <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
                <circle
                  cx="20" cy="20" r="16"
                  fill="none"
                  stroke={`${list.color}22`}
                  strokeWidth="4"
                />
                <motion.circle
                  cx="20" cy="20" r="16"
                  fill="none"
                  stroke={list.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - progress / 100) }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center font-body text-xs font-bold"
                style={{ color: list.color }}
              >
                {doneCount}
              </span>
            </div>
          )}
        </div>
      </motion.button>

      {/* Uitklapbare items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pt-2 pb-3">
              {/* Items */}
              <AnimatePresence>
                {list.items.map((item) => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    color={list.color}
                    onToggle={onToggleItem}
                    onDelete={onDeleteItem}
                  />
                ))}
              </AnimatePresence>

              {/* Nieuw item toevoegen */}
              <NewItemInput listId={list.id} color={list.color} onAdd={onAddItem} />

              {/* Verwijder-knop voor lijstje */}
              <div className="mt-4 flex justify-center">
                <motion.button
                  onClick={() => onDeleteList(list.id)}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-1.5 rounded-full font-body text-xs border transition-colors"
                  style={{
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Lijstje verwijderen
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function NewListForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string; icon: string; color: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('📝')
  const [color, setColor] = useState('#7BAFA3')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), icon, color })
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onSubmit={handleSubmit}
      className="rounded-3xl p-5 border-2 space-y-4"
      style={{
        background: 'var(--bg-card)',
        borderColor: color,
      }}
    >
      <p className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
        Nieuw lijstje
      </p>

      {/* Titel */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Naam van je lijstje..."
        autoFocus
        className="w-full px-4 py-3 rounded-2xl font-body text-base border-2 bg-transparent outline-none"
        style={{
          borderColor: `${color}55`,
          color: 'var(--text-primary)',
        }}
      />

      {/* Emoji-kiezer */}
      <div>
        <p className="font-body text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Kies een icoontje
        </p>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((em) => (
            <motion.button
              key={em}
              type="button"
              onClick={() => setIcon(em)}
              whileTap={{ scale: 0.85 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all"
              style={{
                borderColor: icon === em ? color : 'var(--border-color)',
                background: icon === em ? `${color}18` : 'transparent',
              }}
            >
              {em}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Kleur-kiezer */}
      <div>
        <p className="font-body text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Kies een kleur
        </p>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map((c) => (
            <motion.button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              whileTap={{ scale: 0.85 }}
              className="w-9 h-9 rounded-full border-3 transition-all"
              style={{
                background: c,
                borderWidth: color === c ? 3 : 0,
                borderColor: 'var(--text-primary)',
                boxShadow: color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Knoppen */}
      <div className="flex gap-3 pt-1">
        <motion.button
          type="button"
          onClick={onCancel}
          whileTap={{ scale: 0.95 }}
          className="flex-1 py-3 rounded-full font-body font-semibold text-sm border-2"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          Annuleer
        </motion.button>
        <motion.button
          type="submit"
          disabled={!title.trim()}
          whileTap={{ scale: 0.95 }}
          className="flex-1 py-3 rounded-full font-body font-semibold text-sm text-white transition-opacity"
          style={{
            background: color,
            opacity: title.trim() ? 1 : 0.4,
          }}
        >
          Maak aan
        </motion.button>
      </div>
    </motion.form>
  )
}

// ── Hoofdpagina ───────────────────────────────────────────────

export function ListsPage() {
  const { user } = useAuthStore()
  const [openListId, setOpenListId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const { data, isLoading } = useChildLists()
  const createList = useCreateList()
  const deleteList = useDeleteList()
  const addItem = useAddItem()
  const toggleItem = useToggleItem()
  const deleteItem = useDeleteItem()

  const lists = data?.lists ?? []

  async function handleCreateList(data: { title: string; icon: string; color: string }) {
    await createList.mutateAsync(data)
    setShowNewForm(false)
  }

  async function handleDeleteList(id: string) {
    await deleteList.mutateAsync(id)
    if (openListId === id) setOpenListId(null)
  }

  async function handleAddItem(listId: string, title: string) {
    await addItem.mutateAsync({ listId, title })
  }

  async function handleToggleItem(itemId: string, completed: boolean) {
    await toggleItem.mutateAsync({ itemId, isCompleted: completed })
  }

  async function handleDeleteItem(itemId: string) {
    await deleteItem.mutateAsync(itemId)
  }

  // Laadindicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-4 h-4 rounded-full animate-bounce"
              style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">Mijn lijstjes</h1>
          <p className="font-body text-ink-muted text-sm mt-0.5">
            {lists.length === 0
              ? 'Maak je eerste lijstje!'
              : `${lists.length} lijstje${lists.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!showNewForm && (
          <motion.button
            onClick={() => setShowNewForm(true)}
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: 'var(--accent-warm)' }}
            aria-label="Nieuw lijstje"
          >
            +
          </motion.button>
        )}
      </div>

      {/* Nieuw lijstje formulier */}
      <AnimatePresence>
        {showNewForm && (
          <div className="mb-5">
            <NewListForm
              onSubmit={handleCreateList}
              onCancel={() => setShowNewForm(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Lijstjes */}
      {lists.length === 0 && !showNewForm ? (
        <div className="text-center py-12 bg-[var(--bg-card)] rounded-3xl border-2 border-[var(--accent-calm)]/20">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-display font-bold text-[var(--text-primary)]">Nog geen lijstjes!</p>
          <p className="font-body text-sm text-[var(--text-muted)] mt-1">
            Tik op + om je eerste lijstje te maken.
          </p>
        </div>
      ) : (
        <motion.div layout className="space-y-3">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              isOpen={openListId === list.id}
              onOpen={setOpenListId}
              onToggleItem={handleToggleItem}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onDeleteList={handleDeleteList}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default ListsPage
