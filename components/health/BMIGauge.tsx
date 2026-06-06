"use client"

type BMIGaugeProps = {
  bmi: number
}

export function BMIGauge({ bmi }: BMIGaugeProps) {
  // BMI range percentage logic for pointer placement
  // Let's assume gauge spans from BMI 15 to 35
  const minBmi = 15
  const maxBmi = 35
  const range = maxBmi - minBmi
  const percentage = Math.min(100, Math.max(0, ((bmi - minBmi) / range) * 100))

  return (
    <div className="space-y-4">
      {/* Visual Bar */}
      <div className="relative pt-6 pb-2">
        {/* Pointer */}
        <div 
          className="absolute top-0 flex flex-col items-center -translate-x-1/2 transition-all duration-1000 ease-out"
          style={{ left: `${percentage}%` }}
        >
          <span className="text-sm font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            {bmi.toFixed(1)}
          </span>
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-amber-500 mt-1" />
        </div>

        {/* Color Bar Segments */}
        <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner bg-secondary">
          <div className="h-full bg-blue-400" style={{ width: `${((18.5 - 15) / range) * 100}%` }} title="ผอมเกินไป (< 18.5)" />
          <div className="h-full bg-emerald-400" style={{ width: `${((23 - 18.5) / range) * 100}%` }} title="น้ำหนักปกติ (18.5 - 22.9)" />
          <div className="h-full bg-amber-400" style={{ width: `${((25 - 23) / range) * 100}%` }} title="น้ำหนักเกิน (23.0 - 24.9)" />
          <div className="h-full bg-orange-400" style={{ width: `${((30 - 25) / range) * 100}%` }} title="อ้วนระดับ 1 (25.0 - 29.9)" />
          <div className="h-full bg-red-400" style={{ width: `${((35 - 30) / range) * 100}%` }} title="อ้วนระดับ 2 (≥ 30)" />
        </div>
      </div>

      {/* Categories description label */}
      <div className="grid grid-cols-5 text-[9px] sm:text-xxs font-bold text-muted-foreground uppercase text-center tracking-wider gap-0.5">
        <span className="text-blue-400/90 bg-blue-500/5 p-1 rounded-l-md border-r border-border/10">ผอม</span>
        <span className="text-emerald-400/90 bg-emerald-500/5 p-1 border-r border-border/10">ปกติ</span>
        <span className="text-amber-400/90 bg-amber-500/5 p-1 border-r border-border/10">ท้วม</span>
        <span className="text-orange-400/90 bg-orange-500/5 p-1 border-r border-border/10">อ้วน</span>
        <span className="text-red-400/90 bg-red-500/5 p-1 rounded-r-md">อันตราย</span>
      </div>
    </div>
  )
}
