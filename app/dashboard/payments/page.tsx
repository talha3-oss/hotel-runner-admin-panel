'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

const payments = [
  {
    id: 'PAY001',
    bookingId: 'BK001',
    customer: 'John Smith',
    amount: '£525.00',
    method: 'Credit Card',
    provider: 'Stripe',
    status: 'Completed',
    date: '2024-01-15',
    transactionId: 'txn_1234567890',
    cardLast4: '4242',
    currency: 'GBP'
  },
  {
    id: 'PAY002',
    bookingId: 'BK002',
    customer: 'Sarah Johnson',
    amount: '£789.00',
    method: 'Pay at Hotel',
    provider: 'Cash/Card',
    status: 'Pending',
    date: '2024-01-20',
    transactionId: null,
    cardLast4: null,
    currency: 'GBP'
  },
  {
    id: 'PAY003',
    bookingId: 'BK003',
    customer: 'Mike Wilson',
    amount: '£456.00',
    method: 'MontyPay',
    provider: 'MontyPay',
    status: 'Completed',
    date: '2024-01-25',
    transactionId: 'mty_9876543210',
    cardLast4: '1234',
    currency: 'GBP'
  },
  {
    id: 'PAY004',
    bookingId: 'BK004',
    customer: 'Emma Davis',
    amount: '£1,200.00',
    method: 'Credit Card',
    provider: 'Stripe',
    status: 'Failed',
    date: '2024-01-28',
    transactionId: 'txn_failed_001',
    cardLast4: '5678',
    currency: 'GBP'
  }
]

const paymentStats = {
  totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount.replace('£', '').replace(',', '')), 0),
  completedPayments: payments.filter(p => p.status === 'Completed').length,
  pendingPayments: payments.filter(p => p.status === 'Pending').length,
  failedPayments: payments.filter(p => p.status === 'Failed').length
}

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.bookingId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payment.status.toLowerCase() === statusFilter
    const matchesMethod = methodFilter === 'all' || payment.method.toLowerCase().includes(methodFilter.toLowerCase())
    return matchesSearch && matchesStatus && matchesMethod
  })

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment)
    setShowDetails(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'Pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'Failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getMethodIcon = (method: string) => {
    if (method.includes('Credit Card') || method.includes('MontyPay')) {
      return <CreditCardIcon className="h-5 w-5 text-blue-500" />
    }
    return <BanknotesIcon className="h-5 w-5 text-green-500" />
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track and manage all payment transactions
            </p>
          </div>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCardIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                £{paymentStats.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{paymentStats.completedPayments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{paymentStats.pendingPayments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{paymentStats.failedPayments}</p>
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
                placeholder="Search by customer, payment ID, or booking ID..."
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
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">All Methods</option>
              <option value="credit">Credit Card</option>
              <option value="montypay">MontyPay</option>
              <option value="hotel">Pay at Hotel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{payment.id}</div>
                      <div className="text-sm text-gray-500">Booking: {payment.bookingId}</div>
                      {payment.transactionId && (
                        <div className="text-sm text-gray-500">Txn: {payment.transactionId}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{payment.customer}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{payment.amount}</div>
                    <div className="text-sm text-gray-500">{payment.currency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getMethodIcon(payment.method)}
                      <div className="ml-2">
                        <div className="text-sm text-gray-900">{payment.method}</div>
                        <div className="text-sm text-gray-500">{payment.provider}</div>
                        {payment.cardLast4 && (
                          <div className="text-sm text-gray-500">****{payment.cardLast4}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(payment.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'Completed' 
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(payment)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      {showDetails && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-gray-900">
                  Payment Details - {selectedPayment.id}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Payment Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">Payment ID:</span>
                      <span className="ml-2 text-gray-900">{selectedPayment.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Booking ID:</span>
                      <span className="ml-2 text-gray-900">{selectedPayment.bookingId}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Amount:</span>
                      <span className="ml-2 text-gray-900 font-bold">{selectedPayment.amount}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Currency:</span>
                      <span className="ml-2 text-gray-900">{selectedPayment.currency}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Date:</span>
                      <span className="ml-2 text-gray-900">{selectedPayment.date}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700">Status:</span>
                      <div className="ml-2 flex items-center">
                        {getStatusIcon(selectedPayment.status)}
                        <span className={`ml-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedPayment.status === 'Completed' 
                            ? 'bg-green-100 text-green-800'
                            : selectedPayment.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedPayment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700">Method:</span>
                      <div className="ml-2 flex items-center">
                        {getMethodIcon(selectedPayment.method)}
                        <span className="ml-1 text-gray-900">{selectedPayment.method}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Provider:</span>
                      <span className="ml-2 text-gray-900">{selectedPayment.provider}</span>
                    </div>
                    {selectedPayment.cardLast4 && (
                      <div>
                        <span className="font-medium text-gray-700">Card:</span>
                        <span className="ml-2 text-gray-900">****{selectedPayment.cardLast4}</span>
                      </div>
                    )}
                    {selectedPayment.transactionId && (
                      <div>
                        <span className="font-medium text-gray-700">Transaction ID:</span>
                        <span className="ml-2 text-gray-900 font-mono text-sm">
                          {selectedPayment.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-700">Customer:</span>
                      <span className="ml-2 text-gray-900">{selectedPayment.customer}</span>
                    </div>
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
                {selectedPayment.status === 'Failed' && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Retry Payment
                  </button>
                )}
                <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                  Generate Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}