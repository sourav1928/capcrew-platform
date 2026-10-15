interface Props {
  message?: string
  onRetry?: () => void
}

/** Shown when something fails to load (server down, no internet) so the page is never silently empty. */
export default function ErrorNotice({ message = 'We could not load this right now. Please check your connection and try again.', onRetry }: Props) {
  return (
    <div role="alert" className="text-center py-12 px-4">
      <p className="text-gray-900 font-semibold text-lg mb-1">Something went wrong</p>
      <p className="text-gray-500 mb-4">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Try again
        </button>
      )}
    </div>
  )
}
