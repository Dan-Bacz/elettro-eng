export function watchOrderUpdates(refresh: () => Promise<void>) {
  let pending = false
  async function check() {
    if (pending || document.visibilityState !== 'visible') return
    pending = true
    try {
      await refresh()
    } finally {
      pending = false
    }
  }
  const timer = window.setInterval(check, 5_000)
  window.addEventListener('focus', check)
  document.addEventListener('visibilitychange', check)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener('focus', check)
    document.removeEventListener('visibilitychange', check)
  }
}
