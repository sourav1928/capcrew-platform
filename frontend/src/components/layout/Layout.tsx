import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { useStoreConfigLoader } from '../../utils/useStoreConfig'
import Header from './Header'
import Footer from './Footer'

export default function Layout({ children }: { children: React.ReactNode }) {
  useStoreConfigLoader()
  const banner = useSelector((state: RootState) => state.config.announcement)

  return (
    <div className="flex flex-col min-h-screen">
      {banner && (
        <div className="bg-blue-600 text-white text-center text-sm font-medium px-4 py-2" role="status">
          {banner}
        </div>
      )}
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
