import { usePageMeta } from '../utils/usePageMeta'
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  usePageMeta("Page Not Found")
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="text-8xl font-bold text-gray-200">404</div>
            <AlertCircle className="w-16 h-16 text-red-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
          Oops! Page Not Found
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Let's get you back on track
        </p>

        {/* Search Box */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          <Link
            to="/products"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Search className="w-5 h-5" />
            Browse Products
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">Popular pages:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="text-blue-600 hover:underline text-sm">Home</Link>
            <span className="text-gray-300">•</span>
            <Link to="/products" className="text-blue-600 hover:underline text-sm">Products</Link>
            <span className="text-gray-300">•</span>
            <Link to="/cart" className="text-blue-600 hover:underline text-sm">Cart</Link>
            <span className="text-gray-300">•</span>
            <Link to="/orders" className="text-blue-600 hover:underline text-sm">Orders</Link>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 text-sm text-gray-600">
          <p>Still need help?</p>
          <a href="mailto:support@capcrew.in" className="text-blue-600 hover:underline font-medium">
            Contact our support team
          </a>
        </div>
      </div>
    </div>
  );
}
