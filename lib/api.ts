const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
  roomNumber: string
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
