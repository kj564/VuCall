const LINKS = [
  'About',
  'Press',
  'Copyright',
  'Contact us',
  'Creators',
  'Advertise',
  'Developers',
  'Terms',
  'Privacy',
  'Policy & Safety',
  'How VuTube works',
  'Test new features',
]

export function Footer() {
  return (
    <footer className="mt-auto w-full px-4 sm:px-6 py-6 bg-background text-muted-foreground border-t border-border/60">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {LINKS.map((l) => (
          <button key={l} className="hover:text-foreground transition-colors">
            {l}
          </button>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        © 2024 VuTube LLC — a YouTube-style demo. Not affiliated with YouTube.
      </div>
    </footer>
  )
}
