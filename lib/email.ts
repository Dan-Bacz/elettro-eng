import nodemailer from 'nodemailer'
import dns from 'dns/promises'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lanzaderasjezamae959@gmail.com'
const SMTP_HOST = 'smtp.gmail.com'
const ADMIN_NOTIFICATION_MAX_ATTEMPTS = 2

let cachedIpv4: string | null = null
let cachedIpv4At = 0

async function getIpv4Host() {
  const cacheMs = 5 * 60 * 1000
  if (cachedIpv4 && Date.now() - cachedIpv4At < cacheMs) return cachedIpv4
  try {
    const addresses = await dns.resolve4(SMTP_HOST)
    cachedIpv4 = addresses[0]
    cachedIpv4At = Date.now()
  } catch {
    cachedIpv4 = SMTP_HOST
  }
  return cachedIpv4 ?? SMTP_HOST
}

async function getTransporter() {
  const host = await getIpv4Host()
  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    tls: {
      servername: SMTP_HOST
    },
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Email send timed out')), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://elettro-eng-one.vercel.app'
}

export async function sendAdminRegistrationNotification(user: { name: string; email: string; phone?: string | null }) {
  for (let attempt = 1; attempt <= ADMIN_NOTIFICATION_MAX_ATTEMPTS; attempt++) {
    try {
      const transporter = await getTransporter()
      await withTimeout(transporter.sendMail({
        from: `${process.env.GMAIL_USER || 'Elettro Engineering'} <${process.env.GMAIL_USER || 'noreply@elettro.com'}>`,
        to: ADMIN_EMAIL,
        subject: 'New Technician Registration Pending Approval - Elettro',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0B0F10; padding: 20px; text-align: center;">
            <h1 style="color: #F5C400; margin: 0; font-size: 24px;">ELETTRO</h1>
            <p style="color: #9EA8AC; margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">ENGINEERING ENTERPRISES</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #111; margin-top: 0;">New Technician Registration</h2>
            <p style="color: #555; font-size: 14px;">A new technician has registered and is awaiting your approval.</p>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong style="color: #333;">Name:</strong> ${user.name}</p>
              <p style="margin: 8px 0;"><strong style="color: #333;">Email:</strong> ${user.email}</p>
              ${user.phone ? `<p style="margin: 8px 0;"><strong style="color: #333;">Phone:</strong> ${user.phone}</p>` : ''}
              <p style="margin: 8px 0;"><strong style="color: #333;">Role:</strong> Technician</p>
            </div>
            <p style="color: #555; font-size: 14px;">Log in to the admin dashboard to approve or reject this registration.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${getAppUrl()}/admin" style="background-color: #F5C400; color: #111; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Open Admin Dashboard</a>
            </div>
          </div>
          <div style="background-color: #0B0F10; padding: 15px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 11px;">Elettro Engineering Enterprises - Automated Notification</p>
          </div>
        </div>
      `
      }), 25000)
      return
    } catch (error: any) {
      cachedIpv4 = null
      if (attempt === ADMIN_NOTIFICATION_MAX_ATTEMPTS) {
        console.error(`Failed to send admin registration notification email (attempt ${attempt}):`, error)
      }
    }
  }
}

export async function sendTechnicianApprovalNotification(user: { name: string; email: string }) {
  for (let attempt = 1; attempt <= ADMIN_NOTIFICATION_MAX_ATTEMPTS; attempt++) {
    try {
      const transporter = await getTransporter()
      await withTimeout(transporter.sendMail({
        from: `${process.env.GMAIL_USER || 'Elettro Engineering'} <${process.env.GMAIL_USER || 'noreply@elettro.com'}>`,
        to: user.email,
        subject: 'Your Elettro Technician Account Has Been Approved',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0B0F10; padding: 20px; text-align: center;">
            <h1 style="color: #F5C400; margin: 0; font-size: 24px;">ELETTRO</h1>
            <p style="color: #9EA8AC; margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">ENGINEERING ENTERPRISES</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #111; margin-top: 0;">Account Approved</h2>
            <p style="color: #555; font-size: 14px;">Good day <strong>${user.name}</strong>,</p>
            <p style="color: #555; font-size: 14px;">Congratulations! Your technician account registration has been <strong style="color: #22A66F;">approved</strong> by the administrator.</p>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong style="color: #333;">Email:</strong> ${user.email}</p>
              <p style="margin: 8px 0;"><strong style="color: #333;">Status:</strong> <span style="color: #22A66F; font-weight: bold;">APPROVED</span></p>
            </div>
            <p style="color: #555; font-size: 14px;">You may now log in to the Elettro app using the email and password you registered with.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${getAppUrl()}/login" style="background-color: #F5C400; color: #111; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Login to Your Account</a>
            </div>
          </div>
          <div style="background-color: #0B0F10; padding: 15px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 11px;">Elettro Engineering Enterprises - Automated Notification</p>
          </div>
        </div>
      `
      }), 25000)
      return
    } catch (error: any) {
      cachedIpv4 = null
      if (attempt === ADMIN_NOTIFICATION_MAX_ATTEMPTS) {
        console.error(`Failed to send technician approval notification email (attempt ${attempt}):`, error)
      }
    }
  }
}