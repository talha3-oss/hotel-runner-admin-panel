'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { fetchDashboardStats, fetchHotelCount, fetchRoomCount } from '../../lib/api'
import { formatMoneyExact } from '../../lib/currency'

// recharts is the single biggest thing the panel downloads -- more than the
// whole of the rest of this page -- and it draws three boxes below the
// figures. Loaded after the page rather than with it, so the numbers and the
// recent bookings are on screen while it arrives. A box of the chart's own
// height holds the space, so nothing jumps when it does.
const chartBox = (height: number) => () => (
  <div className="animate-pulse rounded-lg bg-gray-100" style={{ height }} />
)
const RevenueChart = dynamic(() => import('./DashboardCharts').then(m => m.RevenueChart), {
  ssr: false, loading: chartBox(280),
})
const StatusPie = dynamic(() => import('./DashboardCharts').then(m => m.StatusPie), {
  ssr: false, loading: chartBox(200),
})
const HotelBars = dynamic(() => import('./DashboardCharts').then(m => m.HotelBars), {
  ssr: false, loading: chartBox(220),
})

interface DashboardData {
  stats: {
    totalBookings: number
    totalRevenue: number
    thisMonthRevenue: number
    lastMonthRevenue: number
    revenueGrowth: number
    confirmedCount: number
    pendingCount: number
    cancelledCount: number
  }
  monthlyRevenue: { month: string; revenue: number; bookings: number }[]
  statusBreakdown: { name: string; value: number; color: string }[]
  hotelPerformance: { hotel: string; bookings: number; revenue: number }[]
  recentBookings: {
    id: string
    bookingRef: string
    firstName: string
    lastName: string
    hotelName: string
    checkIn: string
    checkOut: string
    status: string
    total: number
    paymentStatus: string
    createdAt: string
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  CHECKED_IN: 'bg-blue-100 text-blue-800',
  CHECKED_OUT: 'bg-gray-100 text-gray-700',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
const fmtCurrency = formatMoneyExact

function StatCard({
  title, value, sub, icon: Icon, iconColor, trend, trendLabel,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor: string
  trend?: number
  trendLabel?: string
}) {
  const positive = trend !== undefined && trend >= 0
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {positive ? <ArrowUpIcon className="h-3.5 w-3.5" /> : <ArrowDownIcon className="h-3.5 w-3.5" />}
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-gray-400 font-normal ml-1">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [hotelCount, setHotelCount] = useState<number>(0)
  const [roomCount, setRoomCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || ''
    Promise.all([
      fetchDashboardStats(token),
      fetchHotelCount(token),
      fetchRoomCount(token),
    ])
      .then(([stats, hotels, rooms]) => {
        if (stats?.success) setData(stats)
        else setError('Failed to load dashboard data.')
        setHotelCount(hotels?.hotels?.length ?? hotels?.total ?? 0)
        setRoomCount(rooms?.rooms?.length ?? rooms?.total ?? 0)
      })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error || 'No data available.'}
      </div>
    )
  }

  const { stats, monthlyRevenue, statusBreakdown, hotelPerformance, recentBookings } = data
  const occupancyRate = stats.totalBookings > 0
    ? Math.min(100, Math.round((stats.confirmedCount / stats.totalBookings) * 100))
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Live overview of your hotel operations.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total Revenue"
          value={fmtCurrency(stats.totalRevenue)}
          sub={`This month: ${fmtCurrency(stats.thisMonthRevenue)}`}
          icon={CurrencyDollarIcon}
          iconColor="bg-emerald-50 text-emerald-600"
          trend={stats.revenueGrowth}
          trendLabel="vs last month"
        />
        <StatCard
          title="Total Bookings"
          value={fmt(stats.totalBookings)}
          sub={`${stats.confirmedCount} confirmed · ${stats.pendingCount} pending`}
          icon={CalendarDaysIcon}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Hotels"
          value={fmt(hotelCount)}
          sub={`${roomCount} rooms across all hotels`}
          icon={BuildingOfficeIcon}
          iconColor="bg-violet-50 text-violet-600"
        />
        <StatCard
          title="Confirmation Rate"
          value={`${occupancyRate}%`}
          sub={`${stats.cancelledCount} cancelled bookings`}
          icon={ArrowTrendingUpIcon}
          iconColor="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Revenue Chart + Booking Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Revenue & Bookings — Last 12 Months</h2>
          <RevenueChart data={monthlyRevenue} />
        </div>

        {/* Booking status pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Booking Status</h2>
          <StatusPie data={statusBreakdown} />
          <div className="mt-4 space-y-2">
            {statusBreakdown.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-gray-600">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hotel Performance bar chart */}
      {hotelPerformance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Revenue by Hotel</h2>
          <HotelBars data={hotelPerformance} />
        </div>
      )}

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Recent Bookings</h2>
          <a href="/dashboard/bookings" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {['Ref', 'Guest', 'Hotel', 'Check-in', 'Check-out', 'Status', 'Total'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No bookings yet.</td>
                </tr>
              )}
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{b.bookingRef}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-700">{b.firstName} {b.lastName}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[160px] truncate">{b.hotelName}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{b.checkIn}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{b.checkOut}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-700'}`}>
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">{fmtCurrency(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
