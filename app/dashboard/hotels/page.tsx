'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  StarIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import {
  createHotel,
  deleteHotel,
  fetchHotels,
  fetchLocations,
  getApiAssetUrl,
  Hotel,
  HotelStatus,
  LocationOption,
  uploadRoomImage,
  updateHotel,
} from '../../../lib/api'

type HotelForm = {
  id: string
  name: string
  locationId: string
  address: string
  phone: string
  email: string
  status: HotelStatus
  rating: string
  amenities: string
  image: string
  heroImage: string
  galleryImages: string
  shortDescription: string
  description: string
  nearbyPlacesJson: string
  bookingExtrasJson: string
  bookingDefaultsJson: string
  saleText: string
  aboutTitle: string
  roomsTitle: string
  roomsDescription: string
  diningTitle: string
  diningSubtitle: string
  diningDescription: string
  businessTitle: string
  businessSubtitle: string
  businessDescription: string
  accessibilityText: string
}

const EMPTY_HOTEL: HotelForm = {
  id: '',
  name: '',
  locationId: '',
  address: '',
  phone: '',
  email: '',
  status: 'ACTIVE',
  rating: '',
  amenities: '',
  image: '',
  heroImage: '',
  galleryImages: '',
  shortDescription: '',
  description: '',
  nearbyPlacesJson: '',
  bookingExtrasJson: '',
  bookingDefaultsJson: '',
  saleText: '',
  aboutTitle: '',
  roomsTitle: '',
  roomsDescription: '',
  diningTitle: '',
  diningSubtitle: '',
  diningDescription: '',
  businessTitle: '',
  businessSubtitle: '',
  businessDescription: '',
  accessibilityText: '',
}

const parseCsv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

const parseJsonInput = (raw: string, label: string) => {
  const normalized = raw.trim()
  if (!normalized) return undefined

  try {
    return JSON.parse(normalized)
  } catch {
    throw new Error(`${label} must be valid JSON.`)
  }
}

