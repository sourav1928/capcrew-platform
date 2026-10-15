import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'

export default function Footer() {
  const cfg = useSelector((state: RootState) => state.config)
  // Social links come from frontend/.env (VITE_SOCIAL_*). Icons only appear for the ones you fill in.
  const env = (import.meta as any).env
  const socialLinks = [
    { label: 'Facebook', href: env.VITE_SOCIAL_FACEBOOK as string, Icon: Facebook, hover: 'hover:text-blue-400' },
    { label: 'Twitter', href: env.VITE_SOCIAL_TWITTER as string, Icon: Twitter, hover: 'hover:text-blue-400' },
    { label: 'Instagram', href: env.VITE_SOCIAL_INSTAGRAM as string, Icon: Instagram, hover: 'hover:text-pink-400' },
  ].filter((l) => !!l.href)
  const phoneLink = 'tel:' + cfg.support_phone.replace(/[^\d+]/g, '')
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="font-bold text-lg text-white">CapCrew</span>
            </div>
            <p className="text-sm mb-4">
              Your go-to store for solid caps, smiley caps and everyday headwear
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map(({ label, href, Icon, hover }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`${hover} transition-colors`}>
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  Orders
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-white mb-4">Contact Info</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Mail size={18} className="mt-1 flex-shrink-0" />
                <a
                  href={`mailto:${cfg.support_email}`}
                  className="hover:text-blue-400 transition-colors"
                >
                  {cfg.support_email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={18} className="mt-1 flex-shrink-0" />
                <a
                  href={phoneLink}
                  className="hover:text-blue-400 transition-colors"
                >
                  {cfg.support_phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={18} className="mt-1 flex-shrink-0" />
                <span>{cfg.store_address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm">
                &copy; 2026 CapCrew Inc. All rights reserved. |
                <Link to="/privacy-policy" className="text-gray-300 hover:text-white hover:underline transition-colors ml-2 cursor-pointer">
                  Privacy Policy
                </Link>
                {' | '}
                <Link to="/terms-and-conditions" className="text-gray-300 hover:text-white hover:underline transition-colors cursor-pointer">
                  Terms of Service
                </Link>
              </p>
            </div>
            <div className="flex justify-end gap-4">
              <span className="flex items-center gap-1">
                <span>🔒</span> Secure Payments
              </span>
              <span className="flex items-center gap-1">
                <span>📦</span> Fast Delivery
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
