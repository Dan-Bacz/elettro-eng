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

export async function sendBookingSubmittedNotification(input: {
  name: string
  email: string
  service: string
  reference: string
  buildingType?: string
  offerings?: string[]
  preferredDate?: string
  preferredTime?: string
  address?: string
}) {
  for (let attempt = 1; attempt <= ADMIN_NOTIFICATION_MAX_ATTEMPTS; attempt++) {
    try {
      const transporter = await getTransporter()
      const details = [
        input.service ? `<p style="margin: 8px 0;"><strong style="color: #333;">Service:</strong> ${input.service}</p>` : '',
        input.buildingType ? `<p style="margin: 8px 0;"><strong style="color: #333;">Building Type:</strong> ${input.buildingType}</p>` : '',
        input.offerings && input.offerings.length
          ? `<p style="margin: 8px 0;"><strong style="color: #333;">Selected Offerings:</strong> ${input.offerings.join(', ')}</p>`
          : '',
        input.address ? `<p style="margin: 8px 0;"><strong style="color: #333;">Project Address:</strong> ${input.address}</p>` : '',
        input.preferredDate ? `<p style="margin: 8px 0;"><strong style="color: #333;">Preferred Date:</strong> ${input.preferredDate}</p>` : '',
        input.preferredTime ? `<p style="margin: 8px 0;"><strong style="color: #333;">Preferred Time:</strong> ${input.preferredTime}</p>` : '',
      ]
        .filter(Boolean)
        .join('')

      await withTimeout(transporter.sendMail({
        from: `${process.env.GMAIL_USER || 'Elettro Engineering'} <${process.env.GMAIL_USER || 'noreply@elettro.com'}>`,
        to: input.email,
        subject: `Booking Request Submitted - ${input.service} | Elettro`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0B0F10; padding: 20px; text-align: center;">
            <h1 style="color: #F5C400; margin: 0; font-size: 24px;">ELETTRO</h1>
            <p style="color: #9EA8AC; margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">ENGINEERING ENTERPRISES</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #111; margin-top: 0;">Booking Request Submitted</h2>
            <p style="color: #555; font-size: 14px;">Good day <strong>${input.name}</strong>,</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Your booking is currently under review. Our team will review your request and contact
              you through your email or mobile number for confirmation.
            </p>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong style="color: #333;">Reference Number:</strong> <span style="color: #B88A00; font-weight: bold;">${input.reference}</span></p>
              ${details}
            </div>
            <p style="color: #555; font-size: 14px;">
              Keep this reference number for any future correspondence. If you have questions, reply
              to this email or contact our team directly.
            </p>
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
        console.error(`Failed to send booking submitted notification email (attempt ${attempt}):`, error)
      }
    }
  }
}

export async function sendOrderSubmittedNotification(input: {
  name: string
  email: string
  reference: string
  items: { name: string; quantity: number; unit?: string; unitPrice: number }[]
  total: number
}) {
  for (let attempt = 1; attempt <= ADMIN_NOTIFICATION_MAX_ATTEMPTS; attempt++) {
    try {
      const transporter = await getTransporter()
      const rows = (input.items || [])
        .map((it) => {
          const price = Number(it.unitPrice || 0)
          const lineTotal = price * Number(it.quantity || 0)
          return `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 13px;">${it.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 13px; text-align: center;">${it.quantity} ${it.unit || 'pcs'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 13px; text-align: right;">₱${price.toLocaleString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 13px; text-align: right;">₱${lineTotal.toLocaleString()}</td>
          </tr>`
        })
        .join('')

      await withTimeout(transporter.sendMail({
        from: `${process.env.GMAIL_USER || 'Elettro Engineering'} <${process.env.GMAIL_USER || 'noreply@elettro.com'}>`,
        to: input.email,
        subject: `Order Received - ${input.reference} | Elettro`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0B0F10; padding: 20px; text-align: center;">
            <h1 style="color: #F5C400; margin: 0; font-size: 24px;">ELETTRO</h1>
            <p style="color: #9EA8AC; margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">ENGINEERING ENTERPRISES</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #111; margin-top: 0;">Order Received</h2>
            <p style="color: #555; font-size: 14px;">Good day <strong>${input.name}</strong>,</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              We have received your product order. Our team will review it and contact you through
              your email or mobile number to confirm availability and the next steps.
            </p>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong style="color: #333;">Order Reference:</strong> <span style="color: #B88A00; font-weight: bold;">${input.reference}</span></p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                <thead>
                  <tr>
                    <th style="padding: 8px; border-bottom: 2px solid #e0e0e0; text-align: left; color: #555; font-size: 12px;">Item</th>
                    <th style="padding: 8px; border-bottom: 2px solid #e0e0e0; text-align: center; color: #555; font-size: 12px;">Qty</th>
                    <th style="padding: 8px; border-bottom: 2px solid #e0e0e0; text-align: right; color: #555; font-size: 12px;">Unit Price</th>
                    <th style="padding: 8px; border-bottom: 2px solid #e0e0e0; text-align: right; color: #555; font-size: 12px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 10px 8px; text-align: right; color: #333; font-weight: bold; font-size: 14px;">Total</td>
                    <td style="padding: 10px 8px; text-align: right; color: #B88A00; font-weight: bold; font-size: 14px;">₱${Number(input.total || 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p style="color: #555; font-size: 14px;">
              Keep this order reference for any future correspondence. If you have questions, reply
              to this email or contact our team directly.
            </p>
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
        console.error(`Failed to send order submitted notification email (attempt ${attempt}):`, error)
      }
    }
  }
}

export async function sendLeaveDecisionNotification(input: {
  name: string
  email: string
  typeLabel: string
  fromDate: string
  toDate: string
  days: number
  status: 'APPROVED' | 'REJECTED'
  note?: string | null
}) {
  for (let attempt = 1; attempt <= ADMIN_NOTIFICATION_MAX_ATTEMPTS; attempt++) {
    try {
      const transporter = await getTransporter()
      const isApproved = input.status === 'APPROVED'
      const statusColor = isApproved ? '#22A66F' : '#DC2626'
      const statusText = isApproved ? 'APPROVED' : 'REJECTED'
      await withTimeout(transporter.sendMail({
        from: `${process.env.GMAIL_USER || 'Elettro Engineering'} <${process.env.GMAIL_USER || 'noreply@elettro.com'}>`,
        to: input.email,
        subject: `Leave Application ${statusText} - ${input.typeLabel} | Elettro`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0B0F10; padding: 20px; text-align: center;">
            <h1 style="color: #F5C400; margin: 0; font-size: 24px;">ELETTRO</h1>
            <p style="color: #9EA8AC; margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">ENGINEERING ENTERPRISES</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #111; margin-top: 0;">Leave Application ${statusText}</h2>
            <p style="color: #555; font-size: 14px;">Good day <strong>${input.name}</strong>,</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Your leave application has been <strong style="color: ${statusColor}; text-transform: uppercase;">${statusText}</strong> by the administrator.
            </p>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong style="color: #333;">Type of Leave:</strong> ${input.typeLabel}</p>
              <p style="margin: 8px 0;"><strong style="color: #333;">Inclusive Dates:</strong> ${input.fromDate} to ${input.toDate}</p>
              <p style="margin: 8px 0;"><strong style="color: #333;">Number of Days:</strong> ${input.days}</p>
              <p style="margin: 8px 0;"><strong style="color: #333;">Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
              ${input.note ? `<p style="margin: 8px 0;"><strong style="color: #333;">Remarks:</strong> ${input.note}</p>` : ''}
            </div>
            <p style="color: #555; font-size: 14px;">You can view this in the Elettro app under your Leave history.</p>
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
        console.error(`Failed to send leave decision notification email (attempt ${attempt}):`, error)
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