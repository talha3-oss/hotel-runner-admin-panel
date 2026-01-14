'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const roomTypes = [
  { id: 1, name: 'Room Only', description: 'Basic room accommodation' },
  { id: 2, name: 'Breakfast Included', description: 'Room with complimentary breakfast' },
  { id: 3, name: 'Dinner Included', description: 'Room with dinner service' },
  { id: 4, name: 'Bed & Breakfast', description: 'Room with bed and breakfast package' }
]

const rooms = [
  {
    id: 'R001',
    name: 'Deluxe Double Room',
    type: 'Bed & Breakfast',
    capacity: 2,
    bedType: '1 Double Bed',
    size: '25 sqm',
    price: 175.00,
    status: 'Available',
    amenities: ['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service'],
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
    description: 'Spacious double room with modern amenities and city view'
  },
  {
    id: 'R002',
    name: 'Executive Double Room',
    type: 'Breakfast Included',
    capacity: 2,
    bedType: '1 Double Bed',
    size: '30 sqm',
    price: 215.00,
    status: 'Available',
    amenities: ['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Executive Lounge Access'],
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
    description: 'Premium double room with executive privileges'
  },
  {
    id: 'R003',
    name: 'Junior Suite',
    type: 'Dinner Included',
    capacity: 2,
    bedType: '1 King Bed',
    size: '40 sqm',
    price: 295.00,
    status: 'Occupied',
    amenities: ['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Separate Living Area'],
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
    description: 'Spacious suite with separate living area'
  },
  {
    id: 'R004',
    name: 'King Suite',
    type: 'Bed & Breakfast',
    capacity: 2,
    bedType: '1 King Bed',
    size: '50 sqm',
    price: 325.00,
    status: 'Available',
    amenities: ['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Separate Living Area', 'Kitchenette'],
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
    description: 'Luxury suite with premium amenities'
  },
  {
    id: 'R005',
    name: 'Presidential Suite',
    type: 'Room Only',
    capacity: 4,
    bedType: '1 King Bed + Sofa Bed',
    size: '80 sqm',
    price: 435.00,
    status: 'Maintenance',
    amenities: ['Free WiFi', 'Air Conditioning', 'Mini Bar', 'Room Service', 'Separate Living Area', 'Kitchenette', 'Balcony'],
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'],
    description: 'Ultimate luxury suite with panoramic views'
  }
]

export default function RoomsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [showRoomDetails, setShowRoomDetails] = useState(false)

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status.toLowerCase() === statusFilter
    const matchesType = typeFilter === 'all' || room.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const handleViewRoom = (room: any) => {
    setSelectedRoom(room)
    setShowRoomDetails(true)
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rooms Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage hotel rooms, types, and availability
            </p>
          </div>
          <button 
            onClick={() => setShowAddRoom(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Room
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
                placeholder="Search rooms..."
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
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {roomTypes.map(type => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <div key={room.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              <img
                src={room.images[0]}
                alt={room.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  room.status === 'Available' 
                    ? 'bg-green-100 text-green-800'
                    : room.status === 'Occupied'
                    ? 'bg-red-100 text-red-800'
                    : room.status === 'Maintenance'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {room.status}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                <span className="text-lg font-bold text-primary-600">£{room.price}</span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{room.id}</p>
              
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p><span className="font-medium">Type:</span> {room.type}</p>
                <p><span className="font-medium">Capacity:</span> {room.capacity} guests</p>
                <p><span className="font-medium">Bed:</span> {room.bedType}</p>
                <p><span className="font-medium">Size:</span> {room.size}</p>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {room.amenities.slice(0, 3).map((amenity, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {amenity}
                  </span>
                ))}
                {room.amenities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    +{room.amenities.length - 3} more
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewRoom(room)}
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

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Room</h3>
                <button
                  onClick={() => setShowAddRoom(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter room name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room ID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter room ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      {roomTypes.map(type => (
                        <option key={type.id} value={type.name}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Number of guests"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 1 King Bed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 25 sqm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per Night (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="cleaning">Cleaning</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Room description"
                  ></textarea>
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
                    onClick={() => setShowAddRoom(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Add Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {showRoomDetails && selectedRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Room Details - {selectedRoom.name}</h3>
                <button
                  onClick={() => setShowRoomDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <img
                  src={selectedRoom.images[0]}
                  alt={selectedRoom.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Room ID:</span> {selectedRoom.id}</p>
                      <p><span className="font-medium">Type:</span> {selectedRoom.type}</p>
                      <p><span className="font-medium">Capacity:</span> {selectedRoom.capacity} guests</p>
                      <p><span className="font-medium">Bed Type:</span> {selectedRoom.bedType}</p>
                      <p><span className="font-medium">Size:</span> {selectedRoom.size}</p>
                      <p><span className="font-medium">Price:</span> £{selectedRoom.price}/night</p>
                      <p><span className="font-medium">Status:</span> {selectedRoom.status}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.amenities.map((amenity: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedRoom.description}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRoomDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Edit Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}