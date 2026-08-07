import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getOrderStatusColor(status: string) {
  const map: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    review: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

export function getPriorityColor(priority: string) {
  const map: Record<string, string> = {
    normal: 'bg-gray-100 text-gray-600',
    same_day: 'bg-red-100 text-red-700',
    priority_24h: 'bg-orange-100 text-orange-700',
    priority_48h: 'bg-yellow-100 text-yellow-700',
  }
  return map[priority] ?? 'bg-gray-100 text-gray-600'
}

export function getPriorityLabel(priority: string) {
  const map: Record<string, string> = {
    normal: 'Normal',
    same_day: 'Same Day',
    priority_24h: '24 Hour',
    priority_48h: '48 Hour',
  }
  return map[priority] ?? priority
}
