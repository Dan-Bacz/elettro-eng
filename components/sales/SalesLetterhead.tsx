import Image from 'next/image'

export default function SalesLetterhead() {
  return (
    <div className="flex items-center gap-3 print:w-full print:gap-[4mm] print:border-b-[1.5pt] print:border-[#222] print:pb-[3mm]">
      <Image
        className="sales-letterhead-logo h-10 w-10 rounded-lg bg-white object-contain print:h-[15mm] print:w-[15mm] print:rounded-none"
        src="/logo-elettro.jpg"
        alt=""
        width={64}
        height={64}
        loading="eager"
        unoptimized
      />
      <p className="text-sm font-bold print:text-[14pt] print:text-black">ELETTRO Engineering Enterprises</p>
    </div>
  )
}
