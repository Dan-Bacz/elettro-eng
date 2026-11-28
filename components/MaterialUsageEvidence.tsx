export default function MaterialUsageEvidence({ usageId }: { usageId: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {(['receipt', 'product'] as const).map(photo => (
        <a key={photo} href={`/api/project-material-usage?usageId=${encodeURIComponent(usageId)}&photo=${photo}`} className="rounded-lg border border-cyan-200 bg-white px-2 py-1 text-xs font-semibold text-cyan-800">
          View {photo} photo
        </a>
      ))}
    </div>
  )
}
