import Link from "next/link"
import type { Service } from "./siteData"

export default function ServiceCard({ service, imageUrl }: { service: Service; imageUrl?: string }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative w-full h-44 overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-black to-[#1a2029] flex items-center justify-center text-6xl">
            {service.icon}
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900">{service.title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed flex-1">{service.short}</p>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <Link
            href={`/services/${service.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-yellow-600 hover:text-black transition-colors"
          >
            View Details
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}