import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import store from '../store'
import { ToastProvider } from '../components/Toast'
import { ProductCard } from '../components/ProductCard'
import Footer from '../components/layout/Footer'
import Header from '../components/layout/Header'
import CookieNotice from '../components/CookieNotice'
import ProductDetailPage from '../pages/ProductDetailPage'
import ContactPage from '../pages/ContactPage'
import { apiClient } from '../services/api'
import { descriptionToBlocks, telHref } from '../utils/text'
import { usePageMeta } from '../utils/usePageMeta'

vi.mock('../services/api', () => ({
  apiClient: { getProduct: vi.fn(), sendContactMessage: vi.fn() },
}))
const api = apiClient as unknown as { getProduct: ReturnType<typeof vi.fn>; sendContactMessage: ReturnType<typeof vi.fn> }

const sku = (code: string, qty: number) => ({ id: code, sku_code: code, base_price: '399.00', mrp: '699.00', status: 'active', available_quantity: qty, in_stock: qty > 0 })
const PRODUCT = {
  id: 'p1', name: 'Smiley Face Cap', slug: 'smiley-face-cap', brand: 'SunnySide', short_description: 'Embroidered smiley',
  description: '<p>Bring a smile.</p><p><strong>Key Features:</strong></p><ul><li>Cotton twill</li><li>Curved brim</li></ul>',
  category: { name: 'Smiley Caps', slug: 'smiley-caps' }, media: [],
  attributes: [{ id: 'a1', name: 'Material', value: 'Cotton Twill', unit: '' }],
  variants: [
    { id: 'v1', name: 'Black', is_active: true, media: [], skus: [sku('CC-SMI-BLK', 50)] },
    { id: 'v2', name: 'White', is_active: true, media: [], skus: [sku('CC-SMI-WHT', 0)] },
    { id: 'v3', name: 'Yellow', is_active: true, media: [], skus: [sku('CC-SMI-YLW', 3)] },
  ],
}

const wrap = (ui: React.ReactNode, route = '/') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <Provider store={store}>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </Provider>
  )
}

beforeEach(() => { localStorage.clear(); api.getProduct.mockReset(); api.sendContactMessage.mockReset() })
afterEach(cleanup)

describe('helpers', () => {
  it('turns simple HTML descriptions into safe paragraphs and bullet lists', () => {
    const b = descriptionToBlocks(PRODUCT.description)
    expect(b).toEqual([{ type: 'p', text: 'Bring a smile.' }, { type: 'p', text: 'Key Features:' }, { type: 'ul', items: ['Cotton twill', 'Curved brim'] }])
    expect(descriptionToBlocks('Just plain text')).toEqual([{ type: 'p', text: 'Just plain text' }])
    expect(JSON.stringify(descriptionToBlocks('<script>alert(1)</script>Hello'))).not.toContain('<')
  })
  it('builds tap-to-call links', () => expect(telHref('+91 98765 43210')).toBe('tel:+919876543210'))
  it('usePageMeta sets the tab title and description', () => {
    const Page = () => { usePageMeta('Shop Caps', 'Browse our caps'); return null }
    render(<Page />)
    expect(document.title).toBe('Shop Caps | CapCrew')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Browse our caps')
  })
})

describe('ProductCard', () => {
  it('shows a cap placeholder when there is no photo, and lazy-loads real photos', () => {
    const { rerender } = wrap(<ProductCard id="1" name="A" slug="a" price={100} mrp={150} />)
    expect(screen.getByLabelText('Cap')).toBeTruthy()
    expect(screen.queryByText('No Image')).toBeNull()
    expect(screen.queryByText(/\(\d+\)/)).toBeNull() // no invented review counts
    rerender(<Provider store={store}><QueryClientProvider client={new QueryClient()}><MemoryRouter><ProductCard id="1" name="A" slug="a" image="/x.jpg" price={100} mrp={150} /></MemoryRouter></QueryClientProvider></Provider>)
    expect(document.querySelector('img')?.getAttribute('loading')).toBe('lazy')
  })
})

describe('Footer', () => {
  it('has no dead "#" links', () => {
    wrap(<Footer />)
    expect(document.querySelectorAll('a[href="#"], a[href^="#facebook"], a[href^="#twitter"], a[href^="#instagram"]').length).toBe(0)
    expect(document.querySelector('a[href^="mailto:"]')).toBeTruthy()
    expect(document.querySelector('a[href^="tel:"]')).toBeTruthy()
  })
})

