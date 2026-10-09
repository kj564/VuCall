'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, X } from 'lucide-react'
import type { ChatMessage } from '@/lib/signaling'
import { cn } from '@/lib/utils'

export type ChatPanelProps = {
  /** Controlled open state. When false the panel is fully unmounted. */
  open: boolean
  /** The chat log (from the store). */
  messages: ChatMessage[]
  /** Close the panel (X button / Esc). */
  onClose: () => void
  /** Send a chat message — receives the trimmed text. */
  onSend: (text: string) => void
}

/**
 * ChatPanel — Instagram/Messenger-style in-call text chat.
 *
 * Slides in from the right edge over the remote video: dark-glassy
 * (`bg-black/70 backdrop-blur-md`), 320px on desktop, full-width on mobile.
 * Sits absolutely inside a `relative` parent (the video wrapper). When
 * `open === false` it renders `null` (no offscreen DOM kept around).
 *
 * Bubbles:
 *  - me    → right-aligned, primary bubble with a bottom-right tail
 *  - peer  → left-aligned, white/10 bubble with a bottom-left tail
 *  - system→ centered muted pill
 */
export function ChatPanel({
  open,
  messages,
  onClose,
  onSend,
}: ChatPanelProps) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the latest message whenever the log changes.
  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, open])

  // Esc closes the panel (only while open).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="complementary"
          aria-label="In-call chat"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-full max-w-[100vw] flex-col border-l border-white/10 bg-black/70 backdrop-blur-md sm:w-80"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
            <h2 className="text-sm font-semibold text-white">Chat</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup chat"
              className="flex size-8 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="scrollbar-thin flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-xs text-white/40">
                  Belum ada pesan. Mulai ngobrol lewat chat.
                </p>
              </div>
            ) : (
              messages.map((m) => <ChatBubble key={m.id} message={m} />)
            )}
            <div ref={bottomRef} aria-hidden="true" />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ketik pesan..."
              aria-label="Ketik pesan"
              autoComplete="off"
              className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:bg-white/15"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Kirim pesan"
              className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.from === 'system') {
    return (
      <div className="flex justify-center">
        <span className="mx-auto rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
          {message.text}
        </span>
      </div>
    )
  }

  const isMe = message.from === 'me'
  const time = new Date(message.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={cn(
        'flex flex-col',
        isMe ? 'items-end' : 'items-start',
      )}
    >
      <div
        className={cn(
          'max-w-[80%] break-words rounded-2xl px-3 py-1.5 text-sm',
          isMe
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-white/10 text-white',
        )}
      >
        {message.text}
      </div>
      <span className="mt-0.5 text-[10px] text-white/40">{time}</span>
    </div>
  )
}

export default ChatPanel
