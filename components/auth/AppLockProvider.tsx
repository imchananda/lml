"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { Lock, Loader2, Eye, EyeOff, ShieldCheck, KeyRound } from "lucide-react"

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const SESSION_KEY = "app_unlocked"
const PUBLIC_PATHS = ["/login"]

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [locked, setLocked] = useState(true)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shake, setShake] = useState(false)
  
  // Set password mode (when user has no password yet)
  const [noPassword, setNoPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")

  const idleTimer = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if current page is public (no lock needed)
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Check session storage on mount
  useEffect(() => {
    if (isPublicPath) {
      setLocked(false)
      setChecking(false)
      return
    }
    const unlocked = sessionStorage.getItem(SESSION_KEY)
    if (unlocked === "true") {
      setLocked(false)
    }
    setChecking(false)
  }, [isPublicPath])

  // Focus input when lock screen shows
  useEffect(() => {
    if (locked && !checking && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [locked, checking])

  // Idle timeout — lock after inactivity
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY)
      setLocked(true)
      setPassword("")
      setError("")
    }, IDLE_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    if (locked || isPublicPath) return

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"]
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }))
    resetIdleTimer()

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [locked, isPublicPath, resetIdleTimer])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    // Set password mode
    if (noPassword) {
      if (password.length < 4) {
        setError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร")
        triggerShake()
        return
      }
      if (password !== confirmPassword) {
        setError("รหัสผ่านไม่ตรงกัน กรุณายืนยันอีกครั้ง")
        triggerShake()
        return
      }
      setLoading(true)
      try {
        const res = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        })
        if (res.ok) {
          sessionStorage.setItem(SESSION_KEY, "true")
          setLocked(false)
          setError("")
        } else {
          const data = await res.json()
          setError(data.error || "ตั้งรหัสผ่านไม่สำเร็จ")
          triggerShake()
        }
      } catch {
        setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
        triggerShake()
      } finally {
        setLoading(false)
      }
      return
    }

    // Verify password mode
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (data.noPassword) {
        setNoPassword(true)
        setError("")
        setPassword("")
        return
      }

      if (data.verified) {
        sessionStorage.setItem(SESSION_KEY, "true")
        setLocked(false)
        setError("")
      } else {
        setError("รหัสผ่านไม่ถูกต้อง")
        triggerShake()
        setPassword("")
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  // Don't render lock on public paths
  if (isPublicPath) return <>{children}</>

  // Still checking session
  if (checking) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  // Unlocked — show the app
  if (!locked) return <>{children}</>

  // Locked — show lock screen
  return (
    <>
      {/* Blurred app preview behind */}
      <div className="pointer-events-none select-none blur-lg opacity-30 saturate-50">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 dark:from-black/95 dark:via-zinc-950/95 dark:to-black/95 backdrop-blur-2xl" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-[100px]" />
        </div>

        {/* Lock card */}
        <div
          className={`relative w-full max-w-sm transition-transform ${shake ? "animate-[shake_0.6s_ease-in-out]" : ""}`}
        >
          <div className="bg-white/10 dark:bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 dark:border-white/5 shadow-2xl p-8 space-y-6">
            {/* Lock icon */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                  {noPassword ? (
                    <KeyRound className="h-8 w-8 text-emerald-400" />
                  ) : (
                    <Lock className="h-8 w-8 text-emerald-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">
                  {noPassword ? "ตั้งรหัสผ่านใหม่" : "LiveMyLife"}
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  {noPassword 
                    ? "กรุณาตั้งรหัสผ่านสำหรับปลดล็อกแอปพลิเคชัน" 
                    : "กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน"}
                </p>
              </div>
            </div>

            {/* Password form */}
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-3">
                {/* Password input */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError("") }}
                    placeholder={noPassword ? "ตั้งรหัสผ่านใหม่..." : "รหัสผ่าน..."}
                    autoFocus
                    className="w-full px-4 py-3.5 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Confirm password (only in set password mode) */}
                {noPassword && (
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError("") }}
                      placeholder="ยืนยันรหัสผ่าน..."
                      className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all text-base"
                    />
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <p className="text-red-400 text-sm text-center font-medium animate-in fade-in duration-200">
                  {error}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-emerald-500/50 disabled:to-teal-500/50 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    {noPassword ? "ตั้งรหัสผ่านและเข้าใช้งาน" : "ปลดล็อก"}
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-white/30 text-xs">
              ข้อมูลของคุณได้รับการปกป้องด้วยรหัสผ่าน
            </p>
          </div>
        </div>
      </div>

      {/* Shake animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </>
  )
}
