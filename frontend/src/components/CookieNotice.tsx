import { useState } from 'react'
import { Link } from 'react-router-dom'

const KEY = 'cookieConsent'

const alreadyAccepted = () => {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

/** The small "we use cookies" bar at the bottom of the shop. Shown until the visitor taps "Got it". */
export default function CookieNotice() {
  const [visible, setVisible] = useState(() => !alreadyAccepted())
  if (!visible) return null

  const accept = () => {
    try {
      localStorage.setItem(KEY, 'true')
    } catch {
      /* private mode: just hide it for this visit */
    }
    setVisible(false)
  }

  return (
    <div role="region" aria-label="Cookie notice" className="fixed bottom-0 inset-x-0 z-40 bg-gray-800 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
      <span>
        We use cookies to improve your experience. By continuing to browse, you agree to this. See our{' '}
        <Link to="/privacy" className="underline">Privacy Policy</Link>.
      </span>
      <button type="button" onClick={accept} className="self-start sm:self-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold">
        Got it
      </button>
    </div>
  )
}
