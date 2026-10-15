/** Turns a phone number into a tap-to-call link: "+91 98765 43210" -> "tel:+919876543210". */
export const telHref = (phone: string) => 'tel:' + (phone || '').replace(/[^\d+]/g, '')

export type TextBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

const decode = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

/**
 * Product descriptions may be plain text or simple HTML (<p>, <ul><li>). This converts either into
 * paragraphs and bullet lists that are rendered as normal text, so no HTML is ever injected into the page.
 */
export function descriptionToBlocks(raw: string): TextBlock[] {
  if (!raw) return []
  let t = raw.replace(/\r/g, '')
  t = t.replace(/<li[^>]*>/gi, '\n- ').replace(/<\/li>/gi, '')
  t = t.replace(/<\/(p|div|ul|ol|h[1-6])>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n')
  t = decode(t.replace(/<[^>]+>/g, ''))
  const blocks: TextBlock[] = []
  for (const chunk of t.split(/\n{2,}/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    let paragraph: string[] = []
    let list: string[] = []
    const flushP = () => { if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join(' ') }); paragraph = [] }
    const flushL = () => { if (list.length) blocks.push({ type: 'ul', items: list }); list = [] }
    for (const line of lines) {
      if (line.startsWith('- ')) { flushP(); list.push(line.slice(2).trim()) }
      else { flushL(); paragraph.push(line) }
    }
    flushP(); flushL()
  }
  return blocks
}
