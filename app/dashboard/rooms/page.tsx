'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import {
  createAdminRoom,
  deleteAdminRoom,
  fetchAdminRoomTypes,
  fetchAdminRooms,
  fetchHotels,
  Hotel,
  Room,
  RoomPayload,
  RoomStatus,
  RoomTypeOption,
  updateAdminRoom,
} from '../../../lib/api'

const DEFAULT_ROOM_TYPES = ['Room Only', 'Breakfast Included', 'Dinner Included', 'Bed & Breakfast']

type RoomFormData = {
  hotelId: string
  name: string
  roomCount: string
  roomNumber: string
  roomNumbers: string
  roomType: string
  capacity: string
  bedType: string
  size: string
  price: string
  status: RoomStatus
  description: string
  amenities: string
  imageUrl: string
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'

const EMPTY_FORM: RoomFormData = {
  hotelId: '',
  name: '',
  roomCount: '1',
  roomNumber: '',
  roomNumbers: '',
  roomType: DEFAULT_ROOM_TYPES[0],
  capacity: '',
  bedType: '',
  size: '',
  price: '',
  status: 'AVAILABLE',
  description: '',
  amenities: '',
  imageUrl: '',
}

const statusLabels: Record<RoomStatus, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
  CLEANING: 'Cleaning',
}

const statusOptions: RoomStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING']

