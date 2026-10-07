'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Send, X } from 'lucide-react'
import type { ChatMessage } from '@/lib/webrtc'
import { cn } from '@/lib/utils'

type ChatPanelProps = {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onClose: () => void
  peerName?: string
}

/** Format a timestamp as HH:MM (24-hour, local time). */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Derive up to two uppercase initials from a display name. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/**
 * ChatPanel — Instagram-DM-style slide-in chat panel anchored to the right
 * edge of the viewport. Dark glassy surface, red bubbles for "me", white/10
 * bubbles for the peer, autoscroll to bottom, Enter-to-send / Shift+Enter for
 * newline. Plain `<textarea>` + plain `<button>` (matches the convention used
 * by the existing CallControls component — heavy custom dark styling).
 */
export function ChatPanel({ messages, onSend, onClose, peerName }: ChatPanelProps) {
  const [text, setText] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to the latest message whenever the list grows.
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleSend = React.useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    inputRef.current?.focus()
  }, [text, onSend])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const name = peerName?.trim() || 'Peer'

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      role="dialog"
      aria-label={`Chat with ${name}`}
      className="fixed inset-y-0 right-0 z-40 flex h-full w-[88vw] flex-col border-l border-white/10 bg-zinc-950/95 backdrop-blur-xl sm:w-96"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-primary-foreground"
        >
          {initialsOf(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="text-[10px] text-white/50">In-call chat</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex size-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <X className="size-5" />
        </button>
      </header>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-white/5 p-4 text-white/40">
              <Send className="size-6" />
            </div>
            <p className="text-sm text-white/50">Belum ada pesan. Sapa temanmu!</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.from === 'me'
            return (
              <div
                key={m.id}
                className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap break-words px-3 py-2 text-sm shadow-sm',
                    mine
                      ? 'rounded-2xl rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-2xl rounded-bl-sm bg-white/10 text-white'
                  )}
                >
                  {m.text}
                </div>
                <span className="mt-1 px-1 text-[10px] text-white/40">
                  {formatTime(m.timestamp)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Composer */}
      <footer className="border-t border-white/10 bg-zinc-950/80 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Tulis pesan…"
            aria-label="Type a message"
            maxLength={1000}
            className="field-sizing-content max-h-24 min-h-10 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={text.trim().length === 0}
            aria-label="Send message"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <Send className="size-5" />
          </button>
        </div>
      </footer>
    </motion.aside>
  )
}
