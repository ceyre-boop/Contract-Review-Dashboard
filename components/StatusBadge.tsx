import { cn, STATUS_COLORS, PRIORITY_COLORS, ACTION_COLORS } from '@/lib/utils'
import type { ReviewStatus, RedlinePriority, RedlineAction } from '@/types/database'

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[status])}>
      {status}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: RedlinePriority }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', PRIORITY_COLORS[priority])}>
      {priority}
    </span>
  )
}

export function ActionBadge({ action }: { action: RedlineAction }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', ACTION_COLORS[action])}>
      {action}
    </span>
  )
}
