import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

function base(props: IconProps, children: ReactNode) {
  const { className, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export function InboxIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M3.5 7.5h17" />
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5V16a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z" />
      <path d="M3.5 7.5v4.5c1.6 0 2.4 1.4 3.5 2.4 1.1 1 2.3 1.6 5 1.6s3.9-.6 5-1.6c1.1-1 1.9-2.4 3.5-2.4V7.5" />
    </>
  )
}

export function ClockIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  )
}

export function GearIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8l1.4 2.6 2.9.6 1.2 2.7 2.7 1.2-.6 2.9 2.6 1.4-2.6 1.4.6 2.9-2.7 1.2-1.2 2.7-2.9.6-1.4 2.6-1.4-2.6-2.9-.6-1.2-2.7-2.7-1.2.6-2.9-2.6-1.4 2.6-1.4-.6-2.9 2.7-1.2 1.2-2.7 2.9-.6z" transform="translate(0 -0.4)" />
    </>
  )
}

export function CheckCircleIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </>
  )
}

export function CalendarIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  )
}

export function BellIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.5 5.5 2 6H4c.5-.5 2-1.5 2-6z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </>
  )
}

export function BarChartIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4.5 20.5V10" />
      <path d="M10 20.5V4.5" />
      <path d="M15.5 20.5v-7" />
      <path d="M21 20.5H3" />
    </>
  )
}

export function PackageIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" />
      <path d="M12 12.5L20 8M4 8l8 4.5M12 12.5V21" />
    </>
  )
}

export function UsersIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 5.5a3.2 3.2 0 0 1 0 5.6M17.5 15.4c1.9.7 3 2.3 3 4.6" />
    </>
  )
}

export function UserPlusIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5 5.5-5 1.6 0 3.2.6 4.3 1.6" />
      <path d="M18.5 13v6M15.5 16h6" />
    </>
  )
}

export function AlertIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 4.2L21.5 20H2.5z" />
      <path d="M12 10v4.2" />
      <circle cx="12" cy="16.8" r="0.4" fill="currentColor" stroke="none" />
    </>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4 12h15.5" />
      <path d="M14 6.5l5 5.5-5 5.5" />
    </>
  )
}

export function InboxTrayIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M3 13.5V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6.5" />
      <path d="M3 13.5H8a4 4 0 0 0 8 0h5" />
      <path d="M3 13.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5.5" />
    </>
  )
}

export function UserIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    </>
  )
}

export function SearchIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.5-4.5" />
    </>
  )
}

export function DocumentIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  )
}

export function SparkIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z" />
      <path d="M18.5 16.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
    </>
  )
}

export function ActivityIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M3 12h3.5l2.5-7 4 14 2.5-7H21" />
    </>
  )
}

export function PauseIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9.2v5.6M14 9.2v5.6" />
    </>
  )
}

export function CheckIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4.5 12.5l5 5L19.5 7" />
    </>
  )
}

export function HammerIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M14 4l6 6-3 .5L9.5 18a1.7 1.7 0 0 1-2.4 0l-1.6-1.6a1.7 1.7 0 0 1 0-2.4L13 6.5 14 4z" />
      <path d="M12 5l7 7M8.5 8.5L5 5" />
    </>
  )
}

export function FlagIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M5 21V4" />
      <path d="M5 5c2.5-1.7 5-.7 7.5.6 2.4 1.3 5 1.9 7.5.4v8c-2.5 1.5-5.1.9-7.5-.4C10 12.3 7.5 11.3 5 13" />
    </>
  )
}

export function NoteIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
    </>
  )
}

export function GridIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  )
}

export function LogoutIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  )
}

export function CartIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.46 1.18h7.8a1.5 1.5 0 0 0 1.46-1.18L19.5 9H6" />
    </>
  )
}