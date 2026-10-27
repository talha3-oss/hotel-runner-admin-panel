'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline'

interface StoredAdmin {
  fullName?: string
  email?: string
}

export default function Header() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [admin, setAdmin] = useState<StoredAdmin | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // The header said "Admin User" to everyone, whoever was signed in. On a
  // panel where several people have accounts, a name that is always the same
  // is a name that tells you nothing — including whether you are signed in as
  // yourself.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser')
      if (raw) setAdmin(JSON.parse(raw))
    } catch {
      /* nothing stored, or not readable */
    }
  }, [])

  useEffect(() => {
    if (!userMenuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [userMenuOpen])

  const handleLogout = () => {
    // This used to remove 'isAuthenticated', which nothing ever sets. The
    // token and the stored user stayed exactly where they were, so Sign out
    // took you to the login page while leaving you signed in — going back, or
    // simply typing a dashboard address, let you straight back in.
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    localStorage.removeItem('isAuthenticated')
    router.push('/auth/login')
  }

  const go = (href: string) => {
    setUserMenuOpen(false)
    router.push(href)
  }

  const displayName = admin?.fullName || admin?.email || 'Admin'

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900">Admin Dashboard</h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-500 relative">
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
              >
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  {admin?.email && (
                    <div className="border-b border-gray-100 px-4 py-2.5">
                      <p className="truncate text-sm font-medium text-gray-900">{admin.fullName || 'Admin'}</p>
                      <p className="truncate text-xs text-gray-400">{admin.email}</p>
                    </div>
                  )}
                  {/* Both of these were href="#" and did nothing at all. */}
                  <button
                    onClick={() => go('/dashboard/settings?tab=profile')}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </button>
                  <button
                    onClick={() => go('/dashboard/settings?tab=site')}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <CogIcon className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
