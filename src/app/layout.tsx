import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VuTube — Broadcast Yourself",
  description:
    "Watch, discover, and share videos. A YouTube-inspired demo built with Next.js, TypeScript, Tailwind CSS, and Prisma.",
  keywords: ["VuTube", "video", "streaming", "Next.js", "TypeScript"],
  authors: [{ name: "VuTube" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "VuTube — Broadcast Yourself",
    description: "Watch, discover, and share videos.",
    siteName: "VuTube",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VuTube — Broadcast Yourself",
    description: "Watch, discover, and share videos.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
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
