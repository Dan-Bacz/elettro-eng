import { STATUS_COLORS } from './types'

const LABELS: Record<string, string> = {
  PENDING: 'Under Review',
}

export default function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.PENDING
  const label = LABELS[status] || status
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${color}`}>
      {label}
    </span>
  )
}