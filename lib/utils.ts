import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const STATUS_COLORS: Record<string, string> = {
  'Draft Intake': 'bg-gray-100 text-gray-700',
  'Review Running': 'bg-blue-100 text-blue-700',
  'Review Ready': 'bg-indigo-100 text-indigo-700',
  'Manager Reviewing': 'bg-yellow-100 text-yellow-700',
  'Redlines Approved': 'bg-green-100 text-green-700',
  'DOCX Generated': 'bg-emerald-100 text-emerald-700',
  'Sent to Brand': 'bg-purple-100 text-purple-700',
  'Brand Response Received': 'bg-orange-100 text-orange-700',
  'Finalized': 'bg-gray-800 text-white',
}

export const PRIORITY_COLORS: Record<string, string> = {
  'Must-Have': 'bg-red-100 text-red-700 border-red-200',
  'Nice-to-Have': 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

export const ACTION_COLORS: Record<string, string> = {
  'Add': 'bg-green-100 text-green-700',
  'Delete': 'bg-red-100 text-red-700',
  'Replace': 'bg-blue-100 text-blue-700',
  'Modify': 'bg-orange-100 text-orange-700',
}
