'use client'

import { Header } from './header'
import { Sidebar } from './sidebar'
import { Footer } from './footer'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-[calc(100vh-3.5rem)] flex flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
