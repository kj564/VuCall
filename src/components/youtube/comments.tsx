'use client'

import * as React from 'react'
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ChannelAvatar } from '@/components/youtube/channel-avatar'
import { useToast } from '@/hooks/use-toast'
import { addComment } from '@/lib/api'
import { formatCommentTime, formatCompact } from '@/lib/format'
import type { Comment } from '@/lib/types'
import { cn } from '@/lib/utils'

type CommentsProps = {
  videoId: string
  comments: Comment[]
}

export function Comments({ videoId, comments }: CommentsProps) {
  const { toast } = useToast()

  // Local copy so we can prepend freshly-posted comments without refetching.
  const [list, setList] = React.useState<Comment[]>(comments)
  React.useEffect(() => {
    setList(comments)
  }, [comments])

  const [draft, setDraft] = React.useState('')
  const [focused, setFocused] = React.useState(false)
  const [posting, setPosting] = React.useState(false)

  const submit = async () => {
    const text = draft.trim()
    if (!text || posting) return
    setPosting(true)
    try {
      const created = await addComment(videoId, text)
      setList((prev) => [created, ...prev])
      setDraft('')
      setFocused(false)
      toast({ title: 'Comment posted', description: 'Your comment is now live.' })
    } catch {
      toast({
        title: 'Could not post comment',
        description: 'Please try again in a moment.',
      })
    } finally {
      setPosting(false)
    }
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="mt-6 flex flex-col gap-4">
      <header className="text-sm font-semibold">
        {formatCompact(list.length)} Comment{list.length === 1 ? '' : 's'}
      </header>

      {/* New comment composer */}
      <div className="flex gap-3">
        <ChannelAvatar name="You" size={40} />
        <div className="flex-1">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
            placeholder="Add a comment..."
            rows={focused ? 3 : 1}
            className="min-h-0 resize-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          {focused && (
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft('')
                  setFocused(false)
                }}
                disabled={posting}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={!draft.trim() || posting}
                className="rounded-full"
              >
                {posting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Comment'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Comment list */}
      <ul className="flex flex-col gap-5">
        {posting && (
          <li className="flex gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        )}
        {list.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </ul>
    </section>
  )
}

function CommentItem({ comment }: { comment: Comment }) {
  const [vote, setVote] = React.useState<'up' | 'down' | null>(null)
  const baseLikes = comment.likes
  const likeCount = baseLikes + (vote === 'up' ? 1 : 0)

  return (
    <li className="flex gap-3">
      <ChannelAvatar name={comment.authorName} src={comment.authorAvatar} size={40} />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-sm font-medium text-foreground">
            @{comment.authorName.replace(/\s+/g, '').toLowerCase()}
          </span>
          <span aria-hidden>·</span>
          <span>{formatCommentTime(comment.createdAt)}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm">{comment.text}</p>
        <div className="flex items-center gap-3 text-muted-foreground">
          <button
            type="button"
            onClick={() => setVote((v) => (v === 'up' ? null : 'up'))}
            aria-pressed={vote === 'up'}
            className={cn(
              'flex items-center gap-1 text-xs transition hover:text-foreground',
              vote === 'up' && 'text-primary',
            )}
          >
            <ThumbsUp
              className="size-3.5"
              fill={vote === 'up' ? 'currentColor' : 'none'}
            />
            {formatCompact(likeCount)}
          </button>
          <button
            type="button"
            onClick={() => setVote((v) => (v === 'down' ? null : 'down'))}
            aria-pressed={vote === 'down'}
            className={cn(
              'flex items-center gap-1 text-xs transition hover:text-foreground',
              vote === 'down' && 'text-primary',
            )}
          >
            <ThumbsDown
              className="size-3.5"
              fill={vote === 'down' ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="button"
            className="rounded-full px-2 py-1 text-xs transition hover:bg-accent"
          >
            Reply
          </button>
        </div>
      </div>
    </li>
  )
}
