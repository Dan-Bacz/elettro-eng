import { prisma } from './prisma'
import { SIKATPAY_TEST_PAID, SIKATPAY_TEST_PENDING } from './sikatpay-test-status'

const apiUrl = 'https://payment.sikatpinoy.net/api/v1/payments'
const merchantOrderPrefix = 'ELETTRO-TEST-'
const minAmount = 2_000
const maxAmount = 5_000_000

export function isSikatPayTestMode() {
  return process.env.SIKATPAY_MODE?.trim().toLowerCase() === 'test'
}

export function canStartSikatPayTest() {
  return isSikatPayTestMode() &&
    /^mk_test_[a-z0-9]+$/i.test(process.env.SIKATPAY_API_KEY?.trim() ?? '') &&
    process.env.SIKATPAY_API_URL?.trim() === apiUrl &&
    Boolean(process.env.SIKATPAY_WEBHOOK_SECRET?.trim())
}

export function orderAmountCentavos(order: { total: number; shipping: number }) {
  return Math.round((order.total + order.shipping) * 100)
}

export function validSikatPayTestAmount(amount: number) {
  return Number.isSafeInteger(amount) && amount >= minAmount && amount <= maxAmount
}

export function sikatPayOrderId(reference: string | null | undefined) {
  if (!reference?.startsWith(merchantOrderPrefix)) return null
  const id = reference.slice(merchantOrderPrefix.length)
  return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id) ? id : null
}

export async function startSikatPayTest(order: {
  id: string
  clientId: string
  total: number
  shipping: number
  sikatPayPaymentId: string | null
}) {
  const key = process.env.SIKATPAY_API_KEY?.trim()
  if (!key || !canStartSikatPayTest()) throw new Error('GCash test checkout is unavailable.')

  const amount = orderAmountCentavos(order)
  if (!validSikatPayTestAmount(amount)) throw new Error('GCash test payments support totals from PHP 20 to PHP 50,000.')

  const reference = merchantOrderPrefix + order.id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://elettro-eng-one.vercel.app'
  const successUrl = new URL('/client/dashboard#orders', appUrl)
  successUrl.searchParams.set('sikatpay', order.id)
  const cancelUrl = new URL('/client/dashboard#orders', appUrl)
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(8_000),
    body: JSON.stringify({
      amount,
      order_id: reference,
      description: `Elettro test order ${order.id.slice(0, 8).toUpperCase()}`,
      success_url: successUrl.href,
      cancel_url: cancelUrl.href,
    }),
  })

  if (response.status === 409 && order.sikatPayPaymentId) {
    // Reconcile an existing payment with the gateway if its webhook was delayed.
    const id = order.sikatPayPaymentId
    const lookup = await fetch(`${apiUrl}/${encodeURIComponent(id)}`, { headers, redirect: 'error', signal: AbortSignal.timeout(5_000) })
    const payment = lookup.ok ? await lookup.json() : null
    if (
      payment?.id === id && payment.livemode === false && payment.status === 'paid' &&
      payment.order_id === reference && payment.amount === amount && payment.currency === 'PHP'
    ) {
      await prisma.order.updateMany({
        where: { id: order.id, clientId: order.clientId, paymentStatus: SIKATPAY_TEST_PENDING, sikatPayPaymentId: id },
        data: { paymentStatus: SIKATPAY_TEST_PAID },
      })
      return { checkoutUrl: null, paymentStatus: SIKATPAY_TEST_PAID }
    }
  }

  if (!response.ok) throw new Error('Could not open GCash test checkout. Try again from your orders.')
  const payment = await response.json()
  if (
    typeof payment.id !== 'string' || !/^[a-z0-9_-]{1,128}$/i.test(payment.id) ||
    (payment.livemode !== undefined && payment.livemode !== false) || payment.status !== 'pending' || payment.amount !== amount ||
    payment.currency !== 'PHP' || payment.order_id !== reference || typeof payment.checkout_url !== 'string'
  ) throw new Error('SikatPay returned an invalid test payment.')

  const checkout = new URL(payment.checkout_url)
  if (checkout.origin !== new URL(apiUrl).origin || checkout.pathname !== '/pay' || checkout.searchParams.get('id') !== payment.id) {
    throw new Error('SikatPay returned an invalid checkout address.')
  }

  const updated = await prisma.order.updateMany({
    where: { id: order.id, clientId: order.clientId, paymentStatus: SIKATPAY_TEST_PENDING },
    data: { sikatPayPaymentId: payment.id },
  })
  if (!updated.count) return { checkoutUrl: null, paymentStatus: SIKATPAY_TEST_PAID }
  return { checkoutUrl: checkout.href, paymentStatus: SIKATPAY_TEST_PENDING }
}
