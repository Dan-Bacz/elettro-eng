import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  icon?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-yellow-400 text-xl shadow">{icon}</div>}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}