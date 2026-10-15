import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, LifeBuoy } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { apiClient } from '../services/api'
import { apiErrorMessage } from '../utils/orderTypes'
import { usePageMeta } from '../utils/usePageMeta'
import { telHref } from '../utils/text'

const BLANK = { name: '', email: '', subject: '', message: '', website: '' }
const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500'

const ContactPage: React.FC = () => {
  usePageMeta('Contact Us', 'Questions about sizes, colours or your order? Contact CapCrew and we will reply within 24 hours.')
  const cfg = useSelector((state: RootState) => state.config)
  const [formData, setFormData] = useState(BLANK)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setMessage('')
    try {
      const res = await apiClient.sendContactMessage(formData)
      setMessage(res.data?.message || 'Thank you! Your message has been sent.')
      setStatus('sent')
      setFormData(BLANK)
    } catch (err: any) {
      setMessage(
        err?.response?.status === 429
          ? 'You have sent several messages recently. Please try again later, or email us directly.'
          : apiErrorMessage(err, 'We could not send your message. Please try again, or email us directly.')
      )
      setStatus('error')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (status !== 'sending' && status !== 'idle') setStatus('idle')
  }

  const cards = [
    { icon: Mail, title: 'Email', content: cfg.support_email, href: `mailto:${cfg.support_email}`, desc: 'We reply within 24 hours' },
    { icon: Phone, title: 'Phone', content: cfg.support_phone, href: telHref(cfg.support_phone), desc: 'Tap to call from your phone' },
    { icon: MapPin, title: 'Address', content: cfg.store_address, href: '', desc: 'Our store address' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600">Questions about sizes, colours or your order? We are happy to help.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {cards.map((item) => (
            <div key={item.title} className="bg-white rounded-lg shadow p-6 text-center min-w-0">
              <item.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h2>
              {item.href ? (
                <a href={item.href} className="text-gray-900 font-medium mb-1 block break-words hover:text-blue-600 hover:underline">
                  {item.content}
                </a>
              ) : (
                <p className="text-gray-900 font-medium mb-1 break-words">{item.content}</p>
              )}
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
              <div>
                <label htmlFor="c-name" className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input id="c-name" type="text" name="name" value={formData.name} onChange={handleChange} required maxLength={100} autoComplete="name" className={inputClass} placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="c-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input id="c-email" type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email" className={inputClass} placeholder="your@email.com" />
              </div>
              <div>
                <label htmlFor="c-subject" className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input id="c-subject" type="text" name="subject" value={formData.subject} onChange={handleChange} required maxLength={150} className={inputClass} placeholder="How can we help?" />
              </div>
              <div>
                <label htmlFor="c-message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea id="c-message" name="message" value={formData.message} onChange={handleChange} required minLength={10} maxLength={3000} rows={5} className={inputClass} placeholder="Your message..." />
              </div>
              {/* Hidden spam trap: people never see or fill this */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Leave this empty<input type="text" name="website" value={formData.website} onChange={handleChange} tabIndex={-1} autoComplete="off" /></label>
              </div>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
              {status === 'sent' && (
                <div role="status" className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
              )}
              {status === 'error' && (
                <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{message}</div>
              )}
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <LifeBuoy className="w-6 h-6 text-blue-600" />
                How We Can Help
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li>Choosing the right size, colour or style</li>
                <li>Order status, delivery and tracking</li>
                <li>Returns and exchanges</li>
                <li>Bulk orders for teams, schools and events</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {[
                  { q: 'What is your return policy?', a: 'You can return unused caps within 7 days of delivery if the fit or colour is not right. Start a return from your account, or contact us and we will guide you. Refunds are processed within 5-7 business days of receiving the cap.' },
                  { q: 'What sizes do your caps come in?', a: 'Adult caps are adjustable and fit head sizes of about 54-60 cm. Kids caps come in smaller sizes, shown on each product page.' },
                  { q: 'How do I track my order?', a: 'Open My Orders after signing in to see your order status and tracking details. We also email you updates as your order moves.' },
                  { q: 'What payment methods do you accept?', a: 'You can pay online at checkout, or choose Cash on Delivery where it is available for your order.' },
                  { q: 'Do you ship internationally?', a: 'Currently we ship only within India.' },
                  { q: 'How do I contact customer support?', a: 'Use the form on this page, or email or call us using the details above.' },
                ].map((item) => (
                  <details key={item.q} className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <summary className="font-semibold text-gray-900">{item.q}</summary>
                    <p className="text-gray-600 mt-3">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
