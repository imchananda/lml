import type { Metadata } from "next"
import { Sarabun, Inter } from "next/font/google"
import "./globals.css"
import { TopBar } from "@/components/layout/TopBar"
import { Sidebar } from "@/components/layout/Sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeWrapper } from "@/components/layout/ThemeWrapper"
import { Toaster } from "@/components/ui/sonner"
import { AppLockProvider } from "@/components/auth/AppLockProvider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const sarabun = Sarabun({ 
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
})

export const metadata: Metadata = {
  title: "LiveMyLife — Premium Personal Life Hub",
  description: "Manage your Finance, Health, Study, and Todo list all in one place.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" suppressHydrationWarning className={`${inter.variable} ${sarabun.variable}`}>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeWrapper>
            <AppLockProvider>
              <div className="hidden md:block">
                <Sidebar />
              </div>
              <div className="flex flex-1 flex-col overflow-hidden relative">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
                  {children}
                </main>
              </div>
            </AppLockProvider>
          </ThemeWrapper>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
