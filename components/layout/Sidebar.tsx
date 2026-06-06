"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  CreditCard,
  ShieldCheck,
  PiggyBank,
  TrendingUp,
  Target,
  Umbrella,
  Calculator,
  Settings,
  Scale,
  Activity,
  Dumbbell,
  BookOpen,
  Calendar,
  Trophy,
  ListTodo,
  Home,
  Heart,
  GraduationCap
} from "lucide-react"
import { ModuleSwitcher, getActiveModule, moduleColors } from "./ModuleSwitcher"

const financeRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/finance" },
  { label: "Transactions", icon: Receipt, href: "/finance/transactions" },
  { label: "Budget", icon: Wallet, href: "/finance/budget" },
  { label: "Debt", icon: CreditCard, href: "/finance/debt" },
  { label: "Credit Bureau", icon: ShieldCheck, href: "/finance/credit-bureau" },
  { label: "Savings", icon: PiggyBank, href: "/finance/savings" },
  { label: "Investments", icon: TrendingUp, href: "/finance/investments" },
  { label: "Tax Planner", icon: Calculator, href: "/finance/tax-planner" },
  { label: "Goals", icon: Target, href: "/finance/goals" },
  { label: "Retirement", icon: Umbrella, href: "/finance/retirement" },
]

const healthRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/health" },
  { label: "Body Log", icon: Scale, href: "/health/log" },
  { label: "Calories", icon: Activity, href: "/health/calories" },
  { label: "Workouts", icon: Dumbbell, href: "/health/workouts" },
  { label: "Progress", icon: TrendingUp, href: "/health/progress" },
  { label: "Goals", icon: Target, href: "/health/goals" },
]

const studyRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/study" },
  { label: "Books", icon: BookOpen, href: "/study/books" },
  { label: "Progress", icon: TrendingUp, href: "/study/progress" },
  { label: "Schedule", icon: Calendar, href: "/study/schedule" },
  { label: "Scores", icon: Trophy, href: "/study/scores" },
]

const todoRoutes = [
  { label: "Today's Tasks", icon: ListTodo, href: "/todo" },
]

const homeRoutes = [
  { label: "Home Hub", icon: Home, href: "/" },
]

export function Sidebar() {
  const pathname = usePathname()
  const activeModule = getActiveModule(pathname)

  // Determine which routes to display
  let routes = homeRoutes
  if (activeModule === "finance") routes = financeRoutes
  else if (activeModule === "health") routes = healthRoutes
  else if (activeModule === "study") routes = studyRoutes
  else if (activeModule === "todo") routes = todoRoutes

  // Determine active item styles
  let activeStyles = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
  let activeIconStyles = "text-indigo-600 dark:text-indigo-400"
  let logoColorStyles = "from-indigo-500 to-purple-600"
  
  if (activeModule !== "home" && activeModule !== "settings") {
    const modStyles = moduleColors[activeModule]
    activeStyles = `${modStyles.bg} ${modStyles.iconColor} ${modStyles.border}`
    activeIconStyles = modStyles.iconColor
    
    if (activeModule === "finance") logoColorStyles = "from-emerald-400 to-teal-600 shadow-emerald-500/20"
    else if (activeModule === "health") logoColorStyles = "from-amber-400 to-yellow-600 shadow-amber-500/20"
    else if (activeModule === "study") logoColorStyles = "from-sky-400 to-blue-600 shadow-sky-500/20"
    else if (activeModule === "todo") logoColorStyles = "from-violet-400 to-purple-600 shadow-violet-500/20"
  }

  return (
    <div className="glass flex h-full w-72 flex-col overflow-y-auto border-r-0 border-white/20 px-4 py-6 dark:border-white/5 relative z-20">
      <Link href="/" className="mb-6 px-2 flex items-center gap-3 group">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-105",
          logoColorStyles
        )}>
          {activeModule === "finance" && <Wallet className="h-5 w-5 text-white animate-pulse" />}
          {activeModule === "health" && <Heart className="h-5 w-5 text-white animate-pulse" />}
          {activeModule === "study" && <GraduationCap className="h-5 w-5 text-white animate-pulse" />}
          {activeModule === "todo" && <ListTodo className="h-5 w-5 text-white animate-pulse" />}
          {(activeModule === "home" || activeModule === "settings") && <Home className="h-5 w-5 text-white" />}
        </div>
        <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75">
          LiveMyLife
        </h1>
      </Link>

      <ModuleSwitcher />

      <nav className="flex-1 space-y-1.5">
        {routes.map((route) => {
          const active = pathname === route.href || (route.href !== "/" && pathname.startsWith(route.href + '/'))
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 border border-transparent",
                active 
                  ? cn(activeStyles, "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]") 
                  : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
              )}
            >
              <route.icon 
                className={cn(
                  "mr-3.5 h-5 w-5 flex-shrink-0 transition-all duration-300",
                  active 
                    ? cn(activeIconStyles, "scale-110") 
                    : "text-muted-foreground group-hover:text-foreground"
                )} 
              />
              {route.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-8 px-2 flex flex-col gap-1.5 border-t border-white/10 dark:border-white/5 pt-4">
        {activeModule !== "home" && (
          <Link
            href="/"
            className="group flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
          >
            <Home className="mr-3.5 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
            Home Hub
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            "group flex items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 border border-transparent",
            pathname === "/settings"
              ? "bg-white/10 dark:bg-white/5 text-foreground border-white/10"
              : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
          )}
        >
          <Settings className="mr-3.5 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground group-hover:rotate-45 transition-transform duration-500" />
          Settings
        </Link>
      </div>
    </div>
  )
}

