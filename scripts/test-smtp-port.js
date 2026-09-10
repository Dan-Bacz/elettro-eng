const dns = require('dns')
const net = require('net')

async function resolveIpv4(host) {
  return new Promise((resolve, reject) => {
    dns.resolve4(host, (err, addresses) => err ? reject(err) : resolve(addresses))
  })
}

function tryConnect(host, port, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timer = setTimeout(() => {
      socket.destroy()
      resolve({ host, port, ok: false, error: 'timeout' })
    }, timeoutMs)
    socket.setTimeout(timeoutMs)
    socket.on('timeout', () => { clearTimeout(timer); socket.destroy(); resolve({ host, port, ok: false, error: 'timeout' }) })
    socket.on('connect', () => { clearTimeout(timer); socket.destroy(); resolve({ host, port, ok: true }) })
    socket.on('error', (e) => { clearTimeout(timer); socket.destroy(); resolve({ host, port, ok: false, error: e.code || e.message }) })
    socket.connect(port, host)
  })
}

async function main() {
  let addrs
  try {
    addrs = await resolveIpv4('smtp.gmail.com')
  } catch (e) {
    console.log('DNS resolve4 failed:', e.message)
    return
  }
  console.log('smtp.gmail.com IPv4 addresses:', addrs)
  for (const port of [465, 587, 25]) {
    for (const addr of addrs.slice(0, 2)) {
      const r = await tryConnect(addr, port)
      console.log(`port ${port} -> ${r.host}: ${r.ok ? 'CONNECT OK' : 'FAILED (' + r.error + ')'}`)
    }
  }
}

main()