'use client'

type FilterBarProps<T extends string> = {
  options: { value: T | 'ALL'; label: string }[]
  value: T | 'ALL'
  onChange: (value: T | 'ALL') => void
}

export default function FilterBar<T extends string>({ options, value, onChange }: FilterBarProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
            value === opt.value
              ? 'bg-black text-yellow-400 shadow'
              : 'border border-slate-200 bg-white text-slate-500 hover:border-yellow-400 hover:text-yellow-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}