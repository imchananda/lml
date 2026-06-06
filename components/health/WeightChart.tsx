"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts"
import { useMemo } from "react"

type WeightChartProps = {
  data: {
    id: string
    date: string | Date
    weightKg: number
    bodyFatPct?: number | null
  }[]
  goalWeight?: number | null
}

export function WeightChart({ data, goalWeight }: WeightChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
      "น้ำหนัก (kg)": item.weightKg,
      "ไขมัน (%)": item.bodyFatPct || null
    }))
  }, [data])

  // Dynamic axis range
  const weights = data.map(d => d.weightKg)
  if (goalWeight) weights.push(goalWeight)
  
  const minWeight = weights.length > 0 ? Math.floor(Math.min(...weights) - 3) : 50
  const maxWeight = weights.length > 0 ? Math.ceil(Math.max(...weights) + 3) : 100

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
          />
          <YAxis 
            domain={[minWeight, maxWeight]}
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
            tickFormatter={(v) => `${v} kg`}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: "12px", 
              border: "1px solid rgba(255,255,255,0.1)", 
              background: "rgba(15,15,20,0.9)", 
              color: "#fff" 
            }}
          />
          {goalWeight && (
            <ReferenceLine 
              y={goalWeight} 
              stroke="#ef4444" 
              strokeDasharray="4 4" 
              label={{ 
                value: `เป้าหมาย: ${goalWeight} kg`, 
                fill: "#ef4444", 
                fontSize: 10, 
                position: "top" 
              }} 
            />
          )}
          <Area 
            type="monotone" 
            dataKey="น้ำหนัก (kg)" 
            stroke="#f59e0b" 
            strokeWidth={2.5} 
            fill="url(#gradWeight)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
