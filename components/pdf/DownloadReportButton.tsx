"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"

// Lazy-load react-pdf renderer (it's heavy, client-only)
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then(m => m.PDFDownloadLink),
  { ssr: false }
)
const WealthReportPDF = dynamic(
  () => import("@/components/pdf/WealthReport").then(m => m.WealthReportPDF),
  { ssr: false }
)

export function DownloadReportButton() {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [step, setStep] = useState("")

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)

    try {
      setStep("กำลังรวบรวมข้อมูลทางการเงิน...")
      const res = await fetch("/api/finance/report")

      if (!res.ok) {
        const err = await res.json()
        if (res.status === 503) {
          toast.error("กรุณาตั้งค่า GEMINI_API_KEY ก่อนใช้งาน PDF Report")
        } else {
          toast.error("เกิดข้อผิดพลาด: " + (err.error || "Unknown"))
        }
        return
      }

      setStep("กำลังสร้างคำแนะนำจาก AI Advisor...")
      const data = await res.json()

      setStep("กำลังสร้าง PDF...")
      setReportData(data)

      toast.success("รายงานพร้อมดาวน์โหลดแล้ว! 📄")
    } catch (e: any) {
      toast.error("เกิดข้อผิดพลาด: " + e.message)
    } finally {
      setLoading(false)
      setStep("")
    }
  }

  const now = new Date()
  const filename = `MyWealth-Report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`

  if (reportData) {
    return (
      <PDFDownloadLink
        document={<WealthReportPDF context={reportData.context} advisorNote={reportData.advisorNote} />}
        fileName={filename}
        style={{ textDecoration: "none" }}
      >
        {({ loading: pdfLoading }) => (
          <Button
            className="h-10 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:opacity-90"
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> กำลัง Render PDF...</>
            ) : (
              <><Download className="h-4 w-4" /> ดาวน์โหลด Wealth Report PDF</>
            )}
          </Button>
        )}
      </PDFDownloadLink>
    )
  }

  return (
    <Button
      id="download-wealth-report"
      onClick={handleGenerate}
      disabled={loading}
      variant="outline"
      className="h-10 gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">{step || "กำลังโหลด..."}</span>
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Export Wealth Report
        </>
      )}
    </Button>
  )
}
