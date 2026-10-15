import { useEffect } from 'react'

const SITE = 'CapCrew'
const DEFAULT_TITLE = `${SITE} - Solid Caps & Smiley Caps Online`

/**
 * Sets the browser-tab title and the search-engine description for the current page.
 *   usePageMeta('Shop Caps', 'Browse our caps...')  -> "Shop Caps | CapCrew"
 *   usePageMeta('')                                  -> the default home title
 *   usePageMeta(null)                                -> does nothing (another component sets it)
 */
export function usePageMeta(title: string | null, description?: string) {
  useEffect(() => {
    if (title === null) return
    document.title = title ? `${title} | ${SITE}` : DEFAULT_TITLE
    if (description) {
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', description)
    }
  }, [title, description])
}
