'use client'

import * as React from 'react'
import { Check, Sparkles } from 'lucide-react'
import { FILTER_PRESETS } from '@/lib/vc-store'
import { cn } from '@/lib/utils'

type FilterMenuProps = {
  /** The current CSS filter value applied to the local camera preview. */
  current: string
  /** Called with the selected preset's CSS filter string. */
  onSelect: (css: string) => void
  /** Called to close the popover (also fired on selection). */
  onClose: () => void
}

/**
 * FilterMenu — visual filter picker popover. A column of rows, each with a
 * swatch that previews the filter applied to a colorful gradient + the preset
 * label. The active row gets a primary ring + check. Selecting a row calls
 * `onSelect(preset.css)` then `onClose()`.
 *
 * Rendered `absolute left-full top-0 ml-2` — opens to the right of its anchor.
 * The parent must be `relative`.
 */
export function FilterMenu({ current, onSelect, onClose }: FilterMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Visual filters"
      className="absolute left-full top-0 z-30 ml-2 w-44 rounded-xl border border-border bg-card p-2 vc-shadow"
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5" />
        Efek
      </div>

      <div className="mt-0.5 space-y-0.5">
        {FILTER_PRESETS.map((p) => {
          const active = current === p.css
          return (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              aria-label={`${p.label} filter`}
              onClick={() => {
                onSelect(p.css)
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'relative block size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border',
                  active && 'ring-2 ring-primary',
                )}
              >
                <span
                  className="block size-full"
                  style={{
                    filter: p.css,
                    background:
                      'linear-gradient(135deg, #f43f5e 0%, #f59e0b 38%, #10b981 70%, #38bdf8 100%)',
                  }}
                />
              </span>
              <span className="flex-1">{p.label}</span>
              {active && <Check className="size-4 text-primary" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
