'use client'

import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react'
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
  XMarkIcon,
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

type NearbyPlace = { name: string; distance: string }

type HotelForm = {
  id: string
  propertyId: string
  name: string
  locationId: string
  address: string
  phone: string
  email: string
  status: HotelStatus
  rating: string
  amenities: string[]
  image: string
  heroImage: string
  galleryImages: string
  shortDescription: string
  description: string
  nearbyPlaces: NearbyPlace[]
  bookingDefaultArrivalDate: string
  bookingDefaultNights: string
  bookingDefaultAdults: string
  saleText: string
  aboutTitle: string
  roomsTitle: string
  roomsDescription: string
  diningTitle: string
  diningSubtitle: string
  diningDescription: string
  diningImage: string
  businessTitle: string
  businessSubtitle: string
  businessDescription: string
  businessImage: string
  accessibilityText: string
  accessibilityImage: string
  childrenAllowed: boolean
  childrenPrice: string
  adultMinAge: string
  allowOlderChildren: boolean
}

const EMPTY_HOTEL: HotelForm = {
  id: '',
  propertyId: '',
  name: '',
  locationId: '',
  address: '',
  phone: '',
  email: '',
  status: 'ACTIVE',
  rating: '',
  amenities: [],
  image: '',
  heroImage: '',
  galleryImages: '',
  shortDescription: '',
  description: '',
  nearbyPlaces: [],
  bookingDefaultArrivalDate: '',
  bookingDefaultNights: '1',
  bookingDefaultAdults: '2',
  saleText: '',
  aboutTitle: '',
  roomsTitle: '',
  roomsDescription: '',
  diningTitle: '',
  diningSubtitle: '',
  diningDescription: '',
  diningImage: '',
  businessTitle: '',
  businessSubtitle: '',
  businessDescription: '',
  businessImage: '',
  accessibilityText: '',
  accessibilityImage: '',
  childrenAllowed: true,
  childrenPrice: '0',
  adultMinAge: '13',
  allowOlderChildren: true,
}

const parseCsv = (value: string) =>
  value.split(',').map((item) => item.trim()).filter(Boolean)

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const getHotelImage = (hotel: Hotel) => getApiAssetUrl(hotel.image || hotel.heroImage || hotel.galleryImages[0])

const parseBookingDefaults = (raw: unknown) => {
  const rec = asRecord(raw)
  return {
    arrivalDate: typeof rec?.arrivalDate === 'string' ? rec.arrivalDate : '',
    nights: rec?.nights != null ? String(rec.nights) : '1',
    adults: rec?.adults != null ? String(rec.adults) : '2',
  }
}

