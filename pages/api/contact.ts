import nodemailer from 'nodemailer'
import dns from 'dns/promises'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lanzaderasjezamae959@gmail.com'

async function getTransporter() {
  let host = process.env.SMTP_HOST || 'smtp.gmail.com'
  try {
    const addresses = await dns.resolve4(host)
    if (addresses[0]) host = addresses[0]
  } catch {
    /* fall back to hostname */
  }
  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 25000,
    tls: { servername: process.env.SMTP_HOST || 'smtp.gmail.com' },
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { fullName, email, phone, subject, message } = req.body || {}

  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Full name is required' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }
  if (!message || String(message).trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters' })
  }

  try {
    const transporter = await getTransporter()
    await transporter.sendMail({
      from: `${process.env.GMAIL_USER || 'Elettro Website'} <${process.env.GMAIL_USER || 'noreply@elettro.com'}>`,
      to: ADMIN_EMAIL,
      replyTo: String(email),
      subject: String(subject || 'Website Contact Message').slice(0, 200),
      text: [
        `Name: ${String(fullName)}`,
        `Email: ${String(email)}`,
        phone ? `Phone: ${String(phone)}` : '',
        subject ? `Subject: ${String(subject)}` : '',
        '',
        String(message),
      ].filter(Boolean).join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0B0F10; padding: 20px; text-align: center;">
            <h1 style="color: #F5C400; margin: 0; font-size: 24px;">ELETTRO</h1>
            <p style="color: #9EA8AC; margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">ENGINEERING ENTERPRISES</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #111; margin-top: 0;">New Contact Message</h2>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong style="color: #333;">Name:</strong> ${String(fullName)}</p>
              <p style="margin: 8px 0;"><strong style="color: #333;">Email:</strong> ${String(email)}</p>
              ${phone ? `<p style="margin: 8px 0;"><strong style="color: #333;">Phone:</strong> ${String(phone)}</p>` : ''}
              ${subject ? `<p style="margin: 8px 0;"><strong style="color: #333;">Subject:</strong> ${String(subject)}</p>` : ''}
            </div>
            <p style="color: #555; font-size: 14px;"><strong style="color: #333;">Message:</strong></p>
            <p style="color: #555; font-size: 14px; white-space: pre-line; background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">${String(message)}</p>
          </div>
          <div style="background-color: #0B0F10; padding: 15px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 11px;">Elettro Engineering Enterprises - Website Contact</p>
          </div>
        </div>
      `,
    })

    return res.status(200).json({ ok: true, message: 'Message sent successfully' })
  } catch (error: any) {
    console.error('Contact API error', error)
    return res.status(500).json({ error: 'Failed to send message' })
  }
}