'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  Menu,
  Mic,
  Plus,
  Search,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useUIStore } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { useIsMobile } from '@/hooks/use-mobile'
import { ThemeToggle } from './theme-toggle'
import { ChannelAvatar } from './channel-avatar'

export function Header() {
  const { goHome, goSearch } = useNav()
  const isMobile = useIsMobile()
  const { toggleSidebar, setMobileNavOpen, searchInput, setSearchInput } =
    useUIStore()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false)

  // Pre-fill the search box when landing on a search URL.
  React.useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearchInput(q)
     
  }, [searchParams])

  function onHamburger() {
    if (isMobile) setMobileNavOpen(true)
    else toggleSidebar()
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    goSearch(searchInput)
    setMobileSearchOpen(false)
  }

  const Logo = (
    <button
      onClick={goHome}
      className="flex items-center gap-1.5 pl-1 pr-2"
      aria-label="VuTube home"
    >
      <span className="flex h-6 w-9 items-center justify-center rounded-md bg-primary">
        <Play className="size-4 fill-primary-foreground text-primary-foreground" />
      </span>
      <span className="hidden sm:inline text-lg font-bold tracking-tight">
        Vu<span className="text-primary">Tube</span>
      </span>
    </button>
  )

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center gap-1 px-2 sm:px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/60">
      {/* Mobile search overlay */}
      {mobileSearchOpen ? (
        <div className="flex w-full items-center gap-2 sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => setMobileSearchOpen(false)}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <form onSubmit={submitSearch} className="flex flex-1 items-center">
            <Input
              autoFocus
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search VuTube"
              className="h-9 flex-1 rounded-full bg-secondary border-transparent focus-visible:border-ring"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              aria-label="Search"
              className="ml-1"
            >
              <Search className="size-5" />
            </Button>
          </form>
        </div>
      ) : (
        <>
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu"
              className="rounded-full"
              onClick={onHamburger}
            >
              <Menu className="size-5" />
            </Button>
            {Logo}
          </div>

          {/* Center: search (desktop) */}
          <div className="hidden sm:flex flex-1 justify-center px-4">
            <form onSubmit={submitSearch} className="flex w-full max-w-[560px] items-center">
              <div className="flex flex-1 items-center h-10 rounded-l-full border border-border bg-secondary/60 focus-within:border-ring focus-within:bg-background transition-colors">
                <Search className="ml-4 size-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search"
                  className="h-9 flex-1 border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                type="submit"
                size="icon"
                variant="secondary"
                aria-label="Search"
                className="h-10 rounded-r-full rounded-l-none border border-l-0 border-border px-6"
              >
                <Search className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Voice search"
                className="ml-2 rounded-full hidden md:inline-flex"
                onClick={() =>
                  toast({ title: 'Voice search', description: 'Coming soon.' })
                }
              >
                <Mic className="size-5" />
              </Button>
            </form>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              className="rounded-full sm:hidden"
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="size-5" />
            </Button>
            <Button
              variant="ghost"
              aria-label="Create"
              className="rounded-full hidden sm:inline-flex gap-2 px-4"
              onClick={() =>
                toast({ title: 'Create', description: 'Upload coming soon.' })
              }
            >
              <Plus className="size-5" />
              <span className="text-sm font-medium">Create</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="rounded-full"
              onClick={() =>
                toast({ title: 'No new notifications' })
              }
            >
              <Bell className="size-5" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Account"
                  className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChannelAvatar name="You" size={32} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 px-2 py-2">
                  <ChannelAvatar name="You" size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">You</p>
                    <p className="truncate text-xs text-muted-foreground">@you</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast({ title: 'Your channel', description: 'Coming soon.' })}>
                  <User className="size-4" /> Your channel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: 'Settings', description: 'Coming soon.' })}>
                  <Settings className="size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: 'Help', description: 'Coming soon.' })}>
                  <HelpCircle className="size-4" /> Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast({ title: 'Signed out' })}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  )
}
