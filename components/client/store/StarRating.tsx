import { StarIcon } from "./storeIcons"

type Props = {
  rating?: number | null
  count?: number | null
  showCount?: boolean
  starClass?: string
}

export default function StarRating({ rating, count, showCount = true, starClass = "w-3.5 h-3.5" }: Props) {
  if (rating == null || Number(rating) <= 0) return null
  const r = Math.max(0, Math.min(5, Number(rating)))
  const full = Math.round(r)
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center" aria-label={`Rated ${r} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < full ? "text-yellow-500" : "text-gray-300"}>
            <StarIcon className={starClass} filled={i < full} />
          </span>
        ))}
      </div>
      {showCount && count != null && Number(count) > 0 && (
        <span className="text-xs font-medium text-gray-400">({Number(count).toLocaleString()})</span>
      )}
    </div>
  )
}