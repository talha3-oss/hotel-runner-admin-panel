'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  CogIcon,
  MapPinIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  Bars3Icon,
  XMarkIcon,
  TagIcon,
  SparklesIcon,
  ShieldCheckIcon,
  TicketIcon,
  QuestionMarkCircleIcon,
  NewspaperIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, moduleKey: 'dashboard' },
  { name: 'Hotels', href: '/dashboard/hotels', icon: BuildingOfficeIcon, moduleKey: 'hotels' },
  { name: 'Countries & Locations', href: '/dashboard/locations', icon: MapPinIcon, moduleKey: 'locations' },
  { name: 'Homepage Content', href: '/dashboard/homepage', icon: Squares2X2Icon, moduleKey: 'homepage' },
  { name: 'Rooms', href: '/dashboard/rooms', icon: HomeIcon, moduleKey: 'rooms' },
  { name: 'Rate Plans', href: '/dashboard/rate-plans', icon: TagIcon, moduleKey: 'ratePlans' },
  { name: 'Extras', href: '/dashboard/extras', icon: SparklesIcon, moduleKey: 'extras' },
  { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarDaysIcon, moduleKey: 'bookings' },
  { name: 'Coupons', href: '/dashboard/coupons', icon: TicketIcon, moduleKey: 'coupons' },
  { name: 'FAQs', href: '/dashboard/faqs', icon: QuestionMarkCircleIcon, moduleKey: 'faqs' },
  { name: 'Blog', href: '/dashboard/blog', icon: NewspaperIcon, moduleKey: 'blog' },
  { name: 'Customers', href: '/dashboard/customers', icon: UserGroupIcon, moduleKey: 'customers' },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCardIcon, moduleKey: 'payments' },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentTextIcon, moduleKey: 'invoices' },
  { name: 'Cookie Consents', href: '/dashboard/cookies', icon: ShieldCheckIcon, moduleKey: 'cookies' },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon, moduleKey: 'settings' },
  { name: 'Team Members', href: '/dashboard/team', icon: IdentificationIcon, moduleKey: 'team' },
]

type StoredAdminUser = {
  isSuperAdmin?: boolean
  permissions?: string[]
}

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<StoredAdminUser | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser')
      setAdminUser(raw ? JSON.parse(raw) : null)
    } catch {
      setAdminUser(null)
    }
  }, [pathname])

  const visibleNav = navigation.filter((item) => {
    if (item.moduleKey === 'dashboard') return true
    if (item.moduleKey === 'team') return !!adminUser?.isSuperAdmin
    return !!adminUser?.isSuperAdmin || (adminUser?.permissions || []).includes(item.moduleKey)
  })

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />

        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition ease-in-out duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-2xl font-bold text-primary-600">LUXOTEL</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {visibleNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`mr-4 flex-shrink-0 h-6 w-6 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-2xl font-bold text-primary-600">LUXOTEL</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
              {visibleNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`mr-3 flex-shrink-0 h-6 w-6 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden">
        <button
          type="button"
          className="bg-white p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>
    </>
  )
}
