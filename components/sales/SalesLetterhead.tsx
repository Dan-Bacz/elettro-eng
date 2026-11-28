import Image from 'next/image'

export default function SalesLetterhead() {
  return (
    <div className="elettro-letterhead flex items-center gap-3">
      <Image
        className="sales-letterhead-logo h-10 w-10 rounded-lg bg-white object-contain"
        src="/logo-elettro.jpg"
        alt=""
        width={64}
        height={64}
        loading="eager"
        unoptimized
      />
      <p className="elettro-letterhead-company text-sm font-bold">ELETTRO Engineering Enterprises</p>
    </div>
  )
}
