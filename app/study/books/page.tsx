"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookCard } from "@/components/study/BookCard"
import { BookForm } from "@/components/study/BookForm"
import { Plus, BookOpen, Loader2, ArrowLeft, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import Link from "next/link"

export default function StudyBooksPage() {
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Dialog state
  const [openForm, setOpenForm] = useState(false)
  const [editBook, setEditBook] = useState<any | null>(null)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/study/books")
      if (res.ok) {
        setBooks(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบหนังสือเล่มนี้ออกจากคลังใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/study/books?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบหนังสือออกจากคลังเรียบร้อยแล้ว!")
      fetchBooks()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  const filtered = books.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !(b.author || "").toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 hover:text-sky-500">
            <ArrowLeft className="h-3.5 w-3.5" />
            <Link href="/study">กลับแดชบอร์ดหลัก</Link>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-study inline-block w-fit">
            Books & Reading materials 📚
          </h2>
          <p className="text-muted-foreground">บันทึกหนังสือเอกสารสอบ ตำราเรียน และความก้าวหน้าในการอ่านวิชาต่างๆ</p>
        </div>

        <Button onClick={() => { setEditBook(null); setOpenForm(true); }} className="bg-sky-500 hover:bg-sky-600 text-white shadow-md">
          <Plus className="mr-1 h-4 w-4" /> เพิ่มหนังสือใหม่
        </Button>
      </div>

      {/* Filter and Search controls */}
      <Card className="glass-card shadow-lg border-white/10">
        <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="ค้นหาชื่อหนังสือ หรือผู้แต่ง..." 
              className="pl-9 bg-black/10 dark:bg-white/5 border-white/10 dark:border-white/5" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="w-[180px] bg-black/10 dark:bg-white/5 border-white/10 dark:border-white/5">
                <SelectValue placeholder="เลือกสถานะการอ่าน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด (All status)</SelectItem>
                <SelectItem value="NOT_STARTED">ยังไม่ได้เริ่มอ่าน (Not Started)</SelectItem>
                <SelectItem value="READING">กำลังอ่าน (Reading)</SelectItem>
                <SelectItem value="COMPLETED">อ่านเสร็จสิ้น (Completed)</SelectItem>
                <SelectItem value="ON_HOLD">ดองไว้ก่อน (On Hold)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Book Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card border-dashed border-white/20 p-12 text-center text-muted-foreground text-sm">
          ไม่พบหนังสือในคลัง ลองเพิ่มหนังสือใหม่เพื่อแสดงที่นี่
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onEdit={() => { setEditBook(book); setOpenForm(true); }} 
              onDelete={() => handleDelete(book.id)} 
              onProgressUpdated={fetchBooks}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if(!v) setEditBook(null); }}>
        <DialogContent className="sm:max-w-[450px] glass-card border-white/10 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBook ? "แก้ไขข้อมูลหนังสือ" : "เพิ่มหนังสือเรียนป.โท"}</DialogTitle>
            <DialogDescription>บันทึกชื่อหนังสือ วิชา จำนวนหน้า และเป้าหมายการอ่านสอบ</DialogDescription>
          </DialogHeader>
          <BookForm
            initialData={editBook}
            onSuccess={() => {
              setOpenForm(false);
              setEditBook(null);
              fetchBooks();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
