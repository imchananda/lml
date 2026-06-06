"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Wallet, Heart, GraduationCap, ListTodo } from "lucide-react"

export type ModuleType = "finance" | "health" | "study" | "todo" | "home" | "settings"

export function getActiveModule(pathname: string): ModuleType {
  if (pathname.startsWith("/finance")) return "finance"
  if (pathname.startsWith("/health")) return "health"
  if (pathname.startsWith("/study")) return "study"
  if (pathname.startsWith("/todo")) return "todo"
  if (pathname.startsWith("/settings")) return "settings"
  return "home"
}

export const moduleColors: Record<Exclude<ModuleType, "home" | "settings">, {
  color: string
  bg: string
  glow: string
  textGradient: string
  border: string
  hover: string
  iconColor: string
}> = {
  finance: {
    color: "emerald",
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.35)] dark:shadow-[0_0_20px_rgba(52,211,153,0.25)]",
    textGradient: "text-gradient-finance",
    border: "border-emerald-500/30 dark:border-emerald-400/20",
    hover: "hover:bg-emerald-500/5 hover:text-emerald-500 dark:hover:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
  health: {
    color: "amber",
    bg: "bg-amber-500/10 dark:bg-amber-400/10",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.35)] dark:shadow-[0_0_20px_rgba(251,191,36,0.25)]",
    textGradient: "text-gradient-health",
    border: "border-amber-500/30 dark:border-amber-400/20",
    hover: "hover:bg-amber-500/5 hover:text-amber-500 dark:hover:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  study: {
    color: "sky",
    bg: "bg-sky-500/10 dark:bg-sky-400/10",
    glow: "shadow-[0_0_15px_rgba(14,165,233,0.35)] dark:shadow-[0_0_20px_rgba(56,189,248,0.25)]",
    textGradient: "text-gradient-study",
    border: "border-sky-500/30 dark:border-sky-400/20",
    hover: "hover:bg-sky-500/5 hover:text-sky-500 dark:hover:text-sky-400",
    iconColor: "text-sky-600 dark:text-sky-400"
  },
  todo: {
    color: "violet",
    bg: "bg-violet-500/10 dark:bg-violet-400/10",
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.35)] dark:shadow-[0_0_20px_rgba(167,139,250,0.25)]",
    textGradient: "text-gradient-todo",
    border: "border-violet-500/30 dark:border-violet-400/20",
    hover: "hover:bg-violet-500/5 hover:text-violet-500 dark:hover:text-violet-400",
    iconColor: "text-violet-600 dark:text-violet-400"
  }
}

const modules = [
  { id: "finance", label: "Finance", icon: Wallet, href: "/finance" },
  { id: "health", label: "Health", icon: Heart, href: "/health" },
  { id: "study", label: "Study", icon: GraduationCap, href: "/study" },
  { id: "todo", label: "Todo", icon: ListTodo, href: "/todo" }
] as const

export function ModuleSwitcher() {
  const pathname = usePathname()
  const activeModule = getActiveModule(pathname)

  return (
    <div className="w-full bg-black/5 dark:bg-white/5 border border-white/10 dark:border-white/5 p-1 rounded-2xl flex items-center justify-between gap-1 shadow-inner mb-6">
      {modules.map((mod) => {
        const isActive = activeModule === mod.id
        const styles = moduleColors[mod.id]
        
        return (
          <Link
            key={mod.id}
            href={mod.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all duration-300 relative group",
              isActive 
                ? cn(styles.bg, styles.glow, "border border-white/10 scale-105 font-semibold z-10")
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            title={mod.label}
          >
            <mod.icon 
              className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                isActive ? styles.iconColor : "text-muted-foreground"
              )} 
            />
            <span className="text-[10px] mt-1 tracking-wide font-medium hidden sm:inline-block">
              {mod.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
