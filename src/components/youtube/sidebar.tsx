'use client'

import * as React from 'react'
import {
  Bell,
  Clock,
  Clapperboard,
  Film,
  Flame,
  Flag,
  Gamepad2,
  HelpCircle,
  Home,
  List,
  Library,
  Music,
  Newspaper,
  Play,
  Podcast,
  Radio,
  Settings,
  ThumbsUp,
  Trophy,
  Video,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useUIStore } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  label: string
  icon: LucideIcon
  onClick: () => void
  active?: boolean
}

type NavSection = {
  title?: string
  items: NavItem[]
}

export function Sidebar() {
  const { sidebarOpen, mobileNavOpen, setMobileNavOpen } = useUIStore()

  if (sidebarOpen) {
    // Expanded rail on desktop; mobile uses the Sheet below.
    return (
      <>
        <aside className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto scrollbar-thin px-2 py-3">
          <SidebarContent />
        </aside>
        <MobileNav />
      </>
    )
  }

  // Collapsed mini rail
  return (
    <>
      <aside className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)] w-[72px] shrink-0 overflow-y-auto scrollbar-thin py-2">
        <MiniRail />
      </aside>
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  )

  function MobileNav(
    props: { open?: boolean; onOpenChange?: (v: boolean) => void } = {},
  ) {
    return (
      <Sheet
        open={props.open ?? mobileNavOpen}
        onOpenChange={props.onOpenChange ?? setMobileNavOpen}
      >
        <SheetContent side="left" className="w-72 p-0">
          <div className="h-14 flex items-center px-4 border-b border-border/60">
            <span className="flex h-6 w-9 items-center justify-center rounded-md bg-primary">
              <Play className="size-4 fill-primary-foreground text-primary-foreground" />
            </span>
            <span className="ml-1.5 text-lg font-bold tracking-tight">
              Vu<span className="text-primary">Tube</span>
            </span>
          </div>
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <div className="px-2 py-3">
              <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }
}

function useNavConfig(onNavigate?: () => void): NavSection[] {
  const { goHome, goCategory } = useNav()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const isHome = !(
    searchParams.get('v') ||
    searchParams.get('c') ||
    searchParams.get('q')
  )

  const soon = (label: string) => () => {
    onNavigate?.()
    toast({ title: label, description: 'Coming soon.' })
  }

  const cat = (name: string) => () => {
    onNavigate?.()
    goCategory(name)
  }
  const home = () => {
    onNavigate?.()
    goHome()
  }

  const main: NavSection = {
    items: [
      { label: 'Home', icon: Home, onClick: home, active: isHome },
      { label: 'Shorts', icon: Clapperboard, onClick: soon('Shorts') },
      { label: 'Subscriptions', icon: Library, onClick: soon('Subscriptions') },
    ],
  }

  const you: NavSection = {
    title: 'You',
    items: [
      { label: 'History', icon: Clock, onClick: cat('Watched') },
      { label: 'Playlists', icon: List, onClick: soon('Playlists') },
      { label: 'Your videos', icon: Video, onClick: soon('Your videos') },
      { label: 'Watch later', icon: Clock, onClick: soon('Watch later') },
      { label: 'Liked videos', icon: ThumbsUp, onClick: home },
    ],
  }

  const explore: NavSection = {
    title: 'Explore',
    items: [
      { label: 'Trending', icon: Flame, onClick: home },
      { label: 'Music', icon: Music, onClick: cat('Music') },
      { label: 'Gaming', icon: Gamepad2, onClick: cat('Gaming') },
      { label: 'Sports', icon: Trophy, onClick: home },
      { label: 'Movies', icon: Film, onClick: home },
      { label: 'Live', icon: Radio, onClick: cat('Live') },
      { label: 'News', icon: Newspaper, onClick: cat('News') },
      { label: 'Podcasts', icon: Podcast, onClick: cat('Podcasts') },
    ],
  }

  const more: NavSection = {
    title: 'More from VuTube',
    items: [
      { label: 'Settings', icon: Settings, onClick: soon('Settings') },
      { label: 'Help', icon: HelpCircle, onClick: soon('Help') },
      { label: 'Report', icon: Flag, onClick: soon('Report') },
    ],
  }

  return [main, you, explore, more]
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const sections = useNavConfig(onNavigate)
  return (
    <nav className="flex flex-col">
      {sections.map((section, i) => (
        <div key={i} className="flex flex-col">
          {section.items.map((item) => (
            <NavItemRow key={item.label} item={item} />
          ))}
          {section.title && <div className="h-px bg-border/60 my-2 mx-3" />}
        </div>
      ))}
      <div className="px-3 pt-3 text-xs text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/80">© 2024 VuTube LLC</p>
        <p className="mt-1">
          A demo built with Next.js, TypeScript, Tailwind CSS &amp; Prisma.
        </p>
      </div>
    </nav>
  )
}

function NavItemRow({ item }: { item: NavItem }) {
  const { label, icon: Icon, onClick, active } = item
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-5 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left',
        active
          ? 'bg-accent font-medium'
          : 'hover:bg-accent text-foreground/90',
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function MiniRail() {
  const { goHome, goCategory } = useNav()
  const searchParams = useSearchParams()
  const isHome = !(
    searchParams.get('v') ||
    searchParams.get('c') ||
    searchParams.get('q')
  )
  const { toast } = useToast()

  const items: NavItem[] = [
    { label: 'Home', icon: Home, onClick: goHome, active: isHome },
    {
      label: 'Shorts',
      icon: Clapperboard,
      onClick: () => toast({ title: 'Shorts', description: 'Coming soon.' }),
    },
    {
      label: 'Subs',
      icon: Library,
      onClick: () => toast({ title: 'Subscriptions', description: 'Coming soon.' }),
    },
    { label: 'You', icon: Bell, onClick: goHome },
  ]
  return (
    <nav className="flex flex-col items-stretch">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            onClick={item.onClick}
            className={cn(
              'flex flex-col items-center gap-1.5 py-4 rounded-lg mx-1 transition-colors',
              item.active ? 'bg-accent' : 'hover:bg-accent',
            )}
          >
            <Icon className="size-5" />
            <span className="text-[10px] leading-none">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
