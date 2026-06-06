"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TransactionForm } from "@/components/forms/TransactionForm"
import { Plus, Search, Trash2, Edit2, Loader2, Download } from "lucide-react"
import { toast } from "sonner"

type Tx = {
  id: string; date: string; description: string; amount: number; type: string
  category?: { id: string; name: string; color: string } | null
}

export default function TransactionsPage() {
  const [open, setOpen] = useState(false)
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [editTx, setEditTx] = useState<Tx | null>(null)

  const fetchTxs = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/transactions')
      if (res.ok) setTxs(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchTxs() }, [fetchTxs])

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return
    try {
      await fetch(`/api/finance/transactions?id=${id}`, { method: "DELETE" })
      toast.success("Deleted!")
      fetchTxs()
    } catch { toast.error("Failed to delete") }
  }

  const filtered = txs.filter(tx => {
    if (typeFilter !== "all" && tx.type !== typeFilter.toUpperCase()) return false
    if (search && !(tx.description || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit">Transactions</h2>
          <p className="text-muted-foreground">Manage your income and expenses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10 bg-black/20" onClick={() => window.open('/api/finance/export/transactions', '_blank')}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md" />}>
              <Plus className="mr-2 h-4 w-4" />Add Transaction
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
            <DialogHeader>
              <DialogTitle>New Transaction</DialogTitle>
              <DialogDescription>Add a new income or expense.</DialogDescription>
            </DialogHeader>
            <TransactionForm onSuccess={() => { setOpen(false); fetchTxs() }} />
          </DialogContent>
        </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editTx} onOpenChange={(val) => !val && setEditTx(null)}>
          <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
            <DialogHeader>
              <DialogTitle>แก้ไขรายการ (Edit Transaction)</DialogTitle>
              <DialogDescription>แก้ไขข้อมูลรายรับ/รายจ่ายของคุณ</DialogDescription>
            </DialogHeader>
            {editTx && <TransactionForm initialData={editTx} onSuccess={() => { setEditTx(null); fetchTxs() }} />}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card shadow-lg shadow-black/5">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || '')}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 pt-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No transactions found. Add your first one!</div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="text-muted-foreground">{new Date(tx.date).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell className="font-medium">{tx.description || '—'}</TableCell>
                      <TableCell>
                        {tx.category ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: tx.category.color + '20', color: tx.category.color }}>
                            {tx.category.name}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditTx(tx)} className="p-1 rounded text-muted-foreground hover:text-blue-500 transition-colors"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(tx.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
