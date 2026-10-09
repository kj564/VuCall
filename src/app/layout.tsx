import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "VuCall — Terhubung lewat video call",
  description:
    "Mulai panggilan video, buat ruang, dan bagikan tautan undangan dengan VuCall.",
  applicationName: "VuCall",
  keywords: ["VuCall", "video call", "WebRTC", "panggilan video", "Next.js"],
  authors: [{ name: "VuCall" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "VuCall — Terhubung lewat video call",
    description: "Mulai panggilan video dan bagikan tautan undangan dengan mudah.",
    siteName: "VuCall",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VuCall — Terhubung lewat video call",
    description: "Mulai panggilan video dan bagikan tautan undangan dengan mudah.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Load DM Sans + Geist Mono via <link> tags instead of next/font/google.
            The latter triggers a Turbopack resolution bug on the CI runner
            ("next/font/google queries have exactly one entry") because the
            weight: [...] array produces multiple @font-face declarations per
            query. Loading via <link> sidesteps the bug entirely and keeps
            the fonts available offline via the browser's font cache. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
