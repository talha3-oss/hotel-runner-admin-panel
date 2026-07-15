'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import Header from '../../components/Header'
import { getAdminMe } from '../../lib/api'

const PATH_MODULE_KEYS: { prefix: string; moduleKey: string }[] = [
  { prefix: '/dashboard/hotels', moduleKey: 'hotels' },
  { prefix: '/dashboard/locations', moduleKey: 'locations' },
  { prefix: '/dashboard/homepage', moduleKey: 'homepage' },
  { prefix: '/dashboard/rooms', moduleKey: 'rooms' },
  { prefix: '/dashboard/rate-plans', moduleKey: 'ratePlans' },
  { prefix: '/dashboard/extras', moduleKey: 'extras' },
  { prefix: '/dashboard/bookings', moduleKey: 'bookings' },
  { prefix: '/dashboard/coupons', moduleKey: 'coupons' },
  { prefix: '/dashboard/faqs', moduleKey: 'faqs' },
  { prefix: '/dashboard/blog', moduleKey: 'blog' },
  { prefix: '/dashboard/customers', moduleKey: 'customers' },
  { prefix: '/dashboard/payments', moduleKey: 'payments' },
  { prefix: '/dashboard/invoices', moduleKey: 'invoices' },
  { prefix: '/dashboard/cookies', moduleKey: 'cookies' },
  { prefix: '/dashboard/settings', moduleKey: 'settings' },
  { prefix: '/dashboard/team', moduleKey: 'team' },
]

function getModuleKeyForPath(pathname: string): string {
  const match = PATH_MODULE_KEYS.find((p) => pathname.startsWith(p.prefix))
  return match ? match.moduleKey : 'dashboard'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/auth/login')
      return
    }
    getAdminMe(token).then((result) => {
      if (!result.success) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        router.push('/auth/login')
        return
      }

      localStorage.setItem('adminUser', JSON.stringify(result.user))

      const isSuperAdmin = !!result.user?.isSuperAdmin
      const permissions: string[] = Array.isArray(result.user?.permissions) ? result.user.permissions : []
      const moduleKey = getModuleKeyForPath(pathname)

      if (isSuperAdmin) return

      if (moduleKey === 'team') {
        router.push('/dashboard')
        return
      }

      if (moduleKey !== 'dashboard' && !permissions.includes(moduleKey)) {
        router.push('/dashboard')
      }
    }).catch(() => {
      router.push('/auth/login')
    })
  }, [router, pathname])

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Sidebar />

      <div className="flex flex-col w-0 flex-1 overflow-hidden md:ml-64">
        <Header />

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
