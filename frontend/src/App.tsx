import { Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import { ToastProvider } from './components/Toast'
import CookieNotice from './components/CookieNotice'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import InvoicePage from './pages/InvoicePage'
import CmsPage from './components/CmsPage'
import NotFoundPage from './pages/NotFoundPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsAndConditionsPage from './pages/TermsAndConditionsPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import store from './store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
})

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
        <Routes>
          {/* Auth Routes (outside layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Printable invoice (no site header/footer) */}
          <Route path="/orders/:orderNumber/invoice" element={<InvoicePage />} />

          {/* Customer Routes */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
                  <Route path="/about" element={<CmsPage slug="about"><AboutPage /></CmsPage>} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy-policy" element={<CmsPage slug="privacy-policy"><PrivacyPolicyPage /></CmsPage>} />
                  <Route path="/terms-and-conditions" element={<CmsPage slug="terms-and-conditions"><TermsAndConditionsPage /></CmsPage>} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
        <CookieNotice />
        </ToastProvider>
      </QueryClientProvider>
    </Provider>
  )
}

export default App
