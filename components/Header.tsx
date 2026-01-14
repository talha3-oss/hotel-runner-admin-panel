'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BellIcon, 
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export default function Header() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    router.push('/auth/login')
  }

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
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
              >
                <UserCircleIcon className="h-8 w-8" />
                <span className="text-sm font-medium">Admin User</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <CogIcon className="h-4 w-4 mr-2" />
                    Settings
                  </a>
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