const parseCsvInput = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const parseRoomNumbersInput = (value: string): string[] =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [hotelFilter, setHotelFilter] = useState('all')
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showRoomDetails, setShowRoomDetails] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState<RoomFormData>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    try {
      setError('')
      const [roomsResult, hotelsResult, roomTypesResult] = await Promise.all([
        fetchAdminRooms(token),
        fetchHotels(token),
        fetchAdminRoomTypes(token),
      ])

      if (roomsResult.success) {
        setRooms(roomsResult.rooms || [])
      } else {
        setError(roomsResult.message || 'Failed to load rooms.')
      }

      if (hotelsResult.success) {
        setHotels(hotelsResult.hotels || [])
      } else {
        setError(hotelsResult.message || 'Failed to load hotels.')
      }

      if (roomTypesResult.success) {
        setRoomTypes(roomTypesResult.roomTypes || [])
      } else if (roomsResult.success) {
        const derivedTypes = Array.from(new Set<string>((roomsResult.rooms || []).map((room: Room) => room.roomType)))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({
            id: `derived:${name}`,
            name,
            description: null,
            createdAt: null,
            updatedAt: null,
            derived: true,
          }))
        setRoomTypes(derivedTypes)
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.hotelName || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || room.status.toLowerCase() === statusFilter
      const matchesType = typeFilter === 'all' || room.roomType === typeFilter
      const matchesHotel = hotelFilter === 'all' || room.hotelId === hotelFilter
      return matchesSearch && matchesStatus && matchesType && matchesHotel
    })
  }, [rooms, searchTerm, statusFilter, typeFilter, hotelFilter])

  const availableRoomTypes = useMemo(() => {
    const names = new Set<string>(DEFAULT_ROOM_TYPES)

    roomTypes.forEach((type) => {
      if (type.name.trim()) names.add(type.name.trim())
    })

    rooms.forEach((room) => {
      if (room.roomType.trim()) names.add(room.roomType.trim())
    })

    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [roomTypes, rooms])

  const openAddModal = () => {
    setEditingRoom(null)
    setFormData({
      ...EMPTY_FORM,
      hotelId: hotels[0]?.id || '',
      roomType: EMPTY_FORM.roomType,
    })
    setFormError('')
    setShowRoomForm(true)
  }

  const openEditModal = (room: Room) => {
    setEditingRoom(room)
    setFormError('')
    setFormData({
      hotelId: room.hotelId || '',
      name: room.name,
      roomCount: '1',
      roomNumber: room.roomNumber,
      roomNumbers: room.roomNumber,
      roomType: room.roomType,
      capacity: String(room.capacity),
      bedType: room.bedType,
      size: room.size,
      price: String(room.price),
      status: room.status,
      description: room.description || '',
      amenities: room.amenities.join(', '),
      imageUrl: room.images[0] || '',
    })
    setShowRoomForm(true)
  }

  const closeRoomForm = () => {
    setShowRoomForm(false)
    setEditingRoom(null)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  const handleViewRoom = (room: Room) => {
    setSelectedRoom(room)
    setShowRoomDetails(true)
  }

  const handleDeleteRoom = async (room: Room) => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      return
    }

    const confirmed = window.confirm(`Delete room ${room.roomNumber}?`)
    if (!confirmed) return

    try {
      const result = await deleteAdminRoom(token, room.id)
      if (result.success) {
        await loadData()
      } else {
        setError(result.message || 'Failed to delete room.')
      }
    } catch {
      setError('Unable to connect to server.')
    }
  }

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const token = localStorage.getItem('adminToken')
    if (!token) {
      setFormError('Admin token not found. Please login again.')
      return
    }

    const roomCount = Number(formData.roomCount)
    const roomNumbers = editingRoom ? [] : parseRoomNumbersInput(formData.roomNumbers)

    if (!editingRoom) {
      if (!Number.isInteger(roomCount) || roomCount <= 0) {
        setFormError('Number of rooms must be at least 1.')
        return
      }

      if (roomNumbers.length !== roomCount) {
        setFormError(`Please provide exactly ${roomCount} room number${roomCount === 1 ? '' : 's'}.`)
        return
      }
    }

    const payload: RoomPayload = {
      hotelId: formData.hotelId,
      name: formData.name.trim(),
      roomType: formData.roomType.trim(),
      capacity: Number(formData.capacity),
      bedType: formData.bedType.trim(),
      size: formData.size.trim(),
      price: Number(formData.price),
      status: formData.status,
      description: formData.description.trim(),
      amenities: parseCsvInput(formData.amenities),
      images: formData.imageUrl.trim() ? [formData.imageUrl.trim()] : [DEFAULT_IMAGE],
    }

    if (editingRoom) {
      payload.roomNumber = formData.roomNumber.trim()
    } else {
      payload.roomCount = roomCount
      payload.roomNumbers = roomNumbers
    }

    setFormLoading(true)
    setFormError('')

    try {
      const result = editingRoom
        ? await updateAdminRoom(token, editingRoom.id, payload)
        : await createAdminRoom(token, payload)

      if (result.success) {
        closeRoomForm()
        await loadData()
      } else {
        setFormError(result.message || 'Failed to save room.')
      }
    } catch {
      setFormError('Unable to connect to server.')
    } finally {
      setFormLoading(false)
    }
  }

  const statusBadgeClass = (status: RoomStatus) => {
    if (status === 'AVAILABLE') return 'bg-green-100 text-green-800'
    if (status === 'OCCUPIED') return 'bg-red-100 text-red-800'
    if (status === 'MAINTENANCE') return 'bg-yellow-100 text-yellow-800'
    return 'bg-blue-100 text-blue-800'
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rooms Management</h1>
            <p className="mt-1 text-sm text-gray-600">Manage hotel rooms, types, and availability</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Room
          </button>
        </div>
      </div>

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
              {availableRoomTypes.map((typeName) => (
                <option key={typeName} value={typeName}>
                  {typeName}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={hotelFilter}
              onChange={(e) => setHotelFilter(e.target.value)}
            >
              <option value="all">All Hotels</option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && <div className="rounded-md bg-white p-6 text-sm text-gray-600 shadow">Loading rooms...</div>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <img src={room.images[0] || DEFAULT_IMAGE} alt={room.name} className="w-full h-48 object-cover" />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeClass(room.status)}`}>
                    {statusLabels[room.status]}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                  <span className="text-lg font-bold text-primary-600">GBP {room.price}</span>
                </div>

                <p className="text-sm text-gray-600 mb-1">{room.roomNumber}</p>
                <p className="text-sm text-gray-600 mb-2">Hotel: {room.hotelName || '-'}</p>

                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <p>
                    <span className="font-medium">Type:</span> {room.roomType}
                  </p>
                  <p>
                    <span className="font-medium">Capacity:</span> {room.capacity} guests
                  </p>
                  <p>
                    <span className="font-medium">Bed:</span> {room.bedType}
                  </p>
                  <p>
                    <span className="font-medium">Size:</span> {room.size}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {room.amenities.slice(0, 3).map((amenity, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {amenity}
                    </span>
                  ))}
                  {room.amenities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">+{room.amenities.length - 3} more</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button onClick={() => handleViewRoom(room)} className="text-primary-600 hover:text-primary-800">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => openEditModal(room)} className="text-blue-600 hover:text-blue-800">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDeleteRoom(room)} className="text-red-600 hover:text-red-800">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredRooms.length === 0 && (
            <div className="col-span-full rounded-md bg-white p-6 text-sm text-gray-600 shadow">No rooms found with current filters.</div>
          )}
        </div>
      )}

      {showRoomForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
                <button onClick={closeRoomForm} className="text-gray-400 hover:text-gray-600">
                  x
                </button>
              </div>

              {formError && (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
              )}

              <form className="space-y-4" onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hotel</label>
                    <select
                      required
                      value={formData.hotelId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hotelId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Hotel</option>
                      {hotels.map((hotel) => (
                        <option key={hotel.id} value={hotel.id}>
                          {hotel.name} ({hotel.location}, {hotel.country})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter room name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingRoom ? 'Room Number' : 'Number of Rooms'}
                    </label>
                    {editingRoom ? (
                      <input
                        type="text"
                        required
                        value={formData.roomNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, roomNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter room number"
                      />
                    ) : (
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.roomCount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, roomCount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="How many rooms of this type?"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                    <input
                      type="text"
                      required
                      value={formData.roomType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, roomType: e.target.value }))}
                      list="room-type-options"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter room type"
                    />
                    <datalist id="room-type-options">
                      {availableRoomTypes.map((typeName) => (
                        <option key={typeName} value={typeName} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Number of guests"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type</label>
                    <input
                      type="text"
                      required
                      value={formData.bedType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bedType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 1 King Bed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <input
                      type="text"
                      required
                      value={formData.size}
                      onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 25 sqm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per Night (GBP)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as RoomStatus }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!editingRoom && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Numbers</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.roomNumbers}
                      onChange={(e) => setFormData((prev) => ({ ...prev, roomNumbers: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter one room number per line or separate them with commas"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Add one unique room number for each physical room of this type in the selected hotel.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Room description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
                  <input
                    type="text"
                    value={formData.amenities}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amenities: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter amenities separated by commas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://example.com/room.jpg"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeRoomForm}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={formLoading}
                  >
                    {formLoading ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showRoomDetails && selectedRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Room Details - {selectedRoom.name}</h3>
                <button onClick={() => setShowRoomDetails(false)} className="text-gray-400 hover:text-gray-600">
                  x
                </button>
              </div>

              <div className="space-y-4">
                <img
                  src={selectedRoom.images[0] || DEFAULT_IMAGE}
                  alt={selectedRoom.name}
                  className="w-full h-64 object-cover rounded-lg"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Room Number:</span> {selectedRoom.roomNumber}
                      </p>
                      <p>
                        <span className="font-medium">Hotel:</span> {selectedRoom.hotelName || '-'}
                      </p>
                      <p>
                        <span className="font-medium">Location:</span> {selectedRoom.locationName || '-'}, {selectedRoom.countryName || '-'}
                      </p>
                      <p>
                        <span className="font-medium">Type:</span> {selectedRoom.roomType}
                      </p>
                      <p>
                        <span className="font-medium">Capacity:</span> {selectedRoom.capacity} guests
                      </p>
                      <p>
                        <span className="font-medium">Bed Type:</span> {selectedRoom.bedType}
                      </p>
                      <p>
                        <span className="font-medium">Size:</span> {selectedRoom.size}
                      </p>
                      <p>
                        <span className="font-medium">Price:</span> GBP {selectedRoom.price}/night
                      </p>
                      <p>
                        <span className="font-medium">Status:</span> {statusLabels[selectedRoom.status]}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.amenities.map((amenity, index) => (
                        <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedRoom.description || 'No description.'}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRoomDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowRoomDetails(false)
                    openEditModal(selectedRoom)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
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
