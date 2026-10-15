import { usePageMeta } from '../utils/usePageMeta'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { apiClient } from '../services/api'
import { Invoice, InvoiceFrame } from '../shared/InvoiceView'
import { apiErrorMessage } from '../utils/orderTypes'

function InvoicePage() {
  usePageMeta("Invoice")
  const { orderNumber = '' } = useParams()
  const auth = useSelector((state: RootState) => state.auth)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth.isAuthenticated) return
    apiClient
      .getInvoice(orderNumber)
      .then((r) => setInvoice(r.data.data))
      .catch((e) => setError(apiErrorMessage(e, 'Could not load this invoice.')))
      .finally(() => setLoading(false))
  }, [orderNumber, auth.isAuthenticated])

  if (!auth.isAuthenticated) return <Navigate to={`/login?next=/orders/${orderNumber}/invoice`} replace />
  return <InvoiceFrame invoice={invoice} error={error} loading={loading} backHref={`/orders/${orderNumber}`} />
}

export default InvoicePage
