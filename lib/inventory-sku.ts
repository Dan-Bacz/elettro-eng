export function inventorySkuPrefix(category: string | null | undefined): string {
  const value = (category || '').trim().toLowerCase()
  if (/wire|cable/.test(value)) return 'WIR'
  if (/breaker/.test(value)) return 'CB'
  if (/light/.test(value)) return 'LGT'
  if (/panel|board/.test(value)) return 'PNL'
  if (/switch|outlet/.test(value)) return 'SW'
  if (/conduit|fitting/.test(value)) return 'CNF'
  if (/tool|accessor/.test(value)) return 'TLS'
  return 'OTH'
}
