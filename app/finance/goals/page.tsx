"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Trophy, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { monthlyNeeded } from "@/lib/calculators/goals"

type Goal = {
  id: string; name: string; description: string | null; targetAmount: number
  savedAmount: number; deadline: string | null; priority: string
  status: string; color: string
}

export default function GoalsPage() {
  const [open, setOpen] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [priority, setPriority] = useState("MEDIUM")

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/goals')
      if (res.ok) setGoals(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/finance/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          targetAmount: Number(fd.get('targetAmount')),
          deadline: fd.get('deadline') || undefined,
          description: fd.get('description') || undefined,
          priority,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Goal created!')
      setOpen(false)
      fetchData()
    } catch { toast.error('Failed') }
    setFormLoading(false)
  }

  const priorityColors: Record<string, string> = { HIGH: 'text-red-500 bg-red-500/10', MEDIUM: 'text-amber-500 bg-amber-500/10', LOW: 'text-blue-500 bg-blue-500/10' }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit">Life Goals</h2>
          <p className="text-muted-foreground">Long-term milestones and gap analysis.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-cyan-600 hover:bg-cyan-700 shadow-md" />}>
            <Plus className="mr-2 h-4 w-4" />New Goal
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
            <DialogHeader><DialogTitle>สร้างเป้าหมายชีวิต (Life Goal)</DialogTitle><DialogDescription>กำหนดเป้าหมายเพื่อคำนวณเงินออมที่ต้องใช้ในแต่ละเดือน</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>ชื่อเป้าหมาย / Goal Name</Label>
                <Input name="name" required placeholder="เช่น รถในฝัน, เรียนต่อต่างประเทศ" />
              </div>
              <div className="space-y-2">
                <Label>รายละเอียด / Description</Label>
                <Input name="description" placeholder="Optional details (ระบุหรือไม่ก็ได้)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>เป้าหมาย (฿) / Target Amount</Label>
                  <p className="text-xs text-muted-foreground">จำนวนเงินที่ต้องการใช้</p>
                  <Input name="targetAmount" type="number" required placeholder="1000000" />
                </div>
                <div className="space-y-2">
                  <Label>ความสำคัญ / Priority</Label>
                  <p className="text-xs text-muted-foreground">ระดับความเร่งด่วน</p>
                  <Select value={priority} onValueChange={(val) => setPriority(val || '')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>วันที่ต้องการบรรลุเป้าหมาย / Target Date</Label>
                <p className="text-xs text-muted-foreground">ระบบจะใช้เพื่อคำนวณว่าคุณต้องเก็บเงินเพิ่มเดือนละเท่าไหร่</p>
                <Input name="deadline" type="date" />
              </div>
              <Button type="submit" disabled={formLoading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white h-12 rounded-xl shadow-lg">
                {formLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create Goal
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">No goals yet. Set your first milestone!</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0
            const needed = g.deadline ? monthlyNeeded(g.targetAmount, g.savedAmount, g.deadline) : null

            return (
              <Card key={g.id} className="glass-card hover-lift overflow-hidden relative shadow-lg">
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(to right, ${g.color}, ${g.color}88)` }} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: g.color + '20' }}>
                      <Trophy className="h-5 w-5" style={{ color: g.color }} />
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${priorityColors[g.priority] || ''}`}>
                      {g.priority}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{g.name}</CardTitle>
                  {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                </CardHeader>
                <CardContent>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">฿{g.savedAmount.toLocaleString()} / ฿{g.targetAmount.toLocaleString()}</span>
                        <span className="font-bold">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/50">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                      </div>
                    </div>
                    {needed !== null && needed > 0 && (
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-sm font-medium">Gap Analysis</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Need to save <span className="text-emerald-500 font-bold">฿{Math.ceil(needed).toLocaleString()}/month</span> to reach by {new Date(g.deadline!).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
