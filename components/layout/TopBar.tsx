"use client"

import { Menu, Moon, Sun, Bell, LayoutDashboard, Heart, GraduationCap, ListTodo, Wallet, Settings } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Sidebar } from "./Sidebar"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { getActiveModule } from "./ModuleSwitcher"

// Cache duration: don't re-fetch within this window (ms)
const CACHE_TTL = 60_000 // 60 seconds

export function TopBar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const activeModule = getActiveModule(pathname)

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<{ name: string | null; image: string | null } | null>(null)

  // Cache timestamps
  const lastProfileFetch = useRef(0)
  const lastNotifFetch = useRef(0)
  const profileFetched = useRef(false)

  // Fetch user profile (with cache)
  const fetchProfile = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && profileFetched.current && now - lastProfileFetch.current < CACHE_TTL) return
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setUserProfile({ name: data.name, image: data.image })
        lastProfileFetch.current = now
        profileFetched.current = true
      }
    } catch (e) {
      console.error("Failed to load profile:", e)
    }
  }, [])

  // Fetch notifications (with cache)
  const fetchNotifications = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && lastNotifFetch.current > 0 && now - lastNotifFetch.current < CACHE_TTL) return
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        setNotifications(await res.json())
        lastNotifFetch.current = now
      }
    } catch (e) {
      console.error("Failed to load notifications:", e)
    }
  }, [])

  // Initial load — fetch profile immediately, notifications lazy
  useEffect(() => {
    fetchProfile()
    // Delay notifications by 500ms to not block initial render
    const timer = setTimeout(() => fetchNotifications(), 500)

    const handleProfileUpdate = () => {
      fetchProfile(true) // force refresh
      fetchNotifications(true) // force refresh
    }
    window.addEventListener("profile-updated", handleProfileUpdate)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("profile-updated", handleProfileUpdate)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When notification dropdown is opened — refresh if stale
  useEffect(() => {
    if (notifOpen) {
      fetchNotifications()
    }
  }, [notifOpen, fetchNotifications])

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  const getInitials = (nameStr: string | null | undefined) => {
    if (!nameStr) return "JD"
    const trimmed = nameStr.trim()
    if (!trimmed) return "JD"
    const parts = trimmed.split(/\s+/)
    if (parts.length >= 2) {
      const p1 = parts[0][0] || ""
      const p2 = parts[1][0] || ""
      return (p1 + p2).toUpperCase()
    }
    return trimmed.slice(0, 2).toUpperCase()
  }

  // Dynamic branding for current module
  let moduleLabel = "Home Hub"
  let ModuleIcon = LayoutDashboard
  let moduleColorClass = "text-indigo-500"
  let avatarGradient = "from-indigo-400 to-purple-500"
  let avatarText = "text-indigo-600 dark:text-indigo-400"

  if (activeModule === "finance") {
    moduleLabel = "Finance Module"
    ModuleIcon = Wallet
    moduleColorClass = "text-emerald-500"
    avatarGradient = "from-emerald-400 to-teal-500"
    avatarText = "text-emerald-600 dark:text-emerald-400"
  } else if (activeModule === "health") {
    moduleLabel = "Health Module"
    ModuleIcon = Heart
    moduleColorClass = "text-amber-500"
    avatarGradient = "from-amber-400 to-orange-500"
    avatarText = "text-amber-600 dark:text-amber-400"
  } else if (activeModule === "study") {
    moduleLabel = "Study Module"
    ModuleIcon = GraduationCap
    moduleColorClass = "text-sky-500"
    avatarGradient = "from-sky-400 to-blue-500"
    avatarText = "text-sky-600 dark:text-sky-400"
  } else if (activeModule === "todo") {
    moduleLabel = "Todo List"
    ModuleIcon = ListTodo
    moduleColorClass = "text-violet-500"
    avatarGradient = "from-violet-400 to-fuchsia-500"
    avatarText = "text-violet-600 dark:text-violet-400"
  } else if (activeModule === "settings") {
    moduleLabel = "Settings"
    ModuleIcon = Settings
    moduleColorClass = "text-muted-foreground"
    avatarGradient = "from-gray-400 to-slate-500"
    avatarText = "text-gray-600 dark:text-gray-400"
  }

  const hasUnread = notifications.some(n => n.id !== 'life-welcome')

  return (
    <header className="glass flex h-16 items-center justify-between border-b-0 px-4 md:px-8 z-20 relative sticky top-0">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r-0 bg-transparent">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Module Label Display */}
        <div className="hidden sm:flex items-center gap-2 font-semibold text-sm bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 dark:border-white/5">
          <ModuleIcon className={`h-4 w-4 ${moduleColorClass}`} />
          <span className="text-foreground/95">{moduleLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-[#111219]"></span>
          )}
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        )}

        <div className={`h-9 w-9 ml-2 overflow-hidden rounded-full bg-gradient-to-tr ${avatarGradient} p-[2px] shadow-sm cursor-pointer hover:shadow-md transition-all`}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-black text-sm font-bold overflow-hidden">
            {userProfile?.image ? (
              <img src={userProfile.image} alt="Profile" className="h-full w-full object-cover rounded-full" />
            ) : (
              <span className={avatarText}>{getInitials(userProfile?.name)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown Click Overlay */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
      )}

      {/* Notifications Dropdown */}
      {notifOpen && (
        <div className="absolute right-6 md:right-8 top-14 w-80 rounded-2xl border border-white/10 bg-white/95 dark:bg-[#111219]/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 dark:border-white/5">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">แจ้งเตือน (Notifications)</span>
            <button 
              onClick={() => setNotifOpen(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground hover:font-bold transition-colors"
            >
              ปิด
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2.5 divide-y divide-white/5 dark:divide-white/5">
            {notifications.map((n, idx) => (
              <div key={n.id} className={`text-xs flex gap-2.5 items-start pt-2.5 ${idx === 0 ? 'pt-0' : ''}`}>
                <span className="text-base leading-none">
                  {n.type === 'finance' ? '💰' : n.type === 'health' ? '💪' : n.type === 'study' ? '📚' : n.type === 'todo' ? '✅' : '🔔'}
                </span>
                <div className="flex-1 space-y-0.5">
                  <p className={`font-semibold ${n.severity === 'error' ? 'text-red-500 font-bold' : n.severity === 'warning' ? 'text-amber-500 font-bold' : 'text-foreground'}`}>{n.title}</p>
                  <p className="text-muted-foreground text-[11px] leading-normal">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
