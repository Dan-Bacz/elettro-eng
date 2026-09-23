'use client'
import type { ReactNode } from 'react'
import { InboxTrayIcon, CheckCircleIcon, UserIcon, GearIcon, CheckIcon } from '../../admin/icons'

type FlowStep = {
  status: string
  label: string
  count: number
  latestAt: string | null
}

const STEP_STYLE: Record<string, { icon: ReactNode; color: string; ring: string; bar: string }> = {
  PENDING: { icon: <InboxTrayIcon className="h-5 w-5" />, color: 'bg-amber-500', ring: 'ring-amber-200', bar: 'bg-amber-400' },
  APPROVED: { icon: <CheckIcon className="h-5 w-5" />, color: 'bg-blue-500', ring: 'ring-blue-200', bar: 'bg-blue-400' },
  ASSIGNED: { icon: <UserIcon className="h-5 w-5" />, color: 'bg-violet-500', ring: 'ring-violet-200', bar: 'bg-violet-400' },
  IN_PROGRESS: { icon: <GearIcon className="h-5 w-5" />, color: 'bg-emerald-500', ring: 'ring-emerald-200', bar: 'bg-emerald-400' },
  COMPLETED: { icon: <CheckCircleIcon className="h-5 w-5" />, color: 'bg-purple-600', ring: 'ring-purple-200', bar: 'bg-purple-400' },
}

function timeAgo(iso: string | null) {
  if (!iso) return 'no activity'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function ActivityFlow({ steps }: { steps: FlowStep[] }) {
  const total = steps.reduce((s, st) => s + st.count, 0)

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-bold text-slate-500">{total} bookings in the pipeline</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[560px] items-start">
          {steps.map((step, i) => {
            const s = STEP_STYLE[step.status] || STEP_STYLE.PENDING
            const isLast = i === steps.length - 1
            return (
              <div key={step.status} className="flex flex-1 items-start">
                <div className="flex flex-col items-center px-1">
                  <div
                    className={`relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md ${s.color} ring-4 ${s.ring} transition-transform duration-300 hover:scale-110`}
                    style={{ animation: `flow-pop 0.6s ease ${i * 0.12}s both` }}
                  >
                    {s.icon}
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-slate-800 shadow">
                      {step.count}
                    </span>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-[11px] font-bold text-slate-700">{step.label}</div>
                    <div className="text-[10px] font-medium text-slate-400">{timeAgo(step.latestAt)}</div>
                  </div>
                </div>
                {!isLast && (
                  <div className="relative mt-6 flex h-1.5 flex-1 items-center overflow-visible px-1">
                    <div className={`h-1 w-full rounded-full ${s.bar} opacity-30`}>
                      <div
                        className="h-1 rounded-full"
                        style={{ animation: 'flow-beam 1.8s linear infinite' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}