'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'

const invoices = [
  {
    id: 'INV-2024-001',
    bookingId: 'BK001',
    customer: {
      name: 'John Smith',
      email: 'john.smith@email.com',
      address: '123 Main Street, London, UK'
    },
    hotel: 'Clayton Hotel London',
    room: 'Deluxe Double Room',
    checkIn: '2024-01-15',
    checkOut: '2024-01-18',
    nights: 3,
    roomRate: 150.00,
    subtotal: 450.00,
    extras: [
      { name: 'Breakfast', quantity: 3, rate: 15.00, total: 45.00 },
      { name: 'Late Checkout', quantity: 1, rate: 30.00, total: 30.00 }
    ],
    tax: 52.50,
    total: 527.50,
    status: 'Paid',
    issueDate: '2024-01-15',
    dueDate: '2024-01-30',
    paymentDate: '2024-01-15'
  },
  {
    id: 'INV-2024-002',
    bookingId: 'BK002',
    customer: {
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      address: '456 Oak Avenue, Manchester, UK'
    },
    hotel: 'Clayton Hotel London',
    room: 'Executive Suite',
    checkIn: '2024-01-20',
    checkOut: '2024-01-23',
    nights: 3,
    roomRate: 220.00,
    subtotal: 660.00,
    extras: [
      { name: 'Breakfast', quantity: 3, rate: 15.00, total: 45.00 },
      { name: 'Dinner', quantity: 2, rate: 35.00, total: 70.00 },
      { name: 'Spa Access', quantity: 1, rate: 50.00, total: 50.00 }
    ],
    tax: 82.50,
    total: 907.50,
    status: 'Pending',
    issueDate: '2024-01-20',
    dueDate: '2024-02-04',
    paymentDate: null
  },
  {
    id: 'INV-2024-003',
    bookingId: 'BK003',
    customer: {
      name: 'Mike Wilson',
      email: 'mike.wilson@email.com',
      address: '789 Pine Road, Dublin, Ireland'
    },
    hotel: 'Clayton Hotel London',
    room: 'Junior Suite',
    checkIn: '2024-01-25',
    checkOut: '2024-01-27',
    nights: 2,
    roomRate: 180.00,
    subtotal: 360.00,
    extras: [
      { name: 'Breakfast', quantity: 2, rate: 15.00, total: 30.00 }
    ],
    tax: 39.00,
    total: 429.00,
    status: 'Paid',
    issueDate: '2024-01-25',
    dueDate: '2024-02-09',
    paymentDate: '2024-01-25'
  }
]

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.bookingId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || invoice.status.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setShowDetails(true)
  }

  const handlePrintInvoice = (invoice: any) => {
    // In a real app, this would generate and print the invoice
    console.log('Printing invoice:', invoice.id)
  }

  const handleDownloadInvoice = (invoice: any) => {
    // In a real app, this would generate and download a PDF
    console.log('Downloading invoice:', invoice.id)
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Generate and manage booking invoices
            </p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Invoice Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">JD</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                JOD {invoices.reduce((sum, inv) => sum + inv.total, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">✓</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-gray-900">
                {invoices.filter(inv => inv.status === 'Paid').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold text-sm">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {invoices.filter(inv => inv.status === 'Pending').length}
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
                placeholder="Search by customer, invoice ID, or booking ID..."
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
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.id}</div>
                      <div className="text-sm text-gray-500">Issued: {invoice.issueDate}</div>
                      <div className="text-sm text-gray-500">Due: {invoice.dueDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.customer.name}</div>
                      <div className="text-sm text-gray-500">{invoice.customer.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{invoice.bookingId}</div>
                      <div className="text-sm text-gray-500">{invoice.room}</div>
                      <div className="text-sm text-gray-500">
                        {invoice.checkIn} - {invoice.checkOut} ({invoice.nights} nights)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">JOD {invoice.total.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">inc. tax</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === 'Paid' 
                        ? 'bg-green-100 text-green-800'
                        : invoice.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status}
                    </span>
                    {invoice.paymentDate && (
                      <div className="text-sm text-gray-500 mt-1">
                        Paid: {invoice.paymentDate}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Invoice"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Print Invoice"
                      >
                        <PrinterIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="text-green-600 hover:text-green-900"
                        title="Download PDF"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {showDetails && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-gray-900">Invoice Preview</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {/* Invoice Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-primary-600">LUXOTEL</h1>
                    <p className="text-gray-600">Hotel Management</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                    <p className="text-gray-600">{selectedInvoice.id}</p>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
                    <div className="text-gray-700">
                      <p className="font-medium">{selectedInvoice.customer.name}</p>
                      <p>{selectedInvoice.customer.email}</p>
                      <p className="whitespace-pre-line">{selectedInvoice.customer.address}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Invoice Details:</h3>
                    <div className="text-gray-700 space-y-1">
                      <p><span className="font-medium">Issue Date:</span> {selectedInvoice.issueDate}</p>
                      <p><span className="font-medium">Due Date:</span> {selectedInvoice.dueDate}</p>
                      <p><span className="font-medium">Booking ID:</span> {selectedInvoice.bookingId}</p>
                      <p><span className="font-medium">Hotel:</span> {selectedInvoice.hotel}</p>
                    </div>
                  </div>
                </div>

                {/* Stay Details */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Stay Details:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Room:</span>
                        <p className="text-gray-900">{selectedInvoice.room}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Check-in:</span>
                        <p className="text-gray-900">{selectedInvoice.checkIn}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Check-out:</span>
                        <p className="text-gray-900">{selectedInvoice.checkOut}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 text-gray-700">Description</th>
                        <th className="text-center py-2 text-gray-700">Qty</th>
                        <th className="text-right py-2 text-gray-700">Rate</th>
                        <th className="text-right py-2 text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2">{selectedInvoice.room}</td>
                        <td className="text-center py-2">{selectedInvoice.nights}</td>
                        <td className="text-right py-2">JOD {selectedInvoice.roomRate.toFixed(2)}</td>
                        <td className="text-right py-2">JOD {selectedInvoice.subtotal.toFixed(2)}</td>
                      </tr>
                      {selectedInvoice.extras.map((extra: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2">{extra.name}</td>
                          <td className="text-center py-2">{extra.quantity}</td>
                          <td className="text-right py-2">JOD {extra.rate.toFixed(2)}</td>
                          <td className="text-right py-2">JOD {extra.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="text-gray-900">
                        JOD {(selectedInvoice.subtotal + selectedInvoice.extras.reduce((sum: number, extra: any) => sum + extra.total, 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-700">Tax (10%):</span>
                      <span className="text-gray-900">JOD {selectedInvoice.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b-2 border-gray-300 font-bold text-lg">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">JOD {selectedInvoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="mt-8 text-center">
                  <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
                    selectedInvoice.status === 'Paid' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedInvoice.status === 'Paid' ? `PAID - ${selectedInvoice.paymentDate}` : 'PAYMENT PENDING'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
