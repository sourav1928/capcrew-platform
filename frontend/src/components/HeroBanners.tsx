import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface Banner {
  id: string
  title: string
  subtitle: string
  image_url: string
  link_url: string
  button_text: string
}

const isExternal = (url: string) => /^https?:\/\//i.test(url)

/** Picture slider at the top of the homepage, controlled from the admin panel. */
export default function HeroBanners({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0)
  const count = banners.length

  useEffect(() => {
    if (count < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => clearInterval(t)
  }, [count])
  useEffect(() => { if (index >= count) setIndex(0) }, [count, index])

  if (count === 0) return null
  const b = banners[index]
  const button = b.link_url && b.button_text && (
    isExternal(b.link_url) ? (
      <a href={b.link_url} className="inline-block bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">{b.button_text}</a>
    ) : (
      <Link to={b.link_url} className="inline-block bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">{b.button_text}</Link>
    )
  )

  return (
    <section className="relative h-[320px] sm:h-[420px] overflow-hidden bg-gray-900" aria-roledescription="carousel">
      <img key={b.id} src={b.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-xl text-white">
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-3">{b.title}</h1>
          {b.subtitle && <p className="text-lg text-gray-100 mb-6">{b.subtitle}</p>}
          {button}
        </div>
      </div>
      {count > 1 && (
        <>
          <button aria-label="Previous banner" onClick={() => setIndex((index - 1 + count) % count)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2"><ChevronLeft size={22} /></button>
          <button aria-label="Next banner" onClick={() => setIndex((index + 1) % count)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2"><ChevronRight size={22} /></button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((x, i) => (
              <button key={x.id} aria-label={`Banner ${i + 1}`} onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
