const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const isLocalHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

const normalizeAssetPath = (value: string) => encodeURI(value.trim().replace(/\\/g, '/'))

export function getApiAssetUrl(path?: string | null) {
  if (!path) return ''

  const normalizedPath = normalizeAssetPath(path)

  try {
    const directUrl = new URL(normalizedPath)

    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      directUrl.protocol === 'http:' &&
      !isLocalHost(directUrl.hostname)
    ) {
      directUrl.protocol = 'https:'
    }

    return directUrl.toString()
  } catch {
    const baseUrl = new URL(API_BASE_URL)
    const assetUrl = new URL(normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`, baseUrl)

    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      assetUrl.protocol === 'http:' &&
      !isLocalHost(assetUrl.hostname)
    ) {
      assetUrl.protocol = 'https:'
    }

    return assetUrl.toString()
  }
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function getAdminMe(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING'

export interface RoomTypeOption {
  id: string
  name: string
  description: string | null
  createdAt: string | null
  updatedAt: string | null
  derived: boolean
}

export interface Room {
  id: string
  hotelId: string | null
  hotelName?: string
  locationName?: string
  countryName?: string
  name: string
  roomNumber: string
  roomType: string
  capacity: number
  bedType: string
  size: string
  price: number
  status: RoomStatus
  description: string | null
  amenities: string[]
  images: string[]
  createdAt: string
  updatedAt: string
}

export interface RoomPayload {
  hotelId: string
  name: string
  roomNumber?: string
  roomNumbers?: string[]
  roomCount?: number
  roomType: string
  capacity: number
  bedType: string
  size: string
  price: number
  status: RoomStatus
  description?: string
  amenities: string[]
  images?: string[]
}

export async function fetchAdminRooms(token: string, query: Record<string, string> = {}) {
  const queryString = new URLSearchParams(query).toString()
  const url = `${API_BASE_URL}/api/v1/admin/rooms${queryString ? `?${queryString}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function fetchAdminRoomTypes(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/types`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createAdminRoom(token: string, payload: RoomPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateAdminRoom(token: string, roomId: string, payload: Partial<RoomPayload>) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/${roomId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteAdminRoom(token: string, roomId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/rooms/${roomId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export type HotelStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface CountryTree {
  id: string
  name: string
  code: string
  flag?: string | null
  locations: Array<{
    id: string
    name: string
    active: boolean
    hotels: number
  }>
}

export interface LocationOption {
  id: string
  name: string
  active: boolean
  hotels: number
  countryId: string
  country: {
    id: string
    name: string
    code: string
  }
}

export interface Hotel {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  status: HotelStatus
  rating?: number | null
  amenities: string[]
  image?: string | null
  shortDescription?: string | null
  description?: string | null
  heroImage?: string | null
  galleryImages: string[]
  nearbyPlaces?: unknown
  bookingExtras?: unknown
  bookingDefaults?: unknown
  locationId: string
  location: string
  country: string
  rooms: number
}

export async function fetchCountriesTree(token: string, search = '') {
  const query = new URLSearchParams()
  if (search.trim()) query.set('search', search.trim())
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries/tree?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createCountry(token: string, payload: { name: string; code: string; flag?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateCountry(token: string, id: string, payload: { name?: string; code?: string; flag?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteCountry(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/countries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function fetchLocations(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createLocation(token: string, payload: { name: string; countryId: string; active: boolean }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateLocation(
  token: string,
  id: string,
  payload: { name?: string; countryId?: string; active?: boolean }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteLocation(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/locations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function fetchHotels(token: string, search = '') {
  const query = new URLSearchParams()
  if (search.trim()) query.set('search', search.trim())
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createHotel(
  token: string,
  payload: {
    name: string
    locationId: string
    address?: string
    phone?: string
    email?: string
    status?: HotelStatus
    rating?: number
    amenities?: string[]
    image?: string
    shortDescription?: string
    description?: string
    heroImage?: string
    galleryImages?: string[]
    nearbyPlaces?: unknown
    bookingExtras?: unknown
    bookingDefaults?: unknown
  }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateHotel(
  token: string,
  id: string,
  payload: {
    name?: string
    locationId?: string
    address?: string
    phone?: string
    email?: string
    status?: HotelStatus
    rating?: number
    amenities?: string[]
    image?: string
    shortDescription?: string
    description?: string
    heroImage?: string
    galleryImages?: string[]
    nearbyPlaces?: unknown
    bookingExtras?: unknown
    bookingDefaults?: unknown
  }
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function deleteHotel(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/properties/hotels/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export type HomePageSectionType =
  | 'HERO'
  | 'TEXT'
  | 'CARD'
  | 'FEATURE'
  | 'CTA'
  | 'LOCATION'
  | 'FOOTER'
  | 'NEWSLETTER'
  | 'CUSTOM'

export type HomePageSectionStatus = 'ACTIVE' | 'INACTIVE'

export interface HomePageSection {
  id: string
  name: string
  sectionKey: string
  groupKey: string
  sectionType: HomePageSectionType
  status: HomePageSectionStatus
  sortOrder: number
  badge: string | null
  eyebrow: string | null
  title: string | null
  subtitle: string | null
  description: string | null
  buttonLabel: string | null
  buttonLink: string | null
  secondaryButtonLabel: string | null
  secondaryButtonLink: string | null
  image: string | null
  imageAlt: string | null
  content: unknown
  createdAt: string
  updatedAt: string
}

export interface HomePageSectionPayload {
  name: string
  sectionKey: string
  groupKey: string
  sectionType: HomePageSectionType
  status: HomePageSectionStatus
  sortOrder: number
  badge?: string
  eyebrow?: string
  title?: string
  subtitle?: string
  description?: string
  buttonLabel?: string
  buttonLink?: string
  secondaryButtonLabel?: string
  secondaryButtonLink?: string
  imageAlt?: string
  content?: string
  removeImage?: boolean
  image?: File | null
}

const buildHomePageSectionFormData = (payload: Partial<HomePageSectionPayload>) => {
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (value instanceof File) {
      formData.append(key, value)
      return
    }
    formData.append(key, String(value))
  })

  return formData
}

export async function fetchAdminHomePageSections(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function createAdminHomePageSection(token: string, payload: HomePageSectionPayload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: buildHomePageSectionFormData(payload),
  })
  return res.json()
}

export async function updateAdminHomePageSection(
  token: string,
  id: string,
  payload: Partial<HomePageSectionPayload>
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: buildHomePageSectionFormData(payload),
  })
  return res.json()
}

export async function deleteAdminHomePageSection(token: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/homepage/sections/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function fetchPublicHomePageSections() {
  const res = await fetch(`${API_BASE_URL}/api/v1/homepage/sections`)
  return res.json()
}

export async function uploadHomepageSectionImage(file: File) {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_BASE_URL}/upload-image-multer`, {
    method: 'POST',
    body: formData,
  })

  return res.json()
}