const stringifyJsonForInput = (value: unknown) => {
  if (value === undefined || value === null) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

const getHotelImage = (hotel: Hotel) => getApiAssetUrl(hotel.image || hotel.heroImage || hotel.galleryImages[0])

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export default function HotelsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showHotelModal, setShowHotelModal] = useState(false)
  const [hotelForm, setHotelForm] = useState<HotelForm>(EMPTY_HOTEL)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([])
  const [primaryImagePreview, setPrimaryImagePreview] = useState('')
  const [heroImagePreview, setHeroImagePreview] = useState('')
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([])

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    try {
      setError('')
      const [hotelsResult, locationsResult] = await Promise.all([
        fetchHotels(token, searchTerm),
        fetchLocations(token),
      ])

      if (!hotelsResult.success) throw new Error(hotelsResult.message || 'Failed to load hotels.')
      if (!locationsResult.success) throw new Error(locationsResult.message || 'Failed to load locations.')

      setHotels(hotelsResult.hotels || [])
      setLocations(locationsResult.locations || [])
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return () => {
      if (primaryImagePreview.startsWith('blob:')) URL.revokeObjectURL(primaryImagePreview)
      if (heroImagePreview.startsWith('blob:')) URL.revokeObjectURL(heroImagePreview)
      galleryImagePreviews.forEach((preview) => {
        if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
      })
    }
  }, [primaryImagePreview, heroImagePreview, galleryImagePreviews])

  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const matchesSearch =
        hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.country.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || hotel.status.toLowerCase() === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [hotels, searchTerm, statusFilter])

  const totalRooms = useMemo(() => hotels.reduce((sum, hotel) => sum + hotel.rooms, 0), [hotels])
  const averageRating = useMemo(() => {
    const ratedHotels = hotels.filter((hotel) => typeof hotel.rating === 'number')
    if (!ratedHotels.length) return '0.0'
    const total = ratedHotels.reduce((sum, hotel) => sum + (hotel.rating || 0), 0)
    return (total / ratedHotels.length).toFixed(1)
  }, [hotels])

  const openAddHotel = () => {
    setHotelForm({ ...EMPTY_HOTEL, locationId: locations[0]?.id || '' })
    setFormError('')
    setPrimaryImageFile(null)
    setHeroImageFile(null)
    setGalleryImageFiles([])
    setPrimaryImagePreview('')
    setHeroImagePreview('')
    setGalleryImagePreviews([])
    setShowHotelModal(true)
  }

  const openEditHotel = (hotel: Hotel) => {
    const detailContent = asRecord(hotel.detailContent)
    setHotelForm({
      id: hotel.id,
      name: hotel.name,
      locationId: hotel.locationId,
      address: hotel.address || '',
      phone: hotel.phone || '',
      email: hotel.email || '',
      status: hotel.status,
      rating: hotel.rating != null ? String(hotel.rating) : '',
      amenities: hotel.amenities.join(', '),
      image: hotel.image || '',
      heroImage: hotel.heroImage || '',
      galleryImages: hotel.galleryImages.join(', '),
      shortDescription: hotel.shortDescription || '',
      description: hotel.description || '',
      nearbyPlacesJson: stringifyJsonForInput(hotel.nearbyPlaces),
      bookingExtrasJson: stringifyJsonForInput(hotel.bookingExtras),
      bookingDefaultsJson: stringifyJsonForInput(hotel.bookingDefaults),
      saleText: typeof detailContent?.saleText === 'string' ? detailContent.saleText : '',
      aboutTitle: typeof detailContent?.aboutTitle === 'string' ? detailContent.aboutTitle : '',
      roomsTitle: typeof detailContent?.roomsTitle === 'string' ? detailContent.roomsTitle : '',
      roomsDescription: typeof detailContent?.roomsDescription === 'string' ? detailContent.roomsDescription : '',
      diningTitle: typeof detailContent?.diningTitle === 'string' ? detailContent.diningTitle : '',
      diningSubtitle: typeof detailContent?.diningSubtitle === 'string' ? detailContent.diningSubtitle : '',
      diningDescription: typeof detailContent?.diningDescription === 'string' ? detailContent.diningDescription : '',
      businessTitle: typeof detailContent?.businessTitle === 'string' ? detailContent.businessTitle : '',
      businessSubtitle: typeof detailContent?.businessSubtitle === 'string' ? detailContent.businessSubtitle : '',
      businessDescription: typeof detailContent?.businessDescription === 'string' ? detailContent.businessDescription : '',
      accessibilityText: typeof detailContent?.accessibilityText === 'string' ? detailContent.accessibilityText : '',
    })
    setFormError('')
    setPrimaryImageFile(null)
    setHeroImageFile(null)
    setGalleryImageFiles([])
    setPrimaryImagePreview(hotel.image ? getApiAssetUrl(hotel.image) : '')
    setHeroImagePreview(hotel.heroImage ? getApiAssetUrl(hotel.heroImage) : '')
    setGalleryImagePreviews(hotel.galleryImages.map((image) => getApiAssetUrl(image)).filter(Boolean))
    setShowHotelModal(true)
  }

  const handleSingleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
    currentPreview: string,
    setFile: (file: File | null) => void,
    setPreview: (preview: string) => void,
    fallbackUrl = ''
  ) => {
    const file = event.target.files?.[0] || null
    setFile(file)

    if (currentPreview.startsWith('blob:')) {
      URL.revokeObjectURL(currentPreview)
    }

    if (file) {
      setPreview(URL.createObjectURL(file))
      return
    }

    setPreview(fallbackUrl)
  }

  const handleGalleryImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    galleryImagePreviews.forEach((preview) => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    })

    setGalleryImageFiles(files)
    if (files.length > 0) {
      setGalleryImagePreviews(files.map((file) => URL.createObjectURL(file)))
      return
    }

    setGalleryImagePreviews(parseCsv(hotelForm.galleryImages).map((image) => getApiAssetUrl(image)).filter(Boolean))
  }

  const submitHotel = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return

    setSaving(true)
    setFormError('')
    try {
      const nearbyPlaces = parseJsonInput(hotelForm.nearbyPlacesJson, 'Nearby places')
      const bookingExtras = parseJsonInput(hotelForm.bookingExtrasJson, 'Booking extras')
      const bookingDefaults = parseJsonInput(hotelForm.bookingDefaultsJson, 'Booking defaults')
      let primaryImagePath = hotelForm.image.trim()
      let heroImagePath = hotelForm.heroImage.trim()
      let galleryImagePaths = parseCsv(hotelForm.galleryImages)

      if (primaryImageFile) {
        const uploadResult = await uploadRoomImage(primaryImageFile)
        const uploadedImagePath = uploadResult.data?.fileUrl
        if (!uploadResult.success || !uploadedImagePath) {
          setFormError(uploadResult.message || 'Failed to upload primary image.')
          return
        }
        primaryImagePath = uploadedImagePath
      }

      if (heroImageFile) {
        const uploadResult = await uploadRoomImage(heroImageFile)
        const uploadedImagePath = uploadResult.data?.fileUrl
        if (!uploadResult.success || !uploadedImagePath) {
          setFormError(uploadResult.message || 'Failed to upload hero image.')
          return
        }
        heroImagePath = uploadedImagePath
      }

      if (galleryImageFiles.length > 0) {
        const uploadedGalleryImages: string[] = []
        for (const file of galleryImageFiles) {
          const uploadResult = await uploadRoomImage(file)
          const uploadedImagePath = uploadResult.data?.fileUrl
          if (!uploadResult.success || !uploadedImagePath) {
            setFormError(uploadResult.message || 'Failed to upload one of the gallery images.')
            return
          }
          uploadedGalleryImages.push(uploadedImagePath)
        }
        galleryImagePaths = uploadedGalleryImages
      }

      const payload = {
        name: hotelForm.name.trim(),
        locationId: hotelForm.locationId,
        address: hotelForm.address.trim(),
        phone: hotelForm.phone.trim(),
        email: hotelForm.email.trim(),
        status: hotelForm.status,
        rating: hotelForm.rating ? Number(hotelForm.rating) : undefined,
        amenities: parseCsv(hotelForm.amenities),
        image: primaryImagePath,
        heroImage: heroImagePath,
        galleryImages: galleryImagePaths,
        shortDescription: hotelForm.shortDescription.trim(),
        description: hotelForm.description.trim(),
        nearbyPlaces,
        bookingExtras,
        bookingDefaults,
        detailContent: {
          saleText: hotelForm.saleText.trim() || null,
          aboutTitle: hotelForm.aboutTitle.trim() || null,
          roomsTitle: hotelForm.roomsTitle.trim() || null,
          roomsDescription: hotelForm.roomsDescription.trim() || null,
          diningTitle: hotelForm.diningTitle.trim() || null,
          diningSubtitle: hotelForm.diningSubtitle.trim() || null,
          diningDescription: hotelForm.diningDescription.trim() || null,
          businessTitle: hotelForm.businessTitle.trim() || null,
          businessSubtitle: hotelForm.businessSubtitle.trim() || null,
          businessDescription: hotelForm.businessDescription.trim() || null,
          accessibilityText: hotelForm.accessibilityText.trim() || null,
        },
      }

      const result = hotelForm.id ? await updateHotel(token, hotelForm.id, payload) : await createHotel(token, payload)

      if (!result.success) {
        setFormError(result.message || 'Failed to save hotel.')
        return
      }

      setShowHotelModal(false)
      setPrimaryImageFile(null)
      setHeroImageFile(null)
      setGalleryImageFiles([])
      setPrimaryImagePreview('')
      setHeroImagePreview('')
      setGalleryImagePreviews([])
      await loadData()
    } catch {
      setFormError('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHotel = async (id: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!window.confirm('Delete this hotel?')) return
    const result = await deleteHotel(token, id)
    if (!result.success) {
      setError(result.message || 'Failed to delete hotel.')
      return
    }
    await loadData()
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Loading hotels...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hotels Management</h1>
            <p className="mt-1 text-sm text-gray-600">Manage hotel content used across the public website and booking flow</p>
          </div>
          <button onClick={openAddHotel} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Hotel
          </button>
        </div>
      </div>

      {error && <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

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
              <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
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
              <p className="text-2xl font-bold text-gray-900">{hotels.filter((hotel) => hotel.status === 'ACTIVE').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <StarIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">{averageRating}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search hotels by name, city, or country..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredHotels.map((hotel) => (
          <div key={hotel.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              <img src={getHotelImage(hotel) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'} alt={hotel.name} className="w-full h-48 object-cover" />
              <div className="absolute top-2 right-2">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    hotel.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : hotel.status === 'MAINTENANCE'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {toTitleCase(hotel.status)}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-2 gap-4">
                <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                <div className="flex items-center shrink-0">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm text-gray-600">{hotel.rating ?? 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-600 mb-2">
                <MapPinIcon className="h-4 w-4 mr-1" />
                {hotel.location}, {hotel.country}
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{hotel.shortDescription || hotel.description || 'No booking copy added yet.'}</p>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p><span className="font-medium">Rooms:</span> {hotel.rooms}</p>
                <p><span className="font-medium">Phone:</span> {hotel.phone || 'Not set'}</p>
                <p><span className="font-medium">Email:</span> {hotel.email || 'Not set'}</p>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {hotel.amenities.slice(0, 3).map((amenity) => (
                  <span key={amenity} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">
                    {amenity}
                  </span>
                ))}
                {hotel.amenities.length > 3 && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">+{hotel.amenities.length - 3} more</span>}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button onClick={() => { setSelectedHotel(hotel); setShowDetails(true) }} className="text-primary-600 hover:text-primary-800">
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => openEditHotel(hotel)} className="text-blue-600 hover:text-blue-800">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDeleteHotel(hotel.id)} className="text-red-600 hover:text-red-800">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showDetails && selectedHotel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Hotel Details - {selectedHotel.name}</h3>
                <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>

              <div className="space-y-4">
                <img src={getHotelImage(selectedHotel) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'} alt={selectedHotel.name} className="w-full h-64 object-cover rounded-lg" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedHotel.name}</p>
                      <p><span className="font-medium">Location:</span> {selectedHotel.location}, {selectedHotel.country}</p>
                      <p><span className="font-medium">Address:</span> {selectedHotel.address || 'Not set'}</p>
                      <p><span className="font-medium">Phone:</span> {selectedHotel.phone || 'Not set'}</p>
                      <p><span className="font-medium">Email:</span> {selectedHotel.email || 'Not set'}</p>
                      <p><span className="font-medium">Rooms:</span> {selectedHotel.rooms}</p>
                      <p><span className="font-medium">Rating:</span> {selectedHotel.rating ?? 'Not set'}</p>
                      <p><span className="font-medium">Status:</span> {toTitleCase(selectedHotel.status)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Booking Content</h4>
                    <div className="space-y-3 text-sm text-gray-700">
                      <p><span className="font-medium">Short Description:</span> {selectedHotel.shortDescription || 'Not set'}</p>
                      <p><span className="font-medium">Description:</span> {selectedHotel.description || 'Not set'}</p>
                      <p><span className="font-medium">Hero Image:</span> {selectedHotel.heroImage || 'Not set'}</p>
                      <p><span className="font-medium">Gallery Images:</span> {selectedHotel.galleryImages.length ? selectedHotel.galleryImages.join(', ') : 'Not set'}</p>
                      <p><span className="font-medium">Nearby Places:</span> {selectedHotel.nearbyPlaces ? 'Configured' : 'Not set'}</p>
                      <p><span className="font-medium">Booking Extras:</span> {selectedHotel.bookingExtras ? 'Configured' : 'Not set'}</p>
                      <p><span className="font-medium">Booking Defaults:</span> {selectedHotel.bookingDefaults ? 'Configured' : 'Not set'}</p>
                      <p><span className="font-medium">Hotel Detail Content:</span> {selectedHotel.detailContent ? 'Configured' : 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedHotel.amenities.map((amenity) => (
                      <span key={amenity} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">{amenity}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setShowDetails(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">Close</button>
                <button onClick={() => { setShowDetails(false); openEditHotel(selectedHotel) }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Edit Hotel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHotelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{hotelForm.id ? 'Edit Hotel' : 'Add New Hotel'}</h3>
                <button onClick={() => setShowHotelModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>

              <form className="space-y-4" onSubmit={submitHotel}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Hotel name" required value={hotelForm.name} onChange={(e) => setHotelForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md" required value={hotelForm.locationId} onChange={(e) => setHotelForm((prev) => ({ ...prev, locationId: e.target.value }))}>
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}, {location.country.name}</option>
                    ))}
                  </select>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2" placeholder="Address" value={hotelForm.address} onChange={(e) => setHotelForm((prev) => ({ ...prev, address: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Phone" value={hotelForm.phone} onChange={(e) => setHotelForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Email" value={hotelForm.email} onChange={(e) => setHotelForm((prev) => ({ ...prev, email: e.target.value }))} />
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md" value={hotelForm.status} onChange={(e) => setHotelForm((prev) => ({ ...prev, status: e.target.value as HotelStatus }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Rating" value={hotelForm.rating} onChange={(e) => setHotelForm((prev) => ({ ...prev, rating: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2" placeholder="Amenities (comma separated)" value={hotelForm.amenities} onChange={(e) => setHotelForm((prev) => ({ ...prev, amenities: e.target.value }))} />
                  <div className="md:col-span-2 grid gap-4 lg:grid-cols-[220px,1fr]">
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-medium text-gray-700">Primary Image</p>
                      {primaryImagePreview ? (
                        <img src={primaryImagePreview} alt={hotelForm.name || 'Primary preview'} className="h-36 w-full rounded-md object-cover" />
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded-md bg-white text-gray-300">
                          <PhotoIcon className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Primary Image
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 block w-full text-sm text-gray-600"
                          onChange={(event) =>
                            handleSingleImageChange(
                              event,
                              primaryImagePreview,
                              setPrimaryImageFile,
                              setPrimaryImagePreview,
                              hotelForm.image ? getApiAssetUrl(hotelForm.image) : ''
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2 grid gap-4 lg:grid-cols-[220px,1fr]">
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-medium text-gray-700">Hero Image</p>
                      {heroImagePreview ? (
                        <img src={heroImagePreview} alt={hotelForm.name || 'Hero preview'} className="h-36 w-full rounded-md object-cover" />
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded-md bg-white text-gray-300">
                          <PhotoIcon className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Hero Image
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 block w-full text-sm text-gray-600"
                          onChange={(event) =>
                            handleSingleImageChange(
                              event,
                              heroImagePreview,
                              setHeroImageFile,
                              setHeroImagePreview,
                              hotelForm.heroImage ? getApiAssetUrl(hotelForm.heroImage) : ''
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2 grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Gallery Images
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="mt-1 block w-full text-sm text-gray-600"
                          onChange={handleGalleryImagesChange}
                        />
                      </label>
                    </div>
                    {galleryImagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {galleryImagePreviews.map((preview, index) => (
                          <img key={`${preview}-${index}`} src={preview} alt={`Gallery preview ${index + 1}`} className="h-24 w-full rounded-md object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2" placeholder="Short description for cards and booking header" value={hotelForm.shortDescription} onChange={(e) => setHotelForm((prev) => ({ ...prev, shortDescription: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 min-h-[140px]" placeholder="Full hotel description for booking modal and hotel detail page" value={hotelForm.description} onChange={(e) => setHotelForm((prev) => ({ ...prev, description: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 min-h-[120px] font-mono text-xs" placeholder='Nearby places JSON, e.g. [{"name":"Old Town","distance":"1.5 km"}]' value={hotelForm.nearbyPlacesJson} onChange={(e) => setHotelForm((prev) => ({ ...prev, nearbyPlacesJson: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 min-h-[120px] font-mono text-xs" placeholder='Booking extras JSON, e.g. [{"id":"breakfast","name":"Breakfast","description":"...","price":14,"priceType":"per adult per morning","image":"/img.png"}]' value={hotelForm.bookingExtrasJson} onChange={(e) => setHotelForm((prev) => ({ ...prev, bookingExtrasJson: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 min-h-[120px] font-mono text-xs" placeholder='Booking defaults JSON, e.g. {"arrivalDate":"14/01/2026","nights":1,"adults":1}' value={hotelForm.bookingDefaultsJson} onChange={(e) => setHotelForm((prev) => ({ ...prev, bookingDefaultsJson: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2" placeholder="Hero sale text" value={hotelForm.saleText} onChange={(e) => setHotelForm((prev) => ({ ...prev, saleText: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2" placeholder="About section title" value={hotelForm.aboutTitle} onChange={(e) => setHotelForm((prev) => ({ ...prev, aboutTitle: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Rooms section title" value={hotelForm.roomsTitle} onChange={(e) => setHotelForm((prev) => ({ ...prev, roomsTitle: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[110px]" placeholder="Rooms section description" value={hotelForm.roomsDescription} onChange={(e) => setHotelForm((prev) => ({ ...prev, roomsDescription: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Dining title" value={hotelForm.diningTitle} onChange={(e) => setHotelForm((prev) => ({ ...prev, diningTitle: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Dining subtitle" value={hotelForm.diningSubtitle} onChange={(e) => setHotelForm((prev) => ({ ...prev, diningSubtitle: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 min-h-[110px]" placeholder="Dining description" value={hotelForm.diningDescription} onChange={(e) => setHotelForm((prev) => ({ ...prev, diningDescription: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Business section title" value={hotelForm.businessTitle} onChange={(e) => setHotelForm((prev) => ({ ...prev, businessTitle: e.target.value }))} />
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Business section subtitle" value={hotelForm.businessSubtitle} onChange={(e) => setHotelForm((prev) => ({ ...prev, businessSubtitle: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 min-h-[110px]" placeholder="Business section description" value={hotelForm.businessDescription} onChange={(e) => setHotelForm((prev) => ({ ...prev, businessDescription: e.target.value }))} />
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 min-h-[110px]" placeholder="Accessibility section text" value={hotelForm.accessibilityText} onChange={(e) => setHotelForm((prev) => ({ ...prev, accessibilityText: e.target.value }))} />
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowHotelModal(false)} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60">
                    {saving ? 'Saving...' : hotelForm.id ? 'Update Hotel' : 'Create Hotel'}
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
