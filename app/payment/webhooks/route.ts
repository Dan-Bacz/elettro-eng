import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 64 * 1024
const SIGNATURE_WINDOW_SECONDS = 300

function validSignature(header: string | null, body: Buffer, secret: string) {
  const signature = /^t=(\d{1,12}),\s*v1=([a-f0-9]{64})$/i.exec(header?.trim() ?? '')
  if (!signature) return false

  const [, timestamp, digest] = signature
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > SIGNATURE_WINDOW_SECONDS) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest()
  return timingSafeEqual(expected, Buffer.from(digest, 'hex'))
}

function eventId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]{1,128}$/i.test(value)
}

export async function POST(request: Request) {
  const secret = process.env.SIKATPAY_WEBHOOK_SECRET?.trim()
  if (!secret) return Response.json({ error: 'Webhook is unavailable.' }, { status: 503 })

  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return Response.json({ error: 'Webhook body is too large.' }, { status: 413 })
  }

  let body: Buffer
  try {
    body = Buffer.from(await request.arrayBuffer())
  } catch {
    return Response.json({ error: 'Could not read webhook body.' }, { status: 400 })
  }
  if (body.length > MAX_BODY_BYTES) {
    return Response.json({ error: 'Webhook body is too large.' }, { status: 413 })
  }
  if (!validSignature(request.headers.get('x-signature'), body, secret)) {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  let event
  try {
    event = JSON.parse(body.toString('utf8'))
  } catch {
    return Response.json({ error: 'Invalid webhook JSON.' }, { status: 400 })
  }

  if (typeof event?.type !== 'string') {
    return Response.json({ error: 'Invalid webhook event.' }, { status: 400 })
  }

  if (event.type === 'ping') return Response.json({ ok: true })
  if (event.type !== 'payment.paid') return Response.json({ ok: true, ignored: true })

  const eventHeader = request.headers.get('x-event-id')
  const payment = event.data
  if (
    !eventId(event.id) || (eventHeader !== null && eventHeader !== event.id) ||
    typeof event.livemode !== 'boolean' ||
    !eventId(payment?.id) || payment.status !== 'paid' || payment.currency !== 'PHP' ||
    (payment.livemode !== undefined && payment.livemode !== event.livemode) ||
    !Number.isSafeInteger(payment.amount) || payment.amount <= 0 ||
    (payment.order_id != null && (typeof payment.order_id !== 'string' || payment.order_id.length > 100))
  ) {
    return Response.json({ error: 'Invalid payment event.' }, { status: 400 })
  }

  const mode = process.env.SIKATPAY_MODE?.trim().toLowerCase()
  if (mode !== 'test' && mode !== 'live') {
    return Response.json({ error: 'Webhook mode is unavailable.' }, { status: 503 })
  }
  if (event.livemode !== (mode === 'live')) {
    return Response.json({ ok: true, ignored: true })
  }

  try {
    const { count } = await prisma.sikatPayWebhookEvent.createMany({
      data: {
        id: event.id,
        paymentId: payment.id,
        orderReference: payment.order_id ?? null,
        amountCentavos: BigInt(payment.amount),
        livemode: event.livemode,
      },
      skipDuplicates: true,
    })
    return Response.json({ ok: true, duplicate: count === 0 })
  } catch {
    console.error('Could not record SikatPay payment webhook.')
    return Response.json({ error: 'Could not record payment event.' }, { status: 503 })
  }
}