const parseNearbyPlaces = (raw: unknown): NearbyPlace[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const name = typeof r.name === 'string' ? r.name.trim() : ''
      const distance = typeof r.distance === 'string' ? r.distance.trim() : ''
      if (!name) return null
      return { name, distance }
    })
    .filter((p): p is NearbyPlace => p !== null)
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 border-t border-gray-200 pt-5 mt-2">
      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{children}</h4>
    </div>
  )
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
  const [newAmenity, setNewAmenity] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([])
  const [diningImageFile, setDiningImageFile] = useState<File | null>(null)
  const [businessImageFile, setBusinessImageFile] = useState<File | null>(null)
  const [accessibilityImageFile, setAccessibilityImageFile] = useState<File | null>(null)
  const [primaryImagePreview, setPrimaryImagePreview] = useState('')
  const [heroImagePreview, setHeroImagePreview] = useState('')
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([])
  const [diningImagePreview, setDiningImagePreview] = useState('')
  const [businessImagePreview, setBusinessImagePreview] = useState('')
  const [accessibilityImagePreview, setAccessibilityImagePreview] = useState('')

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

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    return () => {
      if (primaryImagePreview.startsWith('blob:')) URL.revokeObjectURL(primaryImagePreview)
      if (heroImagePreview.startsWith('blob:')) URL.revokeObjectURL(heroImagePreview)
      galleryImagePreviews.forEach((p) => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) })
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

  const totalRooms = useMemo(() => hotels.reduce((sum, h) => sum + h.rooms, 0), [hotels])
  const averageRating = useMemo(() => {
    const rated = hotels.filter((h) => typeof h.rating === 'number')
    if (!rated.length) return '0.0'
    return (rated.reduce((sum, h) => sum + (h.rating || 0), 0) / rated.length).toFixed(1)
  }, [hotels])

  const resetImageState = () => {
    setPrimaryImageFile(null)
    setHeroImageFile(null)
    setGalleryImageFiles([])
    setDiningImageFile(null)
    setBusinessImageFile(null)
    setAccessibilityImageFile(null)
    setPrimaryImagePreview('')
    setHeroImagePreview('')
    setGalleryImagePreviews([])
    setDiningImagePreview('')
    setBusinessImagePreview('')
    setAccessibilityImagePreview('')
  }

  const openAddHotel = () => {
    setHotelForm({ ...EMPTY_HOTEL, locationId: locations[0]?.id || '' })
    setNewAmenity('')
    setFormError('')
    resetImageState()
    setShowHotelModal(true)
  }

  const openEditHotel = (hotel: Hotel) => {
    const detailContent = asRecord(hotel.detailContent)
    const defaults = parseBookingDefaults(hotel.bookingDefaults)
    setHotelForm({
      id: hotel.id,
      propertyId: hotel.propertyId || '',
      name: hotel.name,
      locationId: hotel.locationId,
      address: hotel.address || '',
      phone: hotel.phone || '',
      email: hotel.email || '',
      status: hotel.status,
      rating: hotel.rating != null ? String(hotel.rating) : '',
      amenities: hotel.amenities || [],
      image: hotel.image || '',
      heroImage: hotel.heroImage || '',
      galleryImages: hotel.galleryImages.join(', '),
      shortDescription: hotel.shortDescription || '',
      description: hotel.description || '',
      nearbyPlaces: parseNearbyPlaces(hotel.nearbyPlaces),
      bookingDefaultArrivalDate: defaults.arrivalDate,
      bookingDefaultNights: defaults.nights,
      bookingDefaultAdults: defaults.adults,
      saleText: typeof detailContent?.saleText === 'string' ? detailContent.saleText : '',
      aboutTitle: typeof detailContent?.aboutTitle === 'string' ? detailContent.aboutTitle : '',
      roomsTitle: typeof detailContent?.roomsTitle === 'string' ? detailContent.roomsTitle : '',
      roomsDescription: typeof detailContent?.roomsDescription === 'string' ? detailContent.roomsDescription : '',
      diningTitle: typeof detailContent?.diningTitle === 'string' ? detailContent.diningTitle : '',
      diningSubtitle: typeof detailContent?.diningSubtitle === 'string' ? detailContent.diningSubtitle : '',
      diningDescription: typeof detailContent?.diningDescription === 'string' ? detailContent.diningDescription : '',
      diningImage: typeof detailContent?.diningImage === 'string' ? detailContent.diningImage : '',
      businessTitle: typeof detailContent?.businessTitle === 'string' ? detailContent.businessTitle : '',
      businessSubtitle: typeof detailContent?.businessSubtitle === 'string' ? detailContent.businessSubtitle : '',
      businessDescription: typeof detailContent?.businessDescription === 'string' ? detailContent.businessDescription : '',
      businessImage: typeof detailContent?.businessImage === 'string' ? detailContent.businessImage : '',
      accessibilityText: typeof detailContent?.accessibilityText === 'string' ? detailContent.accessibilityText : '',
      accessibilityImage: typeof detailContent?.accessibilityImage === 'string' ? detailContent.accessibilityImage : '',
      childrenAllowed: hotel.childrenAllowed !== false,
      childrenPrice: String(hotel.childrenPrice ?? 0),
      adultMinAge: String(hotel.adultMinAge ?? 13),
      allowOlderChildren: hotel.allowOlderChildren !== false,
    })
    setNewAmenity('')
    setFormError('')
    setPrimaryImagePreview(hotel.image ? getApiAssetUrl(hotel.image) : '')
    setHeroImagePreview(hotel.heroImage ? getApiAssetUrl(hotel.heroImage) : '')
    setGalleryImagePreviews(hotel.galleryImages.map((img) => getApiAssetUrl(img)).filter(Boolean))
    const dc2 = asRecord(hotel.detailContent)
    setDiningImagePreview(typeof dc2?.diningImage === 'string' && dc2.diningImage ? getApiAssetUrl(dc2.diningImage) : '')
    setBusinessImagePreview(typeof dc2?.businessImage === 'string' && dc2.businessImage ? getApiAssetUrl(dc2.businessImage) : '')
    setAccessibilityImagePreview(typeof dc2?.accessibilityImage === 'string' && dc2.accessibilityImage ? getApiAssetUrl(dc2.accessibilityImage) : '')
    setPrimaryImageFile(null)
    setHeroImageFile(null)
    setGalleryImageFiles([])
    setDiningImageFile(null)
    setBusinessImageFile(null)
    setAccessibilityImageFile(null)
    setShowHotelModal(true)
  }

  const handleSingleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
    currentPreview: string,
    setFile: (f: File | null) => void,
    setPreview: (p: string) => void,
    fallbackUrl = ''
  ) => {
    const file = event.target.files?.[0] || null
    setFile(file)
    if (currentPreview.startsWith('blob:')) URL.revokeObjectURL(currentPreview)
    if (file) { setPreview(URL.createObjectURL(file)); return }
    setPreview(fallbackUrl)
  }

  const handleGalleryImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    galleryImagePreviews.forEach((p) => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) })
    setGalleryImageFiles(files)
    if (files.length > 0) {
      setGalleryImagePreviews(files.map((f) => URL.createObjectURL(f)))
      return
    }
    setGalleryImagePreviews(parseCsv(hotelForm.galleryImages).map((img) => getApiAssetUrl(img)).filter(Boolean))
  }

  const addAmenity = () => {
    const val = newAmenity.trim()
    if (!val || hotelForm.amenities.includes(val)) { setNewAmenity(''); return }
    setHotelForm((prev) => ({ ...prev, amenities: [...prev.amenities, val] }))
    setNewAmenity('')
  }

  const removeAmenity = (amenity: string) => {
    setHotelForm((prev) => ({ ...prev, amenities: prev.amenities.filter((a) => a !== amenity) }))
  }

  const addNearbyPlace = () => {
    setHotelForm((prev) => ({ ...prev, nearbyPlaces: [...prev.nearbyPlaces, { name: '', distance: '' }] }))
  }

  const updateNearbyPlace = (index: number, field: keyof NearbyPlace, value: string) => {
    setHotelForm((prev) => {
      const updated = [...prev.nearbyPlaces]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, nearbyPlaces: updated }
    })
  }

  const removeNearbyPlace = (index: number) => {
    setHotelForm((prev) => ({ ...prev, nearbyPlaces: prev.nearbyPlaces.filter((_, i) => i !== index) }))
  }

  const submitHotel = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return

    setSaving(true)
    setFormError('')
    try {
      let primaryImagePath = hotelForm.image.trim()
      let heroImagePath = hotelForm.heroImage.trim()
      let galleryImagePaths = parseCsv(hotelForm.galleryImages)

      if (primaryImageFile) {
        const r = await uploadRoomImage(primaryImageFile)
        if (!r.success || !r.data?.fileUrl) { setFormError(r.message || 'Failed to upload primary image.'); return }
        primaryImagePath = r.data.fileUrl
      }
      if (heroImageFile) {
        const r = await uploadRoomImage(heroImageFile)
        if (!r.success || !r.data?.fileUrl) { setFormError(r.message || 'Failed to upload hero image.'); return }
        heroImagePath = r.data.fileUrl
      }
      if (galleryImageFiles.length > 0) {
        const paths: string[] = []
        for (const file of galleryImageFiles) {
          const r = await uploadRoomImage(file)
          if (!r.success || !r.data?.fileUrl) { setFormError(r.message || 'Failed to upload gallery image.'); return }
          paths.push(r.data.fileUrl)
        }
        galleryImagePaths = paths
      }

      let diningImagePath = hotelForm.diningImage.trim()
      let businessImagePath = hotelForm.businessImage.trim()
      let accessibilityImagePath = hotelForm.accessibilityImage.trim()

      if (diningImageFile) {
        const r = await uploadRoomImage(diningImageFile)
        if (!r.success || !r.data?.fileUrl) { setFormError(r.message || 'Failed to upload dining image.'); return }
        diningImagePath = r.data.fileUrl
      }
      if (businessImageFile) {
        const r = await uploadRoomImage(businessImageFile)
        if (!r.success || !r.data?.fileUrl) { setFormError(r.message || 'Failed to upload business image.'); return }
        businessImagePath = r.data.fileUrl
      }
      if (accessibilityImageFile) {
        const r = await uploadRoomImage(accessibilityImageFile)
        if (!r.success || !r.data?.fileUrl) { setFormError(r.message || 'Failed to upload accessibility image.'); return }
        accessibilityImagePath = r.data.fileUrl
      }

      const nearbyPlaces = hotelForm.nearbyPlaces.filter((p) => p.name.trim())

      const bookingDefaults = (() => {
        const d = hotelForm.bookingDefaultArrivalDate.trim()
        const n = hotelForm.bookingDefaultNights.trim()
        const a = hotelForm.bookingDefaultAdults.trim()
        if (!d && !n && !a) return undefined
        return { arrivalDate: d || undefined, nights: n ? Number(n) : undefined, adults: a ? Number(a) : undefined }
      })()

      const payload = {
        name: hotelForm.name.trim(),
        locationId: hotelForm.locationId,
        address: hotelForm.address.trim(),
        phone: hotelForm.phone.trim(),
        email: hotelForm.email.trim(),
        status: hotelForm.status,
        rating: hotelForm.rating ? Number(hotelForm.rating) : undefined,
        amenities: hotelForm.amenities,
        image: primaryImagePath,
        heroImage: heroImagePath,
        galleryImages: galleryImagePaths,
        shortDescription: hotelForm.shortDescription.trim(),
        description: hotelForm.description.trim(),
        nearbyPlaces,
        bookingDefaults,
        detailContent: {
          saleText: hotelForm.saleText.trim() || null,
          aboutTitle: hotelForm.aboutTitle.trim() || null,
          roomsTitle: hotelForm.roomsTitle.trim() || null,
          roomsDescription: hotelForm.roomsDescription.trim() || null,
          diningTitle: hotelForm.diningTitle.trim() || null,
          diningSubtitle: hotelForm.diningSubtitle.trim() || null,
          diningDescription: hotelForm.diningDescription.trim() || null,
          diningImage: diningImagePath || null,
          businessTitle: hotelForm.businessTitle.trim() || null,
          businessSubtitle: hotelForm.businessSubtitle.trim() || null,
          businessDescription: hotelForm.businessDescription.trim() || null,
          businessImage: businessImagePath || null,
          accessibilityText: hotelForm.accessibilityText.trim() || null,
          accessibilityImage: accessibilityImagePath || null,
        },
        childrenAllowed: hotelForm.childrenAllowed,
        childrenPrice: Number(hotelForm.childrenPrice) || 0,
        adultMinAge: Number(hotelForm.adultMinAge) || 13,
        allowOlderChildren: hotelForm.allowOlderChildren,
      }

      const result = hotelForm.id
        ? await updateHotel(token, hotelForm.id, payload)
        : await createHotel(token, payload)

      if (!result.success) { setFormError(result.message || 'Failed to save hotel.'); return }

      setShowHotelModal(false)
      resetImageState()
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
    if (!result.success) { setError(result.message || 'Failed to delete hotel.'); return }
    await loadData()
  }

  const field = (key: keyof HotelForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setHotelForm((prev) => ({ ...prev, [key]: e.target.value }))

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading hotels...</div>

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
              <p className="text-2xl font-bold text-gray-900">{hotels.filter((h) => h.status === 'ACTIVE').length}</p>
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
          <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredHotels.map((hotel) => (
          <div key={hotel.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              <img src={getHotelImage(hotel) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'} alt={hotel.name} className="w-full h-48 object-cover" />
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${hotel.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : hotel.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
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
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{hotel.shortDescription || hotel.description || 'No description added yet.'}</p>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p><span className="font-medium">Rooms:</span> {hotel.rooms}</p>
                <p><span className="font-medium">Phone:</span> {hotel.phone || 'Not set'}</p>
                <p><span className="font-medium">Email:</span> {hotel.email || 'Not set'}</p>
              </div>
              <div className="flex flex-wrap gap-1 mb-4">
                {hotel.amenities.slice(0, 3).map((amenity) => (
                  <span key={amenity} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">{amenity}</span>
                ))}
                {hotel.amenities.length > 3 && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">+{hotel.amenities.length - 3} more</span>}
              </div>
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
        ))}
      </div>

      {/* Details Modal */}
      {showDetails && selectedHotel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Hotel Details — {selectedHotel.name}</h3>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="space-y-4">
              <img src={getHotelImage(selectedHotel) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'} alt={selectedHotel.name} className="w-full h-64 object-cover rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p><span className="font-medium">Name:</span> {selectedHotel.name}</p>
                  <p><span className="font-medium">Location:</span> {selectedHotel.location}, {selectedHotel.country}</p>
                  <p><span className="font-medium">Address:</span> {selectedHotel.address || 'Not set'}</p>
                  <p><span className="font-medium">Phone:</span> {selectedHotel.phone || 'Not set'}</p>
                  <p><span className="font-medium">Email:</span> {selectedHotel.email || 'Not set'}</p>
                  <p><span className="font-medium">Rating:</span> {selectedHotel.rating ?? 'Not set'}</p>
                  <p><span className="font-medium">Status:</span> {toTitleCase(selectedHotel.status)}</p>
                  <p><span className="font-medium">Children Allowed:</span> {selectedHotel.childrenAllowed ? 'Yes' : 'No'}</p>
                </div>
                <div className="space-y-1">
                  <p><span className="font-medium">Short Description:</span> {selectedHotel.shortDescription || 'Not set'}</p>
                  <p><span className="font-medium">Nearby Places:</span> {Array.isArray(selectedHotel.nearbyPlaces) && selectedHotel.nearbyPlaces.length ? `${selectedHotel.nearbyPlaces.length} place(s)` : 'Not set'}</p>
                  <p><span className="font-medium">Booking Extras:</span> {Array.isArray(selectedHotel.bookingExtras) && selectedHotel.bookingExtras.length ? `${selectedHotel.bookingExtras.length} extra(s)` : 'Not set'}</p>
                  <p><span className="font-medium">Detail Content:</span> {selectedHotel.detailContent ? 'Configured' : 'Not set'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedHotel.amenities.map((amenity) => (
                    <span key={amenity} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">{amenity}</span>
                  ))}
                  {!selectedHotel.amenities.length && <span className="text-sm text-gray-400">None</span>}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowDetails(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">Close</button>
              <button onClick={() => { setShowDetails(false); openEditHotel(selectedHotel) }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Edit Hotel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showHotelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-6 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white mb-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{hotelForm.id ? 'Edit Hotel' : 'Add New Hotel'}</h3>
              <button onClick={() => setShowHotelModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-0" onSubmit={submitHotel}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── Basic Info ── */}
                <SectionHeading>Basic Information</SectionHeading>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name <span className="text-red-500">*</span></label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. Grand Luxotel Amsterdam" required value={hotelForm.name} onChange={field('name')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={hotelForm.propertyId}
                      placeholder="Will be generated automatically"
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500 cursor-not-allowed font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400"
                    />
                    <span title="Auto-generated, cannot be changed">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Auto-generated identifier — read only</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" required value={hotelForm.locationId} onChange={field('locationId')}>
                    <option value="">Select location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}, {l.country.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" value={hotelForm.status} onChange={field('status')}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
                  <input type="number" min="1" max="5" step="0.1" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. 4.5" value={hotelForm.rating} onChange={field('rating')} />
                </div>

                {/* ── Children Policy ── */}
                <SectionHeading>Children Policy</SectionHeading>

                <div className="col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setHotelForm((prev) => ({ ...prev, childrenAllowed: !prev.childrenAllowed }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hotelForm.childrenAllowed ? 'bg-primary-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hotelForm.childrenAllowed ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Children Allowed at this hotel</span>
                  </label>
                </div>

                {hotelForm.childrenAllowed && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Children Price per Night (£)</label>
                      <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="0.00" value={hotelForm.childrenPrice} onChange={field('childrenPrice')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adult Min Age (years)</label>
                      <input type="number" min="1" max="21" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="13" value={hotelForm.adultMinAge} onChange={field('adultMinAge')} />
                      <p className="text-xs text-gray-400 mt-1">Guests below this age are treated as children</p>
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div
                          onClick={() => setHotelForm((prev) => ({ ...prev, allowOlderChildren: !prev.allowOlderChildren }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hotelForm.allowOlderChildren ? 'bg-primary-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hotelForm.allowOlderChildren ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Allow older children (age 6+)</span>
                      </label>
                      <p className="text-xs text-gray-400 mt-1 ml-14">
                        {hotelForm.allowOlderChildren
                          ? 'Guests can add children under 6 or age 6 and up.'
                          : 'Only children under 6 can be added — no older child age band shown.'}
                      </p>
                    </div>
                  </>
                )}

                {/* ── Contact ── */}
                <SectionHeading>Contact Details</SectionHeading>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="Full street address" value={hotelForm.address} onChange={field('address')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="+44 20 0000 0000" value={hotelForm.phone} onChange={field('phone')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="info@hotel.com" value={hotelForm.email} onChange={field('email')} />
                </div>

                {/* ── Images ── */}
                <SectionHeading>Images</SectionHeading>

                {/* Primary Image */}
                <div className="col-span-2 grid gap-4 lg:grid-cols-[180px,1fr]">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Primary Image</p>
                    {primaryImagePreview ? (
                      <img src={primaryImagePreview} alt="Primary" className="h-32 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded bg-white text-gray-300">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Primary Image</label>
                    <p className="text-xs text-gray-400 mb-2">Shown on hotel cards and listing pages</p>
                    <input type="file" accept="image/*" className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-white file:text-sm file:text-gray-700 hover:file:bg-gray-50"
                      onChange={(e) => handleSingleImageChange(e, primaryImagePreview, setPrimaryImageFile, setPrimaryImagePreview, hotelForm.image ? getApiAssetUrl(hotelForm.image) : '')} />
                  </div>
                </div>

                {/* Hero Image */}
                <div className="col-span-2 grid gap-4 lg:grid-cols-[180px,1fr]">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Hero Image</p>
                    {heroImagePreview ? (
                      <img src={heroImagePreview} alt="Hero" className="h-32 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded bg-white text-gray-300">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Hero Image</label>
                    <p className="text-xs text-gray-400 mb-2">Large banner shown at the top of the hotel detail page</p>
                    <input type="file" accept="image/*" className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-white file:text-sm file:text-gray-700 hover:file:bg-gray-50"
                      onChange={(e) => handleSingleImageChange(e, heroImagePreview, setHeroImageFile, setHeroImagePreview, hotelForm.heroImage ? getApiAssetUrl(hotelForm.heroImage) : '')} />
                  </div>
                </div>

                {/* Gallery Images */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gallery Images</label>
                  <p className="text-xs text-gray-400 mb-2">Multiple images shown in the hotel gallery. Selecting new files replaces all existing gallery images.</p>
                  <input type="file" accept="image/*" multiple className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-white file:text-sm file:text-gray-700 hover:file:bg-gray-50"
                    onChange={handleGalleryImagesChange} />
                  {galleryImagePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
                      {galleryImagePreviews.map((preview, i) => (
                        <img key={`${preview}-${i}`} src={preview} alt={`Gallery ${i + 1}`} className="h-20 w-full rounded object-cover border border-gray-200" />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Descriptions ── */}
                <SectionHeading>Descriptions</SectionHeading>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                  <p className="text-xs text-gray-400 mb-1">Shown on hotel cards, booking header and search results</p>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="A short tagline for this hotel" value={hotelForm.shortDescription} onChange={field('shortDescription')} />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Description</label>
                  <p className="text-xs text-gray-400 mb-1">Detailed text shown in the About section and booking modal</p>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="Full description of the hotel..." value={hotelForm.description} onChange={field('description')} />
                </div>

                {/* ── Amenities ── */}
                <SectionHeading>Amenities</SectionHeading>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Amenities</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      placeholder="e.g. Free Wi-Fi, Swimming Pool, Spa"
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity() } }}
                    />
                    <button type="button" onClick={addAmenity} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700">
                      Add
                    </button>
                  </div>
                  {hotelForm.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hotelForm.amenities.map((amenity) => (
                        <span key={amenity} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">
                          {amenity}
                          <button type="button" onClick={() => removeAmenity(amenity)} className="hover:text-primary-600 ml-1">
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {!hotelForm.amenities.length && <p className="text-sm text-gray-400">No amenities added yet.</p>}
                </div>

                {/* ── Nearby Places ── */}
                <SectionHeading>Nearby Places</SectionHeading>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Points of Interest</label>
                  <p className="text-xs text-gray-400 mb-3">These appear in the hotel details card on the detail page</p>
                  <div className="space-y-2">
                    {hotelForm.nearbyPlaces.map((place, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          placeholder="Place name (e.g. City Centre)"
                          value={place.name}
                          onChange={(e) => updateNearbyPlace(index, 'name', e.target.value)}
                        />
                        <input
                          className="w-36 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          placeholder="Distance (e.g. 0.5 km)"
                          value={place.distance}
                          onChange={(e) => updateNearbyPlace(index, 'distance', e.target.value)}
                        />
                        <button type="button" onClick={() => removeNearbyPlace(index)} className="p-2 text-red-500 hover:text-red-700">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addNearbyPlace} className="mt-3 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800">
                    <PlusIcon className="h-4 w-4" />
                    Add Place
                  </button>
                </div>

                {/* ── Booking Defaults ── */}
                <SectionHeading>Booking Defaults</SectionHeading>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Arrival Date</label>
                  <p className="text-xs text-gray-400 mb-1">Pre-fills the date in the booking widget (e.g. 14/01/2026)</p>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="DD/MM/YYYY" value={hotelForm.bookingDefaultArrivalDate} onChange={field('bookingDefaultArrivalDate')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Nights</label>
                    <input type="number" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="1" value={hotelForm.bookingDefaultNights} onChange={field('bookingDefaultNights')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Adults</label>
                    <input type="number" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="2" value={hotelForm.bookingDefaultAdults} onChange={field('bookingDefaultAdults')} />
                  </div>
                </div>

                {/* ── Page Content ── */}
                <SectionHeading>Hero &amp; About Section</SectionHeading>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hero Sale Text</label>
                  <p className="text-xs text-gray-400 mb-1">Promotional badge shown over the hero image (e.g. "Winter Sale Save 20%")</p>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. Winter Sale Save 20%" value={hotelForm.saleText} onChange={field('saleText')} />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Section Title</label>
                  <p className="text-xs text-gray-400 mb-1">Heading for the About section on the hotel detail page</p>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. A hotel like no other" value={hotelForm.aboutTitle} onChange={field('aboutTitle')} />
                </div>

                {/* ── Rooms Section ── */}
                <SectionHeading>Rooms Section</SectionHeading>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. A room designed with you in mind" value={hotelForm.roomsTitle} onChange={field('roomsTitle')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Description</label>
                  <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="Short introductory text for the rooms section" value={hotelForm.roomsDescription} onChange={field('roomsDescription')} />
                </div>

                {/* ── Dining Section ── */}
                <SectionHeading>Dining Section</SectionHeading>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. Carefully" value={hotelForm.diningTitle} onChange={field('diningTitle')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (bold)</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. Selected For You" value={hotelForm.diningSubtitle} onChange={field('diningSubtitle')} />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="Describe the dining experience at this hotel" value={hotelForm.diningDescription} onChange={field('diningDescription')} />
                </div>

                <div className="col-span-2 grid gap-4 lg:grid-cols-[180px,1fr]">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Dining Background Image</p>
                    {diningImagePreview ? (
                      <img src={diningImagePreview} alt="Dining" className="h-32 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded bg-white text-gray-300">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Dining Background Image</label>
                    <p className="text-xs text-gray-400 mb-2">Full-width background image for the Dining section on the hotel page</p>
                    <input type="file" accept="image/*" className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-white file:text-sm file:text-gray-700 hover:file:bg-gray-50"
                      onChange={(e) => handleSingleImageChange(e, diningImagePreview, setDiningImageFile, setDiningImagePreview, hotelForm.diningImage ? getApiAssetUrl(hotelForm.diningImage) : '')} />
                  </div>
                </div>

                {/* ── Business Section ── */}
                <SectionHeading>Business &amp; Events Section</SectionHeading>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. Business done" value={hotelForm.businessTitle} onChange={field('businessTitle')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (bold)</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. personally" value={hotelForm.businessSubtitle} onChange={field('businessSubtitle')} />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="Describe business and events facilities" value={hotelForm.businessDescription} onChange={field('businessDescription')} />
                </div>

                <div className="col-span-2 grid gap-4 lg:grid-cols-[180px,1fr]">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Business Background Image</p>
                    {businessImagePreview ? (
                      <img src={businessImagePreview} alt="Business" className="h-32 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded bg-white text-gray-300">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Business Background Image</label>
                    <p className="text-xs text-gray-400 mb-2">Full-width background image for the Business & Events section on the hotel page</p>
                    <input type="file" accept="image/*" className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-white file:text-sm file:text-gray-700 hover:file:bg-gray-50"
                      onChange={(e) => handleSingleImageChange(e, businessImagePreview, setBusinessImageFile, setBusinessImagePreview, hotelForm.businessImage ? getApiAssetUrl(hotelForm.businessImage) : '')} />
                  </div>
                </div>

                {/* ── Accessibility ── */}
                <SectionHeading>Accessibility Section</SectionHeading>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accessibility Text</label>
                  <p className="text-xs text-gray-400 mb-1">Statement shown in the accessibility section at the bottom of the hotel page</p>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="Describe accessibility features and commitments" value={hotelForm.accessibilityText} onChange={field('accessibilityText')} />
                </div>

                <div className="col-span-2 grid gap-4 lg:grid-cols-[180px,1fr]">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Accessibility Image</p>
                    {accessibilityImagePreview ? (
                      <img src={accessibilityImagePreview} alt="Accessibility" className="h-32 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded bg-white text-gray-300">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Accessibility Image</label>
                    <p className="text-xs text-gray-400 mb-2">Image shown in the Accessibility section at the bottom of the hotel page</p>
                    <input type="file" accept="image/*" className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-white file:text-sm file:text-gray-700 hover:file:bg-gray-50"
                      onChange={(e) => handleSingleImageChange(e, accessibilityImagePreview, setAccessibilityImageFile, setAccessibilityImagePreview, hotelForm.accessibilityImage ? getApiAssetUrl(hotelForm.accessibilityImage) : '')} />
                  </div>
                </div>

              </div>

              {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" onClick={() => setShowHotelModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60 text-sm">
                  {saving ? 'Saving...' : hotelForm.id ? 'Update Hotel' : 'Create Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
