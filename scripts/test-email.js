const fs = require('fs')
const dns = require('dns').promises
const nodemailer = require('nodemailer')

function loadEnv(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
  }
  return env
}

async function getIpv4Host() {
  try {
    const addresses = await dns.resolve4('smtp.gmail.com')
    return addresses[0]
  } catch {
    return 'smtp.gmail.com'
  }
}

async function main() {
  const env = loadEnv('.env')
  const user = env.GMAIL_USER
  const pass = env.GMAIL_APP_PASSWORD

  console.log('GMAIL_USER:', user)
  console.log('GMAIL_APP_PASSWORD length:', pass ? pass.length : 0)

  if (!user || !pass) {
    console.log('ERROR: missing GMAIL_USER or GMAIL_APP_PASSWORD in .env')
    return
  }

  const host = await getIpv4Host()
  console.log('Pinning to IPv4 host:', host)

  const transporter = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    tls: { servername: 'smtp.gmail.com' },
    auth: { user, pass }
  })

  try {
    await transporter.verify()
    console.log('SMTP AUTH OK - credentials are valid')
  } catch (e) {
    console.log('SMTP AUTH FAILED:', e.message)
  }
}

main()