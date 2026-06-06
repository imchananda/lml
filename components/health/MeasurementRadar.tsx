"use client"

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts"
import { useMemo } from "react"

type MeasurementRadarProps = {
  measurements: {
    waist?: number | null
    hip?: number | null
    chest?: number | null
    arms?: number | null
    thighs?: number | null
    calves?: number | null
  } | null
}

export function MeasurementRadar({ measurements }: MeasurementRadarProps) {
  const chartData = useMemo(() => {
    if (!measurements) return []

    return [
      { subject: "รอบอก (Chest)", value: measurements.chest || 0 },
      { subject: "รอบเอว (Waist)", value: measurements.waist || 0 },
      { subject: "สะโพก (Hip)", value: measurements.hip || 0 },
      { subject: "ต้นขา (Thigh)", value: measurements.thighs || 0 },
      { subject: "น่อง (Calf)", value: measurements.calves || 0 },
      { subject: "ต้นแขน (Arm)", value: measurements.arms || 0 },
    ]
  }, [measurements])

  if (!measurements) {
    return (
      <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
        ไม่มีข้อมูลสัดส่วนร่างกาย
      </div>
    )
  }

  return (
    <div className="h-[250px] w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid className="stroke-muted/30" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 120]} 
            tick={{ fontSize: 8 }}
            axisLine={false}
          />
          <Radar
            name="ขนาด (ซม.)"
            dataKey="value"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.3}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: "12px", 
              border: "1px solid rgba(255,255,255,0.1)", 
              background: "rgba(15,15,20,0.9)", 
              color: "#fff" 
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
