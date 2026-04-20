'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

const customers = [
  {
    id: 'CUST001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '+44 7700 900123',
    country: 'United Kingdom',
    registrationDate: '2024-01-10',
    totalBookings: 5,
    totalSpent: 'JOD 2,450.00',
    status: 'Active',
    lastBooking: '2024-01-15',
    preferences: ['Non-smoking', 'High floor', 'Late checkout'],
    loyaltyPoints: 1250
  },
  {
    id: 'CUST002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.j@email.com',
    phone: '+44 7700 900456',
    country: 'United Kingdom',
    registrationDate: '2023-11-22',
    totalBookings: 8,
    totalSpent: 'JOD 4,120.00',
    status: 'VIP',
    lastBooking: '2024-01-20',
    preferences: ['Ocean view', 'Breakfast included', 'Spa access'],
    loyaltyPoints: 2060
  },
  {
    id: 'CUST003',
    firstName: 'Mike',
    lastName: 'Wilson',
    email: 'mike.wilson@email.com',
    phone: '+44 7700 900789',
    country: 'Ireland',
    registrationDate: '2024-01-05',
    totalBookings: 2,
    totalSpent: 'JOD 890.00',
    status: 'Active',
    lastBooking: '2024-01-25',
    preferences: ['Quiet room', 'Business center access'],
    loyaltyPoints: 445
  },
  {
    id: 'CUST004',
    firstName: 'Emma',
    lastName: 'Davis',
    email: 'emma.davis@email.com',
    phone: '+353 87 123 4567',
    country: 'Ireland',
    registrationDate: '2023-09-15',
    totalBookings: 12,
    totalSpent: 'JOD 6,780.00',
    status: 'VIP',
    lastBooking: '2024-01-18',
    preferences: ['Pet-friendly', 'Ground floor', 'Early check-in'],
    loyaltyPoints: 3390
  }
]

const bookingHistory = {
  'CUST001': [
    {
      id: 'BK001',
      hotel: 'Clayton Hotel London',
      room: 'Deluxe Double Room',
      checkIn: '2024-01-15',
      checkOut: '2024-01-18',
      amount: 'JOD 525.00',
      status: 'Completed'
    },
    {
      id: 'BK015',
      hotel: 'Clayton Hotel London',
      room: 'Executive Suite',
      checkIn: '2023-12-20',
      checkOut: '2023-12-23',
      amount: 'JOD 789.00',
      status: 'Completed'
    }
  ]
}

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || customer.status.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewDetails = (customer: any) => {
    setSelectedCustomer(customer)
    setShowDetails(true)
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage customer accounts and booking history
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold text-sm">VIP</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">VIP Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.status === 'VIP').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">JD</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                JOD {customers.reduce((sum, c) => sum + parseFloat(c.totalSpent.replace('JOD', '').replace(',', '').trim()), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">★</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Loyalty Points</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(customers.reduce((sum, c) => sum + c.loyaltyPoints, 0) / customers.length)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name, email, or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loyalty Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{customer.id}</div>
                        <div className="text-sm text-gray-500">Joined: {customer.registrationDate}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.phone}
                      </div>
                      <div className="text-sm text-gray-500">{customer.country}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        {customer.totalBookings} bookings
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {customer.totalSpent}
                      </div>
                      <div className="text-sm text-gray-500">
                        Last: {customer.lastBooking}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.status === 'VIP' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : customer.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.loyaltyPoints.toLocaleString()} pts
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(customer)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {showDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-gray-900">
                  Customer Details - {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Customer Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Customer ID:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.email}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Phone:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.phone}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Country:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.country}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Registration Date:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.registrationDate}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedCustomer.status === 'VIP' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedCustomer.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 mb-4 mt-6">Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.preferences.map((pref: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Booking Statistics */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Booking Statistics</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Total Bookings:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.totalBookings}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Spent:</span>
                      <span className="ml-2 text-gray-900 font-semibold">{selectedCustomer.totalSpent}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Last Booking:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.lastBooking}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Loyalty Points:</span>
                      <span className="ml-2 text-gray-900 font-semibold">
                        {selectedCustomer.loyaltyPoints.toLocaleString()} pts
                      </span>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 mb-4 mt-6">Recent Bookings</h4>
                  <div className="space-y-3">
                    {bookingHistory[selectedCustomer.id as keyof typeof bookingHistory]?.map((booking: any) => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{booking.id}</div>
                            <div className="text-sm text-gray-600">{booking.hotel}</div>
                            <div className="text-sm text-gray-600">{booking.room}</div>
                            <div className="text-sm text-gray-600">
                              {booking.checkIn} - {booking.checkOut}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{booking.amount}</div>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-sm">No recent bookings available</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Edit Customer
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                  View All Bookings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
