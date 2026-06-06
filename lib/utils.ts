import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency, minimumFractionDigits: 0
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(date))
}
