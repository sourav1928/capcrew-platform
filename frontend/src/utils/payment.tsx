import { useCallback, useRef, useState } from 'react'
import { apiClient } from '../services/api'
import { formatINR } from './format'
import { PaymentIntent, apiErrorMessage } from './orderTypes'

export type PaymentResult = { status: 'paid' } | { status: 'failed' | 'dismissed'; message: string }

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

/**
 * Runs the online-payment step for an existing order.
 * Uses Razorpay when the backend is configured for it, otherwise a clearly-labelled test gateway.
 */
export function usePayment() {
  const [mock, setMock] = useState<{ intent: PaymentIntent; resolve: (r: PaymentResult) => void } | null>(null)
  const busy = useRef(false)

  const verify = async (intent: PaymentIntent, paymentId: string, signature = ''): Promise<PaymentResult> => {
    try {
      await apiClient.verifyPayment({
        order_number: intent.order_number,
        gateway_order_id: intent.gateway_order_id,
        gateway_payment_id: paymentId,
        signature,
      })
      return { status: 'paid' }
    } catch (err) {
      return { status: 'failed', message: apiErrorMessage(err, 'We could not confirm your payment.') }
    }
  }

  const fail = async (orderNumber: string, message: string, code = ''): Promise<PaymentResult> => {
    try {
      await apiClient.reportPaymentFailure(orderNumber, message, code)
    } catch {
      /* best effort */
    }
    return { status: 'failed', message }
  }

  const pay = useCallback(async (orderNumber: string, existing?: PaymentIntent | null): Promise<PaymentResult> => {
    if (busy.current) return { status: 'dismissed', message: 'A payment is already in progress.' }
    busy.current = true
    try {
      let intent = existing || null
      if (!intent) {
        try {
          intent = (await apiClient.initiatePayment(orderNumber)).data.data as PaymentIntent
        } catch (err) {
          return { status: 'failed', message: apiErrorMessage(err, 'Could not start the payment.') }
        }
      }

      if (intent.provider === 'razorpay') {
        if (!(await loadRazorpay())) return fail(orderNumber, 'Could not load the payment window. Check your connection.')
        return await new Promise<PaymentResult>((resolve) => {
          const rz = new (window as any).Razorpay({
            key: intent!.key_id,
            amount: intent!.amount_paise,
            currency: intent!.currency,
            name: intent!.business_name,
            description: `Order ${orderNumber}`,
            order_id: intent!.gateway_order_id,
            prefill: intent!.prefill,
            theme: { color: '#2563eb' },
            handler: async (r: any) =>
              resolve(await verify(intent!, r.razorpay_payment_id, r.razorpay_signature)),
            modal: {
              ondismiss: () => resolve({ status: 'dismissed', message: 'Payment was cancelled.' }),
            },
          })
          rz.on('payment.failed', async (r: any) =>
            resolve(await fail(orderNumber, r?.error?.description || 'Payment failed.', r?.error?.code))
          )
          rz.open()
        })
      }

      // Test gateway (local development)
      const outcome = await new Promise<'success' | 'failed' | 'dismissed'>((resolve) =>
        setMock({
          intent: intent!,
          resolve: (r) => resolve(r.status === 'paid' ? 'success' : (r.status as 'failed' | 'dismissed')),
        })
      )
      setMock(null)
      if (outcome === 'success') return await verify(intent, `mock_pay_${Date.now()}`)
      if (outcome === 'failed') return await fail(orderNumber, 'Test payment failed.', 'MOCK_FAILED')
      return { status: 'dismissed', message: 'Payment was cancelled.' }
    } finally {
      busy.current = false
    }
  }, [])

  const modal = mock ? (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <span className="inline-block text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded mb-3">
          TEST MODE – no real money is charged
        </span>
        <h2 className="text-xl font-bold text-gray-900">Complete payment</h2>
        <p className="text-gray-600 mt-1">Order {mock.intent.order_number}</p>
        <p className="text-3xl font-bold text-blue-600 my-4">{formatINR(mock.intent.amount)}</p>
        <button
          onClick={() => mock.resolve({ status: 'paid' })}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 mb-2"
        >
          Pay now (simulate success)
        </button>
        <button
          onClick={() => mock.resolve({ status: 'failed', message: '' })}
          className="w-full border border-red-300 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-50 mb-2"
        >
          Simulate failed payment
        </button>
        <button
          onClick={() => mock.resolve({ status: 'dismissed', message: '' })}
          className="w-full text-gray-600 py-2 text-sm hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null

  return { pay, modal }
}
