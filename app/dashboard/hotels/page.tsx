'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  StarIcon
} from '@heroicons/react/24/outline'

const hotels = [
  {
    id: 1,
    name: 'Clayton Hotel London City',
    location: 'London, United Kingdom',
    address: '123 City Road, London EC1V 1JH',
    phone: '+44 20 7123 4567',
    email: 'london@claytonhotels.com',
    rooms: 156,
    status: 'Active',
    rating: 4.5,
    amenities: ['WiFi', 'Restaurant', 'Bar', 'Gym', 'Spa'],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
  },
  {
    id: 2,
    name: 'Clayton Hotel London Chiswick',
    location: 'London, United Kingdom',
    address: '626 Chiswick High Road, London W4 5RY',
    phone: '+44 20 8994 1234',
    email: 'chiswick@claytonhotels.com',
    rooms: 227,
    status: 'Active',
    rating: 4.3,
    amenities: ['WiFi', 'Restaurant', 'Bar', 'Gym', 'Pool'],
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400'
  },
  {
    id: 3,
    name: 'Clayton Hotel Dublin Airport',
    location: 'Dublin, Ireland',
    address: 'Dublin Airport, Dublin K67 NY27',
    phone: '+353 1 271 5500',
    email: 'dublin@claytonhotels.com',
    rooms: 304,
    status: 'Active',
    rating: 4.4,
    amenities: ['WiFi', 'Restaurant', 'Bar', 'Gym', 'Airport Shuttle'],
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400'
  }
]

export default function HotelsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedHotel, setSelectedHotel] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showAddHotel, setShowAddHotel] = useState(false)

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hotel.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || hotel.status.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewHotel = (hotel: any) => {
    setSelectedHotel(hotel)
    setShowDetails(true)
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hotels Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your hotel properties and their details
            </p>
          </div>
          <button 
            onClick={() => setShowAddHotel(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Hotel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hotels</p>
              <p className="text-2xl font-bold text-gray-900">{hotels.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">R</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-900">
                {hotels.reduce((sum, hotel) => sum + hotel.rooms, 0)}
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
              <p className="text-sm font-medium text-gray-600">Active Hotels</p>
              <p className="text-2xl font-bold text-gray-900">
                {hotels.filter(h => h.status === 'Active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <StarIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {(hotels.reduce((sum, hotel) => sum + hotel.rating, 0) / hotels.length).toFixed(1)}
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
                placeholder="Search hotels by name or location..."
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
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHotels.map((hotel) => (
          <div key={hotel.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              <img
                src={hotel.image}
                alt={hotel.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  hotel.status === 'Active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {hotel.status}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                <div className="flex items-center">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm text-gray-600">{hotel.rating}</span>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <MapPinIcon className="h-4 w-4 mr-1" />
                {hotel.location}
              </div>
              
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p><span className="font-medium">Rooms:</span> {hotel.rooms}</p>
                <p><span className="font-medium">Phone:</span> {hotel.phone}</p>
                <p><span className="font-medium">Email:</span> {hotel.email}</p>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {hotel.amenities.slice(0, 3).map((amenity, index) => (
                  <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">
                    {amenity}
                  </span>
                ))}
                {hotel.amenities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    +{hotel.amenities.length - 3} more
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewHotel(hotel)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button className="text-blue-600 hover:text-blue-800">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hotel Details Modal */}
      {showDetails && selectedHotel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Hotel Details - {selectedHotel.name}</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <img
                  src={selectedHotel.image}
                  alt={selectedHotel.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedHotel.name}</p>
                      <p><span className="font-medium">Location:</span> {selectedHotel.location}</p>
                      <p><span className="font-medium">Address:</span> {selectedHotel.address}</p>
                      <p><span className="font-medium">Phone:</span> {selectedHotel.phone}</p>
                      <p><span className="font-medium">Email:</span> {selectedHotel.email}</p>
                      <p><span className="font-medium">Rooms:</span> {selectedHotel.rooms}</p>
                      <p><span className="font-medium">Rating:</span> {selectedHotel.rating}/5</p>
                      <p><span className="font-medium">Status:</span> {selectedHotel.status}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedHotel.amenities.map((amenity: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
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
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Edit Hotel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Hotel Modal */}
      {showAddHotel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Hotel</h3>
                <button
                  onClick={() => setShowAddHotel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter hotel name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rooms</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Total rooms"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="5">5 Stars</option>
                      <option value="4.5">4.5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3.5">3.5 Stars</option>
                      <option value="3">3 Stars</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter amenities separated by commas"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddHotel(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Add Hotel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}