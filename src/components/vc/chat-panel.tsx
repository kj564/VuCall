'use client'

import * as React from 'react'
import { Send, Video, X } from 'lucide-react'
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

/**
 * ChatPanel — restyled to the videocall-app-ui reference design.
 *
 * A full-height white card (`bg-card`) with a "Live Chat" pill header,
 * secondary message bubbles for the peer, primary bubbles for "me",
 * and a `bg-secondary` typing area with a primary send button. The
 * parent is responsible for sizing/positioning (slide-in wrapper lives
 * in the call-room orchestrator).
 */
export function ChatPanel({ messages, onSend, onClose, peerName }: ChatPanelProps) {
  const [text, setText] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

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

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter sends; an <input> cannot hold a newline, so Shift+Enter is a no-op
    // here (the repo uses an input too).
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const peerLabel = peerName?.trim() || 'Peer'

  return (
    <aside
      role="dialog"
      aria-label={`Live chat with ${peerLabel}`}
      className="flex h-full w-full flex-col overflow-hidden rounded-[10px] bg-card"
    >
      {/* Header — "Live Chat" pill on the left, ghost close on the right */}
      <header className="flex items-center justify-between border-b border-border p-4">
        <span className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <Video className="size-4" aria-hidden="true" />
          Live Chat
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </button>
      </header>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="scrollbar-thin max-h-full flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Belum ada pesan. Sapa temanmu!
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.from === 'me'
            const name = mine ? 'You' : peerLabel
            return (
              <div
                key={m.id}
                className={cn('flex gap-3 py-3', mine && 'flex-row-reverse')}
              >
                {/* Profile picture (initials) */}
                <div
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-xs font-bold text-muted-foreground"
                >
                  {mine ? 'Me' : (peerLabel[0]?.toUpperCase() ?? '?')}
                </div>

                {/* Name + bubble + timestamp */}
                <div
                  className={cn(
                    'flex min-w-0 flex-1 flex-col',
                    mine ? 'items-end' : 'items-start',
                  )}
                >
                  <p className="text-xs font-bold text-foreground">{name}</p>
                  <div
                    className={cn(
                      'mt-1 max-w-[calc(100%-32px)] px-3 py-1.5 text-xs leading-4',
                      mine
                        ? 'ml-auto rounded-[16px_0_16px_16px] bg-primary text-primary-foreground'
                        : 'rounded-[0_12px_12px_12px] bg-secondary text-foreground',
                    )}
                  >
                    {m.text}
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {formatTime(m.timestamp)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Typing area footer */}
      <footer className="p-4">
        <div className="vc-shadow flex items-center gap-2 rounded-[10px] bg-secondary p-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message..."
            aria-label="Type a message"
            maxLength={1000}
            className="flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            aria-label="Send message"
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <Send className="size-5" />
          </button>
        </div>
      </footer>
    </aside>
  )
}
