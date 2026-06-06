"use client"

import { usePathname } from "next/navigation"
import { getActiveModule } from "./ModuleSwitcher"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

const AdvisorChat = dynamic(
  () => import("@/components/ai/AdvisorChat").then(m => m.AdvisorChat),
  { ssr: false }
)

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeModule = getActiveModule(pathname)

  // Configure module-specific decorative blur colors
  let blur1 = "bg-indigo-500/10 dark:bg-indigo-500/5"
  let blur2 = "bg-purple-500/10 dark:bg-purple-500/5"
  let bgClass = "gradient-bg"
  let selectionClass = "selection:bg-indigo-500/30"

  if (activeModule === "finance") {
    blur1 = "bg-emerald-500/15 dark:bg-emerald-500/5"
    blur2 = "bg-teal-500/15 dark:bg-teal-500/5"
    bgClass = "gradient-bg-finance"
    selectionClass = "selection:bg-emerald-500/30"
  } else if (activeModule === "health") {
    blur1 = "bg-amber-500/15 dark:bg-amber-500/5"
    blur2 = "bg-orange-500/15 dark:bg-orange-500/5"
    bgClass = "gradient-bg-health"
    selectionClass = "selection:bg-amber-500/30"
  } else if (activeModule === "study") {
    blur1 = "bg-sky-500/15 dark:bg-sky-500/5"
    blur2 = "bg-blue-500/15 dark:bg-blue-500/5"
    bgClass = "gradient-bg-study"
    selectionClass = "selection:bg-sky-500/30"
  } else if (activeModule === "todo") {
    blur1 = "bg-violet-500/15 dark:bg-violet-500/5"
    blur2 = "bg-fuchsia-500/15 dark:bg-fuchsia-500/5"
    bgClass = "gradient-bg-todo"
    selectionClass = "selection:bg-violet-500/30"
  }

  return (
    <div className={cn("min-h-screen text-foreground antialiased font-sans transition-colors duration-500", bgClass, selectionClass)}>
      <div className="flex h-screen overflow-hidden">
        {children}
      </div>
      {/* Dynamic Background Blurs */}
      <div className={cn("absolute top-0 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-1000 z-0", blur1)} />
      <div className={cn("absolute bottom-0 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-1000 z-0", blur2)} />
      <AdvisorChat />
    </div>
  )
}
