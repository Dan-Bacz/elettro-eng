import Link from "next/link"
import type { Service } from "./siteData"

export default function ServiceCard({ service, imageUrl, detailsHref, actionLabel = "What's Included?" }: { service: Service; imageUrl?: string; detailsHref?: string; actionLabel?: string }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(15,23,42,.75)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-yellow-300 hover:shadow-[0_26px_45px_-25px_rgba(15,23,42,.5)]">
      <div className="relative h-48 w-full overflow-hidden bg-slate-900">
        {imageUrl ? (
          <img src={imageUrl} alt={service.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b1118] to-[#0b5360] text-6xl">
            {service.icon}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#071117]/80 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-sm">Explore service</span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-black text-slate-900">{service.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{service.short}</p>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <Link
            href={detailsHref || `/services/${service.slug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-yellow-400 hover:text-black"
          >
            {actionLabel}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
