"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, Zap, Brain } from "lucide-react"

type InsightType = 'MONTHLY_CASHFLOW' | 'PORTFOLIO_HEALTH' | 'TAX_ALERT' | 'DEBT_ALERT'

type InsightData = {
  summary: string
  severity: 'good' | 'warning' | 'critical'
  items: { icon: string; text: string }[]
  cached?: boolean
}

const typeConfig: Record<InsightType, {
  label: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  borderColor: string
}> = {
  MONTHLY_CASHFLOW: {
    label: 'Cashflow วิเคราะห์',
    icon: Brain,
    gradientFrom: 'from-emerald-500/5',
    gradientTo: 'to-teal-500/5',
    borderColor: 'border-emerald-500/20',
  },
  PORTFOLIO_HEALTH: {
    label: 'สุขภาพพอร์ต',
    icon: Zap,
    gradientFrom: 'from-blue-500/5',
    gradientTo: 'to-indigo-500/5',
    borderColor: 'border-blue-500/20',
  },
  TAX_ALERT: {
    label: 'แจ้งเตือนภาษี',
    icon: AlertTriangle,
    gradientFrom: 'from-violet-500/5',
    gradientTo: 'to-purple-500/5',
    borderColor: 'border-violet-500/20',
  },
  DEBT_ALERT: {
    label: 'สถานะหนี้สิน',
    icon: CheckCircle2,
    gradientFrom: 'from-amber-500/5',
    gradientTo: 'to-orange-500/5',
    borderColor: 'border-amber-500/20',
  },
}

const severityStyle: Record<string, string> = {
  good:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
}
const severityLabel: Record<string, string> = {
  good: '✅ ดี', warning: '⚠️ ควรดูแล', critical: '🚨 ด่วน',
}

export function InsightWidget({ type }: { type: InsightType }) {
  const [insight, setInsight] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const config = typeConfig[type]
  const Icon   = config.icon

  const fetchInsight = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
      await fetch(`/api/finance/ai/insights?type=${type}`, { method: 'DELETE' })
    } else {
      setLoading(true)
    }
    try {
      const res = await fetch(`/api/finance/ai/insights?type=${type}`)
      if (res.ok) setInsight(await res.json())
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [type])

  useEffect(() => { fetchInsight() }, [fetchInsight])

  return (
    <Card className={`glass-card shadow-lg ${config.borderColor} bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} relative overflow-hidden`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${severityStyle[insight?.severity ?? 'warning'].split(' ')[0]}`}>
              <Icon className="h-4 w-4" style={{ color: 'currentColor' }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Advisor</p>
              <p className="text-sm font-bold">{config.label}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fetchInsight(true)}
            disabled={refreshing}
            title="Refresh insight"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2 mt-4">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
          </div>
        ) : insight ? (
          <div className="space-y-3">
            {/* Severity Badge */}
            <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${severityStyle[insight.severity]}`}>
              {severityLabel[insight.severity]}
            </span>

            {/* Summary */}
            <p className="text-sm text-foreground/80 leading-relaxed">{insight.summary}</p>

            {/* Items */}
            {insight.items?.length > 0 && (
              <ul className="space-y-1.5">
                {insight.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 mt-0.5">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}

            {insight.cached && (
              <p className="text-xs text-muted-foreground/50 italic">จากแคช · กด refresh เพื่อวิเคราะห์ใหม่</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่</p>
        )}
      </CardContent>
    </Card>
  )
}
