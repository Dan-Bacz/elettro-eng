import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon?: string
  title: string
  message?: string
  action?: ReactNode
}

export default function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-14 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="mt-3 text-sm font-bold text-slate-700">{title}</div>
      {message && <div className="mt-1 max-w-sm text-xs text-slate-400">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}