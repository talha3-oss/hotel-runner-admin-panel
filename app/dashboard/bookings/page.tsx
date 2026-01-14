'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

const bookings = [
  {
    id: 'BK001',
    customer: {
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+44 7700 900123'
    },
    hotel: 'Clayton Hotel London',
    room: 'Deluxe Double Room',
    checkIn: '2024-01-15',
    checkOut: '2024-01-18',
    nights: 3,
    guests: 2,
    status: 'Confirmed',
    amount: '£525.00',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    extras: ['Breakfast', 'Late Checkout'],
    bookingDate: '2024-01-10'
  },
  {
    id: 'BK002',
    customer: {
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+44 7700 900456'
    },
    hotel: 'Clayton Hotel London',
    room: 'Executive Suite',
    checkIn: '2024-01-20',
    checkOut: '2024-01-23',
    nights: 3,
    guests: 2,
    status: 'Pending',
    amount: '£789.00',
    paymentStatus: 'Pending',
    paymentMethod: 'Pay at Hotel',
    extras: ['Breakfast', 'Dinner', 'Spa Access'],
    bookingDate: '2024-01-12'
  },
  {
    id: 'BK003',
    customer: {
      name: 'Mike Wilson',
      email: 'mike.wilson@email.com',
      phone: '+44 7700 900789'
    },
    hotel: 'Clayton Hotel London',
    room: 'Junior Suite',
    checkIn: '2024-01-25',
    checkOut: '2024-01-27',
    nights: 2,
    guests: 1,
    status: 'Confirmed',
    amount: '£456.00',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    extras: ['Breakfast'],
    bookingDate: '2024-01-15'
  },
]

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || booking.status.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking)
    setShowDetails(true)
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage all hotel bookings and reservations
            </p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            New Booking
          </button>
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
                placeholder="Search by customer name or booking ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stay Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.id}</div>
                      <div className="text-sm text-gray-500">{booking.room}</div>
                      <div className="text-sm text-gray-500">{booking.hotel}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.customer.name}</div>
                      <div className="text-sm text-gray-500">{booking.customer.email}</div>
                      <div className="text-sm text-gray-500">{booking.customer.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{booking.checkIn} - {booking.checkOut}</div>
                      <div className="text-sm text-gray-500">{booking.nights} nights, {booking.guests} guests</div>
                      <div className="text-sm text-gray-500">Booked: {booking.bookingDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === 'Confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                      <div className="text-xs text-gray-500">
                        Payment: {booking.paymentStatus}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.amount}</div>
                      <div className="text-sm text-gray-500">{booking.paymentMethod}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(booking)}
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

      {/* Booking Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Booking Details - {selectedBooking.id}</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedBooking.customer.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedBooking.customer.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedBooking.customer.phone}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Booking Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Hotel:</span> {selectedBooking.hotel}</p>
                    <p><span className="font-medium">Room:</span> {selectedBooking.room}</p>
                    <p><span className="font-medium">Check-in:</span> {selectedBooking.checkIn}</p>
                    <p><span className="font-medium">Check-out:</span> {selectedBooking.checkOut}</p>
                    <p><span className="font-medium">Guests:</span> {selectedBooking.guests}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Extras</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBooking.extras.map((extra: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                        {extra}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Amount:</span> {selectedBooking.amount}</p>
                    <p><span className="font-medium">Method:</span> {selectedBooking.paymentMethod}</p>
                    <p><span className="font-medium">Status:</span> {selectedBooking.paymentStatus}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}