export const SIKATPAY_TEST_PENDING = 'TEST_PENDING'
export const SIKATPAY_TEST_PAID = 'TEST_PAID'

export function isSikatPayTestOrder(status: string) {
  return status === SIKATPAY_TEST_PENDING || status === SIKATPAY_TEST_PAID
}