describe('ProductDetailPage', () => {
  const open = () => wrap(<Routes><Route path="/products/:slug" element={<ProductDetailPage />} /></Routes>, '/products/smiley-face-cap')

  it('shows the product, lets you pick an option and add it to the cart with a confirmation', async () => {
    api.getProduct.mockResolvedValue({ data: PRODUCT })
    open()
    expect((await screen.findByRole('heading', { name: 'Smiley Face Cap' })).textContent).toBe('Smiley Face Cap')
    expect(document.title).toBe('Smiley Face Cap | CapCrew')
    expect(screen.getByText(/399/)).toBeTruthy()
    expect(screen.getByText('Cotton twill')).toBeTruthy()
    expect(screen.getByText('Cotton Twill')).toBeTruthy() // attribute value
    fireEvent.click(screen.getByRole('button', { name: 'Yellow' }))
    expect(screen.getByText('Only 3 left')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(await screen.findByText(/added to cart/i)).toBeTruthy()
    const item = store.getState().cart.items.find((i) => i.skuCode === 'CC-SMI-YLW')
    expect(item?.quantity).toBe(1)
    expect(item?.unitPrice).toBe(399)
  })

  it('does not allow buying an option that is out of stock', async () => {
    api.getProduct.mockResolvedValue({ data: PRODUCT })
    open()
    await screen.findByRole('heading', { name: 'Smiley Face Cap' })
    fireEvent.click(screen.getByRole('button', { name: 'White' }))
    const buy = screen.getByRole('button', { name: /out of stock/i }) as HTMLButtonElement
    expect(buy.disabled).toBe(true)
  })

  it('caps the quantity at the stock available', async () => {
    api.getProduct.mockResolvedValue({ data: PRODUCT })
    open()
    await screen.findByRole('heading', { name: 'Smiley Face Cap' })
    fireEvent.click(screen.getByRole('button', { name: 'Yellow' }))
    const plus = screen.getByRole('button', { name: 'Increase quantity' }) as HTMLButtonElement
    for (let i = 0; i < 6; i++) fireEvent.click(plus)
    expect(screen.getByText('3')).toBeTruthy()
    expect(plus.disabled).toBe(true)
  })

  it('shows a friendly page for an unknown product instead of a blank screen', async () => {
    api.getProduct.mockRejectedValue({ response: { status: 404 } })
    open()
    expect(await screen.findByText('We could not find that cap')).toBeTruthy()
    expect(document.querySelector('a[href="/products"]')).toBeTruthy()
  })

  it('shows a retry message if the server cannot be reached', async () => {
    api.getProduct.mockRejectedValue(new Error('Network Error'))
    open()
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toBeTruthy() // the page retries once before giving up
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
  })
})

describe('ContactPage', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText('Name'), { target: { name: 'name', value: 'Asha' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { name: 'email', value: 'asha@example.com' } })
    fireEvent.change(screen.getByLabelText('Subject'), { target: { name: 'subject', value: 'Size help' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { name: 'message', value: 'Which size fits a 56 cm head?' } })
  }

  it('has clickable email and phone', () => {
    wrap(<ContactPage />)
    expect(document.querySelector('a[href^="mailto:"]')).toBeTruthy()
    expect(document.querySelector('a[href^="tel:"]')).toBeTruthy()
    expect(document.body.textContent).not.toContain('123 Tech Street')
  })

  it('really sends the message and only then shows the success note', async () => {
    api.sendContactMessage.mockResolvedValue({ data: { message: 'Thank you! We have received your message.' } })
    wrap(<ContactPage />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(await screen.findByText('Thank you! We have received your message.')).toBeTruthy()
    expect(api.sendContactMessage).toHaveBeenCalledWith(expect.objectContaining({ name: 'Asha', email: 'asha@example.com', message: 'Which size fits a 56 cm head?' }))
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('') // form cleared after success
  })

  it('shows an error (and keeps what was typed) when sending fails', async () => {
    api.sendContactMessage.mockRejectedValue({ response: { status: 500, data: {} } })
    wrap(<ContactPage />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not send/i))
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Asha')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('explains the rate limit in plain words', async () => {
    api.sendContactMessage.mockRejectedValue({ response: { status: 429, data: { detail: 'Request was throttled.' } } })
    wrap(<ContactPage />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/several messages/i))
  })
})

describe('Header (phone menu)', () => {
  it('opens from the hamburger button and closes again after you tap a link', async () => {
    wrap(<><Header /><Routes><Route path="*" element={<div />} /></Routes></>)
    expect(document.querySelector('nav.md\\:hidden')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const nav = document.querySelector('nav.md\\:hidden') as HTMLElement
    expect(nav).toBeTruthy()
    fireEvent.click(Array.from(nav.querySelectorAll('a')).find((a) => a.textContent === 'Products') as HTMLElement)
    await waitFor(() => expect(document.querySelector('nav.md\\:hidden')).toBeNull())
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy()
  })
})

describe('CookieNotice', () => {
  it('shows once, and stays hidden after the visitor taps Got it', () => {
    const { unmount } = wrap(<CookieNotice />)
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull()
    expect(localStorage.getItem('cookieConsent')).toBe('true')
    unmount()
    wrap(<CookieNotice />)
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull()
  })
})
