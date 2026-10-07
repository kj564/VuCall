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
  title: "VuCall — 1:1 Video Call yang Tidak Gampang Terputus",
  description:
    "Aplikasi panggilan video 1:1 dengan reconnect otomatis. Bagikan tautan ruangan — teman Anda cukup membukanya.",
  keywords: ["VuCall", "video call", "WebRTC", "Next.js", "TypeScript"],
  authors: [{ name: "VuCall" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "VuCall — 1:1 Video Call",
    description: "Panggilan video 1:1 yang tidak gampang terputus.",
    siteName: "VuCall",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VuCall — 1:1 Video Call",
    description: "Panggilan video 1:1 yang tidak gampang terputus.",
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
        className={`${dmSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
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
