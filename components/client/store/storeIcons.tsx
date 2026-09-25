import type { ReactElement } from "react"
import type { StoreCategory } from "./storeUtils"

type IconProps = { className?: string }

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function GridIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function BreakerIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <line x1="8" y1="8.5" x2="11.5" y2="13" />
      <line x1="16" y1="8.5" x2="12.5" y2="13" />
      <line x1="8" y1="15.5" x2="16" y2="15.5" />
    </svg>
  )
}

export function CableIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M9 2v6a3 3 0 0 1-3 3 3 3 0 0 0-3 3v8h8v-8a3 3 0 0 0-3-3 3 3 0 0 1-3-3V2" />
      <path d="M15 2v6a3 3 0 0 1 3 3 3 3 0 0 0 3 3v8h-8v-8a3 3 0 0 1 3-3 3 3 0 0 0 3-3V2" />
    </svg>
  )
}

export function PanelIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="21" y2="12" />
    </svg>
  )
}

export function BulbIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 1 4.24 12.56c-.7.56-1.24 1.3-1.24 2.19v.25H9v-.25c0-.9-.54-1.63-1.24-2.19A7 7 0 0 1 12 2z" />
    </svg>
  )
}

export function SwitchIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="2" y="7" width="9" height="10" rx="2" />
      <rect x="13" y="7" width="9" height="10" rx="2" />
      <circle cx="17.5" cy="12" r="2" />
    </svg>
  )
}

export function ConduitIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M21 13.5c-4-.7-8-1.2-12-1.2" />
      <path d="M5 6.5C4 6.2 3 6 2 6v12c1 0 2-.2 3-.5l16-4.4v-2.1L5 6.5z" />
      <path d="M8 11.8V17" />
    </svg>
  )
}

export function ToolIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

export function BoxIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7l8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

export function StarIcon({ className = "w-4 h-4", filled = true }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function CartIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

export function TrashIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export function MinusIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M5 12h14" />
    </svg>
  )
}

export function PlusIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function SearchIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function TruckIcon({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

export function ShieldIcon({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function HeadsetIcon({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

export function SlidersIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </svg>
  )
}

export function CloseIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function CheckIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function categoryIcon(category: StoreCategory): (props: IconProps) => ReactElement {
  switch (category) {
    case "Circuit Breakers":
      return BreakerIcon
    case "Wires & Cables":
      return CableIcon
    case "Panels & Boards":
      return PanelIcon
    case "Lighting":
      return BulbIcon
    case "Switches & Outlets":
      return SwitchIcon
    case "Conduits & Fittings":
      return ConduitIcon
    case "Tools & Accessories":
      return ToolIcon
    case "Other":
      return BoxIcon
    default:
      return GridIcon
  }
}