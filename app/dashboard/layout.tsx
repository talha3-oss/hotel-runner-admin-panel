'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import Header from '../../components/Header'
import { getAdminMe } from '../../lib/api'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

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
      }
    }).catch(() => {
      router.push('/auth/login')
    })
  }, [router])

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