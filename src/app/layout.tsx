import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${dmSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
