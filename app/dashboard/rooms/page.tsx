'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import {
  createAdminRoom,
  deleteAdminRoom,
  fetchAdminRooms,
  fetchAdminRoomTypes,
  fetchHotels,
  getApiAssetUrl,
  Hotel,
  Room,
  RoomStatus,
  RoomTypeOption,
  uploadRoomImage,
  updateAdminRoom,
} from '../../../lib/api'


type GroupedRoom = {
  key: string
  roomNumber: string
  hotelId: string
  hotelName: string
  name: string
  capacity: number
  bedType: string
  size: string
  status: RoomStatus
  description: string
  amenities: string[]
  images: string[]
  locationName?: string
  countryName?: string
  discount: number
  childrenPrice: number
  childrenAllowed: boolean
  adultMinAge: number
  plans: Array<{ id: string; roomType: string; price: number }>
}

type RoomFormData = {
  hotelId: string
  name: string
  roomCount: string
  roomNumber: string
  roomNumbers: string
  selectedRatePlans: string[]
  ratePlanPrices: Record<string, string>
  discount: string
  childrenPrice: string
  childrenAllowed: boolean
  adultMinAge: string
  roomType: string
  capacity: string
  bedType: string
  size: string
  price: string
  status: RoomStatus
  description: string
  amenities: string
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400'

const EMPTY_FORM: RoomFormData = {
  hotelId: '',
  name: '',
  roomCount: '1',
  roomNumber: '',
  roomNumbers: '',
  selectedRatePlans: [],
  ratePlanPrices: {},
  discount: '10',
  childrenPrice: '',
  childrenAllowed: true,
  adultMinAge: '0',
  roomType: '',
  capacity: '',
  bedType: '',
  size: '',
  price: '',
  status: 'AVAILABLE',
  description: '',
  amenities: '',
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

type RatePlanMeta = { code: string; key: string; label: string }

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [allRatePlans, setAllRatePlans] = useState<RatePlanMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hotelFilter, setHotelFilter] = useState('all')
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupedRoom | null>(null)
  const [showRoomDetails, setShowRoomDetails] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupedRoom | null>(null)
  const [formData, setFormData] = useState<RoomFormData>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    try {
      setError('')
      const [roomsResult, hotelsResult, typesResult] = await Promise.all([
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

      if (typesResult.success) {
        const seen = new Set<string>()
        const allPlans: RatePlanMeta[] = (typesResult.roomTypes as RoomTypeOption[])
          .filter((t) => !t.derived)
          .filter((t) => {
            const nameLower = t.name.trim().toLowerCase()
            if (seen.has(nameLower)) return false
            seen.add(nameLower)
            return true
          })
          .map((t) => ({ code: (t.key || '').toUpperCase(), key: t.name, label: t.name }))
        setAllRatePlans(allPlans)
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

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.hotelName || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || room.status.toLowerCase() === statusFilter
      const matchesHotel = hotelFilter === 'all' || room.hotelId === hotelFilter
      return matchesSearch && matchesStatus && matchesHotel
    })
  }, [rooms, searchTerm, statusFilter, hotelFilter])

  // Group flat room rows by physical room (hotelId + roomNumber)
  const groupedFilteredRooms = useMemo(() => {
    const map = new Map<string, GroupedRoom>()
    for (const room of filteredRooms) {
      const key = `${room.hotelId}-${room.roomNumber}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          roomNumber: room.roomNumber,
          hotelId: room.hotelId || '',
          hotelName: room.hotelName || '',
          name: room.name,
          capacity: room.capacity,
          bedType: room.bedType,
          size: room.size,
          status: room.status,
          description: room.description || '',
          amenities: room.amenities,
          images: room.images,
          locationName: room.locationName,
          countryName: room.countryName,
          discount: room.discount ?? 0,
          childrenPrice: room.childrenPrice ?? 0,
          childrenAllowed: room.childrenAllowed !== false,
          adultMinAge: room.adultMinAge ?? 0,
          plans: [],
        })
      }
      map.get(key)!.plans.push({ id: room.id, roomType: room.roomType, price: room.price })
    }
    return Array.from(map.values())
  }, [filteredRooms])

  const openAddModal = () => {
    setEditingGroup(null)
    setFormData({
      ...EMPTY_FORM,
      hotelId: hotels[0]?.id || '',
    })
    setFormError('')
    setSelectedImageFile(null)
    setImagePreview('')
    setShowRoomForm(true)
  }

  const openEditModal = (group: GroupedRoom) => {
    setEditingGroup(group)
    setFormError('')
    const planPrices: Record<string, string> = {}
    const selectedPlans: string[] = []
    for (const plan of group.plans) {
      planPrices[plan.roomType] = String(plan.price)
      selectedPlans.push(plan.roomType)
    }
    setFormData({
      hotelId: group.hotelId,
      name: group.name,
      roomCount: '1',
      roomNumber: group.roomNumber,
      roomNumbers: group.roomNumber,
      selectedRatePlans: selectedPlans,
      ratePlanPrices: planPrices,
      discount: String(group.discount ?? 10),
      childrenPrice: String(group.childrenPrice ?? ''),
      childrenAllowed: group.childrenAllowed !== false,
      adultMinAge: String(group.adultMinAge ?? 0),
      roomType: group.plans[0]?.roomType || '',
      capacity: String(group.capacity),
      bedType: group.bedType,
      size: group.size,
      price: String(group.plans[0]?.price || ''),
      status: group.status,
      description: group.description,
      amenities: group.amenities.join(', '),
    })
    setSelectedImageFile(null)
    setImagePreview(group.images[0] ? getApiAssetUrl(group.images[0]) : '')
    setShowRoomForm(true)
  }

  const closeRoomForm = () => {
    setShowRoomForm(false)
    setEditingGroup(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setSelectedImageFile(null)
    setImagePreview('')
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null

    setSelectedImageFile(file)
    setImagePreview((currentPreview) => {
      if (currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview)
      }

      if (file) {
        return URL.createObjectURL(file)
      }

      if (editingGroup?.images[0]) {
        return getApiAssetUrl(editingGroup.images[0])
      }

      return ''
    })
  }

  const handleViewGroup = (group: GroupedRoom) => {
    setSelectedGroup(group)
    setShowRoomDetails(true)
  }

  const handleDeleteGroup = async (group: GroupedRoom) => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      return
    }

    const planCount = group.plans.length
    const confirmed = window.confirm(
      `Delete room ${group.roomNumber} and all its ${planCount} rate plan${planCount === 1 ? '' : 's'}?`
    )
    if (!confirmed) return

    try {
      const errors: string[] = []
      for (const plan of group.plans) {
        const result = await deleteAdminRoom(token, plan.id)
        if (!result.success) errors.push(`${plan.roomType}: ${result.message || 'Failed'}`)
      }
      if (errors.length > 0) {
        setError(errors.join('\n'))
      } else {
        await loadData()
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

    // ── EDIT MODE ───────────────────────────────────────────────────────────
    if (editingGroup) {
      if (formData.selectedRatePlans.length === 0) {
        setFormError('Select at least one rate plan.')
        return
      }

      for (const plan of formData.selectedRatePlans) {
        const planPrice = formData.ratePlanPrices[plan]
        if (!planPrice || isNaN(Number(planPrice)) || Number(planPrice) < 0) {
          setFormError(`Enter a valid price for "${plan}".`)
          return
        }
      }

      setFormLoading(true)
      setFormError('')

      try {
        let images: string[] = editingGroup.images?.length ? editingGroup.images : [DEFAULT_IMAGE]
        if (selectedImageFile) {
          const uploadResult = await uploadRoomImage(selectedImageFile)
          const uploadedImagePath = uploadResult.data?.fileUrl
          if (!uploadResult.success || !uploadedImagePath) {
            setFormError(uploadResult.message || 'Failed to upload room image.')
            return
          }
          images = [uploadedImagePath]
        }

        const commonFields = {
          hotelId: formData.hotelId,
          name: formData.name.trim(),
          capacity: Number(formData.capacity),
          bedType: formData.bedType.trim(),
          size: formData.size.trim(),
          status: formData.status,
          description: formData.description.trim(),
          amenities: parseCsvInput(formData.amenities),
          images,
        }

        const errors: string[] = []
        const existingByType = new Map(editingGroup.plans.map((p) => [p.roomType, p.id]))
        const newSelectedSet = new Set(formData.selectedRatePlans)

        // Update plans that still exist in the new selection
        for (const plan of editingGroup.plans) {
          if (newSelectedSet.has(plan.roomType)) {
            const result = await updateAdminRoom(token, plan.id, {
              ...commonFields,
              roomType: plan.roomType,
              price: Number(formData.ratePlanPrices[plan.roomType]),
              roomNumber: formData.roomNumber.trim(),
              discount: Number(formData.discount) || 0,
              childrenPrice: Number(formData.childrenPrice) || 0,
              childrenAllowed: formData.childrenAllowed,
              adultMinAge: Number(formData.adultMinAge) || 0,
            })
            if (!result.success) errors.push(`${plan.roomType}: ${result.message || 'Failed to update'}`)
          }
        }

        // Delete plans that were unchecked
        for (const plan of editingGroup.plans) {
          if (!newSelectedSet.has(plan.roomType)) {
            const result = await deleteAdminRoom(token, plan.id)
            if (!result.success) errors.push(`Delete ${plan.roomType}: ${result.message || 'Failed'}`)
          }
        }

        // Create newly checked plans that didn't exist before
        for (const planType of formData.selectedRatePlans) {
          if (!existingByType.has(planType)) {
            const result = await createAdminRoom(token, {
              ...commonFields,
              roomType: planType,
              price: Number(formData.ratePlanPrices[planType]),
              roomCount: 1,
              roomNumbers: [formData.roomNumber.trim()],
              discount: Number(formData.discount) || 0,
              childrenPrice: Number(formData.childrenPrice) || 0,
              childrenAllowed: formData.childrenAllowed,
              adultMinAge: Number(formData.adultMinAge) || 0,
            })
            if (!result.success) errors.push(`${planType}: ${result.message || 'Failed to create'}`)
          }
        }

        if (errors.length > 0) {
          setFormError(errors.join('\n'))
        } else {
          closeRoomForm()
          await loadData()
        }
      } catch {
        setFormError('Unable to connect to server.')
      } finally {
        setFormLoading(false)
      }
      return
    }

    // ── ADD MODE ─────────────────────────────────────────────────────────────
    if (formData.selectedRatePlans.length === 0) {
      setFormError('Select at least one rate plan.')
      return
    }

    for (const plan of formData.selectedRatePlans) {
      const planPrice = formData.ratePlanPrices[plan]
      if (!planPrice || isNaN(Number(planPrice)) || Number(planPrice) < 0) {
        setFormError(`Enter a valid price for "${plan}".`)
        return
      }
    }

    const roomCount = Number(formData.roomCount)
    const roomNumbers = parseRoomNumbersInput(formData.roomNumbers)

    if (!Number.isInteger(roomCount) || roomCount <= 0) {
      setFormError('Number of rooms must be at least 1.')
      return
    }

    if (roomNumbers.length !== roomCount) {
      setFormError(`Please provide exactly ${roomCount} room number${roomCount === 1 ? '' : 's'}.`)
      return
    }

    setFormLoading(true)
    setFormError('')

    try {
      let images: string[] = [DEFAULT_IMAGE]
      if (selectedImageFile) {
        const uploadResult = await uploadRoomImage(selectedImageFile)
        const uploadedImagePath = uploadResult.data?.fileUrl
        if (!uploadResult.success || !uploadedImagePath) {
          setFormError(uploadResult.message || 'Failed to upload room image.')
          return
        }
        images = [uploadedImagePath]
      }

      const errors: string[] = []
      for (const plan of formData.selectedRatePlans) {
        const result = await createAdminRoom(token, {
          hotelId: formData.hotelId,
          name: formData.name.trim(),
          roomType: plan,
          capacity: Number(formData.capacity),
          bedType: formData.bedType.trim(),
          size: formData.size.trim(),
          price: Number(formData.ratePlanPrices[plan]),
          status: formData.status,
          description: formData.description.trim(),
          amenities: parseCsvInput(formData.amenities),
          images,
          roomCount,
          roomNumbers,
          discount: Number(formData.discount) || 0,
          childrenPrice: Number(formData.childrenPrice) || 0,
        })
        if (!result.success) {
          errors.push(`${plan}: ${result.message || 'Failed'}`)
        }
      }

      if (errors.length > 0) {
        setFormError(errors.join('\n'))
      } else {
        closeRoomForm()
        await loadData()
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
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">{error}</div>
      )}

      {loading && <div className="rounded-md bg-white p-6 text-sm text-gray-600 shadow">Loading rooms...</div>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedFilteredRooms.map((group) => (
            <div key={group.key} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <img
                  src={group.images[0] ? getApiAssetUrl(group.images[0]) : DEFAULT_IMAGE}
                  alt={group.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeClass(group.status)}`}>
                    {statusLabels[group.status]}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  <span className="text-sm font-medium text-gray-500">#{group.roomNumber}</span>
                </div>

                <p className="text-sm text-gray-600 mb-3">Hotel: {group.hotelName || '-'}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                  <span><span className="font-medium">Capacity:</span> {group.capacity} guests</span>
                  <span><span className="font-medium">Bed:</span> {group.bedType}</span>
                  <span><span className="font-medium">Size:</span> {group.size}</span>
                </div>

                {/* Rate plan badges */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Rate Plans</p>
                  <div className="flex flex-wrap gap-1">
                    {group.plans.map((plan) => {
                      const meta = allRatePlans.find((m) => m.key === plan.roomType)
                      const luxotelRate = Math.round(plan.price * (1 - (group.discount ?? 0) / 100))
                      return (
                        <span
                          key={plan.roomType}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 text-xs rounded-full"
                        >
                          <span className="font-bold text-orange-800">{meta?.code ?? plan.roomType}</span>
                          <span className="text-gray-400 line-through">JOD {plan.price}</span>
                          <span className="text-orange-600 font-bold">JOD {luxotelRate}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {group.amenities.slice(0, 3).map((amenity, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {amenity}
                    </span>
                  ))}
                  {group.amenities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">+{group.amenities.length - 3} more</span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button onClick={() => handleViewGroup(group)} className="text-primary-600 hover:text-primary-800">
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => openEditModal(group)} className="text-blue-600 hover:text-blue-800">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDeleteGroup(group)} className="text-red-600 hover:text-red-800">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {groupedFilteredRooms.length === 0 && (
            <div className="col-span-full rounded-md bg-white p-6 text-sm text-gray-600 shadow">No rooms found with current filters.</div>
          )}
        </div>
      )}

      {showRoomForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{editingGroup ? 'Edit Room' : 'Add New Room'}</h3>
                <button onClick={closeRoomForm} className="text-gray-400 hover:text-gray-600">
                  x
                </button>
              </div>

              {formError && (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">{formError}</div>
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
                      {editingGroup ? 'Room Number' : 'Number of Rooms'}
                    </label>
                    {editingGroup ? (
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

                {/* Pricing Section */}
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h4 className="text-sm font-semibold text-orange-800">Rate Plans & Pricing</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 font-medium">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.discount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, discount: e.target.value }))}
                        className="w-16 px-2 py-1 text-sm border border-orange-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold text-orange-700"
                      />
                      <span className="text-xs text-gray-500">% discount for Luxotel rate</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <label className="text-xs text-gray-600 font-medium">Children Price (JOD)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={formData.childrenPrice}
                        onChange={(e) => setFormData((prev) => ({ ...prev, childrenPrice: e.target.value }))}
                        className="w-20 px-2 py-1 text-sm border border-orange-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold text-orange-700"
                        placeholder="0.00"
                      />
                      <span className="text-xs text-gray-500">per child (6-12)</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <label className="text-xs text-gray-600 font-medium">Children Allowed</label>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, childrenAllowed: !prev.childrenAllowed }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.childrenAllowed ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formData.childrenAllowed ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                      <span className="text-xs text-gray-500">{formData.childrenAllowed ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <label className="text-xs text-gray-600 font-medium">Adult Min Age</label>
                      <input
                        type="number" min="0" max="25" step="1"
                        value={formData.adultMinAge}
                        onChange={(e) => setFormData((prev) => ({ ...prev, adultMinAge: e.target.value }))}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-500">years (0 = default 13+)</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-orange-100 text-xs">
                          <th className="px-2 py-2 w-8" />
                          <th className="px-2 py-2 text-center font-bold text-orange-800 w-14">Code</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700">Rate Plan</th>
                          <th className="px-2 py-2 text-center font-semibold text-orange-700 w-36">Public Rate (JOD)</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-600 w-32">Luxotel Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRatePlans.map((plan) => {
                          const isSelected = formData.selectedRatePlans.includes(plan.key)
                          const luxPrice = formData.ratePlanPrices[plan.key] || ''
                          const discountFactor = 1 - Number(formData.discount || 10) / 100
                          const luxotelRate =
                            luxPrice && Number(luxPrice) > 0
                              ? String(Math.round(Number(luxPrice) * discountFactor))
                              : null
                          return (
                            <tr key={plan.key} className={isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        selectedRatePlans: [...prev.selectedRatePlans, plan.key],
                                        ratePlanPrices: { ...prev.ratePlanPrices, [plan.key]: '' },
                                      }))
                                    } else {
                                      setFormData((prev) => ({
                                        ...prev,
                                        selectedRatePlans: prev.selectedRatePlans.filter((p) => p !== plan.key),
                                      }))
                                    }
                                  }}
                                  className="w-4 h-4 accent-orange-600 cursor-pointer"
                                />
                              </td>
                              <td className="px-2 py-2 text-center font-mono font-bold text-orange-700 text-xs tracking-wider">
                                {plan.code}
                              </td>
                              <td className="px-2 py-2 text-gray-800">{plan.label}</td>
                              <td className="px-2 py-2">
                                {isSelected ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={luxPrice}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        ratePlanPrices: { ...prev.ratePlanPrices, [plan.key]: e.target.value },
                                      }))
                                    }
                                    className="w-full px-2 py-1 text-sm border border-orange-300 rounded-md bg-white font-bold text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    placeholder="0.00"
                                  />
                                ) : (
                                  <span className="text-gray-300 text-xs pl-2">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center text-sm text-gray-600">
                                {isSelected && luxotelRate ? `JOD ${luxotelRate}` : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {editingGroup ? (
                      <p className="mt-2 text-xs text-gray-400">
                        Check plans to add them, uncheck to remove them. Existing plans will be updated with new prices.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-gray-400">
                        Check all rate plans for this room. Each checked plan creates a separate entry in the database.
                      </p>
                    )}
                  </div>
                </div>

                {!editingGroup && (
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

                <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">Room Image</p>
                    {imagePreview ? (
                      <img src={imagePreview} alt={formData.name || 'Room preview'} className="h-36 w-full rounded-md object-cover" />
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-md bg-white text-gray-300">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Select a real image file and it will be uploaded to the server when you save this room.
                    </p>
                  </div>
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
                    {formLoading ? 'Saving...' : editingGroup ? 'Update Room' : 'Add Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showRoomDetails && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Room Details — {selectedGroup.name}</h3>
                <button onClick={() => setShowRoomDetails(false)} className="text-gray-400 hover:text-gray-600">
                  x
                </button>
              </div>

              <div className="space-y-4">
                <img
                  src={selectedGroup.images[0] ? getApiAssetUrl(selectedGroup.images[0]) : DEFAULT_IMAGE}
                  alt={selectedGroup.name}
                  className="w-full h-64 object-cover rounded-lg"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Room Number:</span> {selectedGroup.roomNumber}</p>
                      <p><span className="font-medium">Hotel:</span> {selectedGroup.hotelName || '-'}</p>
                      <p>
                        <span className="font-medium">Location:</span>{' '}
                        {selectedGroup.locationName || '-'}, {selectedGroup.countryName || '-'}
                      </p>
                      <p><span className="font-medium">Capacity:</span> {selectedGroup.capacity} guests</p>
                      <p><span className="font-medium">Bed Type:</span> {selectedGroup.bedType}</p>
                      <p><span className="font-medium">Size:</span> {selectedGroup.size}</p>
                      <p><span className="font-medium">Status:</span> {statusLabels[selectedGroup.status]}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Rate Plans</h4>
                    <div className="space-y-1">
                      {selectedGroup.plans.map((plan) => {
                        const meta = allRatePlans.find((m) => m.key === plan.roomType)
                        const luxotelRate = Math.round(plan.price * (1 - (selectedGroup.discount ?? 0) / 100))
                        return (
                          <div key={plan.roomType} className="flex items-center justify-between rounded-md bg-orange-50 px-3 py-2 text-sm">
                            <span className="font-medium text-gray-700">
                              <span className="font-mono text-xs font-bold text-orange-700 mr-2">{meta?.code ?? plan.roomType}</span>
                              {meta?.label ?? plan.roomType}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 line-through">Public: JOD {plan.price}</span>
                              <span className="font-bold text-orange-700">Luxotel: JOD {luxotelRate}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <h4 className="font-medium text-gray-900 mt-4 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroup.amenities.map((amenity, index) => (
                        <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedGroup.description || 'No description.'}</p>
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
                    openEditModal(selectedGroup)
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
