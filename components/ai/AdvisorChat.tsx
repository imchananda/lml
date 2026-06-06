"use client"
// @ts-nocheck
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bot, Send, Loader2, User } from "lucide-react"
import { useChat, UIMessage } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

export function AdvisorChat() {
  const [open, setOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/finance/chat',
    }),
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'สวัสดีครับ! ผม LiveMyLife Advisor ผู้ช่วยอัจฉริยะส่วนตัวของคุณ 👋\n\nผมสามารถให้คำปรึกษาและคำแนะนำคุณได้ทุกเรื่อง ทั้งการวางแผนการเงิน 💰, การดูแลสุขภาพและการลดน้ำหนัก 💪, การวางแผนการเรียนต่อ ป.โท จุฬาฯ 📚 รวมถึงติดตามและช่วยจัดการภารกิจ To-do รายวัน ✅ ถามคำถามที่คุณสงสัยเข้ามาได้เลยครับ!',
          },
        ],
      },
    ] as UIMessage[],
  })

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const handleOpen = () => setOpen(true)
  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'สวัสดีครับ! ผม LiveMyLife Advisor ผู้ช่วยอัจฉริยะส่วนตัวของคุณ 👋\n\nผมสามารถให้คำปรึกษาและคำแนะนำคุณได้ทุกเรื่อง ทั้งการวางแผนการเงิน 💰, การดูแลสุขภาพและการลดน้ำหนัก 💪, การวางแผนการเรียนต่อ ป.โท จุฬาฯ 📚 รวมถึงติดตามและช่วยจัดการภารกิจ To-do รายวัน ✅ ถามคำถามที่คุณสงสัยเข้ามาได้เลยครับ!',
          },
        ],
      },
    ] as UIMessage[])
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-white shadow-2xl shadow-violet-500/30 transition-all duration-300 hover:scale-105 hover:shadow-violet-500/50 active:scale-95 group"
        title="เปิด LiveMyLife Advisor"
      >
        <Bot className="h-5 w-5 group-hover:animate-bounce" />
        <span className="text-sm font-semibold">LiveMyLife Advisor</span>
      </button>

      {/* Chat Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] h-[600px] flex flex-col p-0 gap-0 glass-card border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold">LiveMyLife Advisor</DialogTitle>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs text-muted-foreground">พร้อมให้คำแนะนำในทุกเรื่อง</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7"
              onClick={handleClearChat}
            >
              ล้างประวัติ
            </Button>
          </DialogHeader>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : 'bg-gradient-to-br from-violet-500 to-indigo-600'
                }`}>
                  {msg.role === 'user'
                    ? <User className="h-4 w-4" />
                    : <Bot className="h-4 w-4 text-white" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/15 text-foreground rounded-tr-sm'
                    : 'bg-secondary/60 text-foreground rounded-tl-sm'
                }`}>
                  {msg.parts.map((part, idx) => 
                    part.type === 'text' ? <span key={idx}>{part.text}</span> : null
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {(status === 'submitted' || status === 'streaming') && (
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!chatInput.trim() || status === 'submitted' || status === 'streaming') return
              sendMessage({ text: chatInput })
              setChatInput("")
            }}
            className="px-4 py-4 border-t border-white/10 bg-background/50 flex gap-2 shrink-0"
          >
            <Input
              id="advisor-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="ถามเกี่ยวกับการเงิน สุขภาพ เรียนต่อ ป.โท หรือภารกิจได้เลย..."
              className="flex-1 h-11 rounded-xl bg-secondary/50 border-white/10 focus-visible:ring-violet-500/30"
              disabled={status === 'submitted' || status === 'streaming'}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={status === 'submitted' || status === 'streaming' || !chatInput.trim()}
              className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 p-0"
            >
              {(status === 'submitted' || status === 'streaming')
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

