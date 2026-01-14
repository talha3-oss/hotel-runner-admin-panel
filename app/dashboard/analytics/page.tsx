'use client'

import { useState } from 'react'
import { 
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

const analyticsData = {
  overview: {
    totalRevenue: 45678,
    totalBookings: 1234,
    totalCustomers: 892,
    occupancyRate: 78.5,
    averageStay: 2.3,
    averageRoomRate: 185.50
  },
  monthlyRevenue: [
    { month: 'Jan', revenue: 35000, bookings: 180 },
    { month: 'Feb', revenue: 42000, bookings: 220 },
    { month: 'Mar', revenue: 38000, bookings: 195 },
    { month: 'Apr', revenue: 45000, bookings: 240 },
    { month: 'May', revenue: 52000, bookings: 280 },
    { month: 'Jun', revenue: 48000, bookings: 260 }
  ],
  roomTypePerformance: [
    { type: 'Deluxe Double', bookings: 450, revenue: 78750, occupancy: 85 },
    { type: 'Executive Suite', bookings: 280, revenue: 60200, occupancy: 72 },
    { type: 'Junior Suite', bookings: 320, revenue: 94400, occupancy: 68 },
    { type: 'King Suite', bookings: 150, revenue: 48750, occupancy: 60 },
    { type: 'Presidential Suite', bookings: 34, revenue: 14790, occupancy: 45 }
  ],
  customerSegments: [
    { segment: 'Business', percentage: 45, revenue: 20555 },
    { segment: 'Leisure', percentage: 35, revenue: 15987 },
    { segment: 'Group', percentage: 15, revenue: 6851 },
    { segment: 'Corporate', percentage: 5, revenue: 2285 }
  ]
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('6months')

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track performance and insights across your hotels
            </p>
          </div>
          <div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="3months">Last 3 months</option>
              <option value="6months">Last 6 months</option>
              <option value="1year">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                £{analyticsData.overview.totalRevenue.toLocaleString()}
              </p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4 mr-1" />
                +12%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.overview.totalBookings.toLocaleString()}
              </p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4 mr-1" />
                +8%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.overview.totalCustomers.toLocaleString()}
              </p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4 mr-1" />
                +15%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.overview.occupancyRate}%
              </p>
              <div className="flex items-center text-sm text-red-600">
                <ArrowDownIcon className="h-4 w-4 mr-1" />
                -2%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">Avg</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Stay</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.overview.averageStay} nights
              </p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4 mr-1" />
                +5%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">£</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Room Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                £{analyticsData.overview.averageRoomRate}
              </p>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4 mr-1" />
                +7%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
          <div className="space-y-4">
            {analyticsData.monthlyRevenue.map((month, index) => (
              <div key={month.month} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 w-8">{month.month}</span>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2 w-32">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${(month.revenue / 60000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    £{month.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {month.bookings} bookings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Segments */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
          <div className="space-y-4">
            {analyticsData.customerSegments.map((segment, index) => (
              <div key={segment.segment} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 w-20">{segment.segment}</span>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2 w-32">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-blue-600' :
                          index === 1 ? 'bg-green-600' :
                          index === 2 ? 'bg-yellow-600' : 'bg-purple-600'
                        }`}
                        style={{ width: `${segment.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {segment.percentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    £{segment.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Room Type Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Room Type Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.roomTypePerformance.map((room) => (
                <tr key={room.type} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{room.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{room.bookings}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      £{room.revenue.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-16 mr-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${room.occupancy}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{room.occupancy}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      £{(room.revenue / room.bookings).toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}