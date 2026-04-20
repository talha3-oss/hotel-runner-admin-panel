'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import {
  CountryTree,
  createCountry,
  createHotel,
  createLocation,
  deleteCountry,
  deleteHotel,
  deleteLocation,
  fetchCountriesTree,
  fetchHotels,
  fetchLocations,
  getApiAssetUrl,
  Hotel,
  HotelStatus,
  LocationOption,
  updateCountry,
  updateHotel,
  updateLocation,
  uploadRoomImage,
} from '../../../lib/api'

type CountryForm = {
  id: string
  name: string
  code: string
  flag: string
}

type LocationForm = {
  id: string
  countryId: string
  name: string
  active: boolean
}

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
}

const EMPTY_COUNTRY: CountryForm = { id: '', name: '', code: '', flag: '' }
const EMPTY_LOCATION: LocationForm = { id: '', countryId: '', name: '', active: true }
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
}

const parseCsv = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean)

export default function LocationsPage() {
  const [activeTab, setActiveTab] = useState<'countries' | 'hotels'>('countries')
  const [searchTerm, setSearchTerm] = useState('')
  const [countries, setCountries] = useState<CountryTree[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showHotelModal, setShowHotelModal] = useState(false)

  const [countryForm, setCountryForm] = useState<CountryForm>(EMPTY_COUNTRY)
  const [locationForm, setLocationForm] = useState<LocationForm>(EMPTY_LOCATION)
  const [hotelForm, setHotelForm] = useState<HotelForm>(EMPTY_HOTEL)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedHotelImageFile, setSelectedHotelImageFile] = useState<File | null>(null)
  const [hotelImagePreview, setHotelImagePreview] = useState('')

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    try {
      setError('')
      const [countriesResult, locationsResult, hotelsResult] = await Promise.all([
        fetchCountriesTree(token),
        fetchLocations(token),
        fetchHotels(token),
      ])

      if (!countriesResult.success) throw new Error(countriesResult.message || 'Failed to load countries.')
      if (!locationsResult.success) throw new Error(locationsResult.message || 'Failed to load locations.')
      if (!hotelsResult.success) throw new Error(hotelsResult.message || 'Failed to load hotels.')

      setCountries(countriesResult.countries || [])
      setLocations(locationsResult.locations || [])
      setHotels(hotelsResult.hotels || [])
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return () => {
      if (hotelImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(hotelImagePreview)
      }
    }
  }, [hotelImagePreview])

  const filteredCountries = useMemo(() => {
    const query = searchTerm.toLowerCase()
    return countries.filter((country) => {
      return (
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.locations.some((location) => location.name.toLowerCase().includes(query))
      )
    })
  }, [countries, searchTerm])

  const filteredHotels = useMemo(() => {
    const query = searchTerm.toLowerCase()
    return hotels.filter((hotel) => {
      return (
        hotel.name.toLowerCase().includes(query) ||
        hotel.location.toLowerCase().includes(query) ||
        hotel.country.toLowerCase().includes(query)
      )
    })
  }, [hotels, searchTerm])

  const openAddCountry = () => {
    setCountryForm(EMPTY_COUNTRY)
    setFormError('')
    setShowCountryModal(true)
  }

  const openEditCountry = (country: CountryTree) => {
    setCountryForm({
      id: country.id,
      name: country.name,
      code: country.code,
      flag: country.flag || '',
    })
    setFormError('')
    setShowCountryModal(true)
  }

  const openAddLocation = () => {
    setLocationForm({ ...EMPTY_LOCATION, countryId: countries[0]?.id || '' })
    setFormError('')
    setShowLocationModal(true)
  }

  const openEditLocation = (countryId: string, location: CountryTree['locations'][number]) => {
    setLocationForm({
      id: location.id,
      countryId,
      name: location.name,
      active: location.active,
    })
    setFormError('')
    setShowLocationModal(true)
  }

  const openAddHotel = () => {
    setHotelForm({ ...EMPTY_HOTEL, locationId: locations[0]?.id || '' })
    setFormError('')
    setSelectedHotelImageFile(null)
    setHotelImagePreview('')
    setShowHotelModal(true)
  }

  const openEditHotel = (hotel: Hotel) => {
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
    })
    setFormError('')
    setSelectedHotelImageFile(null)
    setHotelImagePreview(hotel.image ? getApiAssetUrl(hotel.image) : '')
    setShowHotelModal(true)
  }

  const handleHotelImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null

    setSelectedHotelImageFile(file)
    setHotelImagePreview((currentPreview) => {
      if (currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview)
      }

      if (file) {
        return URL.createObjectURL(file)
      }

      return hotelForm.image ? getApiAssetUrl(hotelForm.image) : ''
    })
  }

  const submitCountry = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return

    setSaving(true)
    setFormError('')
    try {
      const payload = { name: countryForm.name.trim(), code: countryForm.code.trim(), flag: countryForm.flag.trim() }
      const result = countryForm.id
        ? await updateCountry(token, countryForm.id, payload)
        : await createCountry(token, payload)

      if (!result.success) {
        setFormError(result.message || 'Failed to save country.')
        return
      }

      setShowCountryModal(false)
      await loadData()
    } catch {
      setFormError('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const submitLocation = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: locationForm.name.trim(),
        countryId: locationForm.countryId,
        active: locationForm.active,
      }
      const result = locationForm.id
        ? await updateLocation(token, locationForm.id, payload)
        : await createLocation(token, payload)

      if (!result.success) {
        setFormError(result.message || 'Failed to save location.')
        return
      }

      setShowLocationModal(false)
      await loadData()
    } catch {
      setFormError('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const submitHotel = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return

    setSaving(true)
    setFormError('')
    try {
      let imagePath = hotelForm.image.trim()

      if (selectedHotelImageFile) {
        const uploadResult = await uploadRoomImage(selectedHotelImageFile)
        const uploadedImagePath = uploadResult.data?.fileUrl

        if (!uploadResult.success || !uploadedImagePath) {
          setFormError(uploadResult.message || 'Failed to upload hotel image.')
          return
        }

        imagePath = uploadedImagePath
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
        image: imagePath,
      }
      const result = hotelForm.id
        ? await updateHotel(token, hotelForm.id, payload)
        : await createHotel(token, payload)

      if (!result.success) {
        setFormError(result.message || 'Failed to save hotel.')
        return
      }

      setShowHotelModal(false)
      setSelectedHotelImageFile(null)
      setHotelImagePreview('')
      await loadData()
    } catch {
      setFormError('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const onDeleteCountry = async (id: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!window.confirm('Delete this country and all its locations?')) return
    const result = await deleteCountry(token, id)
    if (!result.success) setError(result.message || 'Failed to delete country.')
    await loadData()
  }

  const onDeleteLocation = async (id: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!window.confirm('Delete this location?')) return
    const result = await deleteLocation(token, id)
    if (!result.success) setError(result.message || 'Failed to delete location.')
    await loadData()
  }

  const onDeleteHotel = async (id: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!window.confirm('Delete this hotel?')) return
    const result = await deleteHotel(token, id)
    if (!result.success) setError(result.message || 'Failed to delete hotel.')
    await loadData()
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Countries & Locations</h1>
            <p className="mt-1 text-sm text-gray-600">Manage countries, locations, and hotels</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={openAddCountry} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Country
            </button>
            <button onClick={openAddLocation} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Location
            </button>
            <button onClick={openAddHotel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Hotel
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('countries')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'countries'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Countries & Locations
            </button>
            <button
              onClick={() => setActiveTab('hotels')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'hotels'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hotels
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'countries' ? 'Search countries or locations...' : 'Search hotels...'}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-md bg-white p-6 text-sm text-gray-600 shadow">Loading data...</div>}

      {!loading && activeTab === 'countries' && (
        <div className="space-y-6">
          {filteredCountries.map((country) => (
            <div key={country.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{country.flag || country.code}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{country.name}</h3>
                      <p className="text-sm text-gray-500">Code: {country.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{country.locations.length} locations</span>
                    <button onClick={() => openEditCountry(country)} className="text-blue-600 hover:text-blue-800">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => onDeleteCountry(country.id)} className="text-red-600 hover:text-red-800">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Locations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {country.locations.map((location) => (
                    <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <MapPinIcon className="h-5 w-5 text-gray-400" />
                          <h5 className="font-medium text-gray-900">{location.name}</h5>
                        </div>
                        <div className="flex space-x-1">
                          <button onClick={() => openEditLocation(country.id, location)} className="text-blue-600 hover:text-blue-800">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => onDeleteLocation(location.id)} className="text-red-600 hover:text-red-800">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{location.hotels} hotels</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${location.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {location.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === 'hotels' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHotels.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{hotel.name}</div>
                          <div className="text-sm text-gray-500">Rating: {hotel.rating || '-'} / 5</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{hotel.location}, {hotel.country}</div>
                        <div className="text-sm text-gray-500">{hotel.address || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{hotel.phone || '-'}</div>
                        <div className="text-sm text-gray-500">{hotel.email || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{hotel.rooms}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        hotel.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : hotel.status === 'INACTIVE'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {hotel.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => openEditHotel(hotel)} className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => onDeleteHotel(hotel.id)} className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCountryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{countryForm.id ? 'Edit Country' : 'Add New Country'}</h3>
                <button onClick={() => setShowCountryModal(false)} className="text-gray-400 hover:text-gray-600">x</button>
              </div>
              {formError && <div className="mb-3 text-sm text-red-600">{formError}</div>}
              <form className="space-y-4" onSubmit={submitCountry}>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="Country name" required value={countryForm.name} onChange={(e) => setCountryForm((p) => ({ ...p, name: e.target.value }))} />
                <input className="w-full px-3 py-2 border rounded-md" placeholder="Country code" required value={countryForm.code} onChange={(e) => setCountryForm((p) => ({ ...p, code: e.target.value }))} />
                <input className="w-full px-3 py-2 border rounded-md" placeholder="Flag (optional)" value={countryForm.flag} onChange={(e) => setCountryForm((p) => ({ ...p, flag: e.target.value }))} />
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setShowCountryModal(false)} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-md">{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showLocationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{locationForm.id ? 'Edit Location' : 'Add New Location'}</h3>
                <button onClick={() => setShowLocationModal(false)} className="text-gray-400 hover:text-gray-600">x</button>
              </div>
              {formError && <div className="mb-3 text-sm text-red-600">{formError}</div>}
              <form className="space-y-4" onSubmit={submitLocation}>
                <select required className="w-full px-3 py-2 border rounded-md" value={locationForm.countryId} onChange={(e) => setLocationForm((p) => ({ ...p, countryId: e.target.value }))}>
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="Location name" required value={locationForm.name} onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))} />
                <select className="w-full px-3 py-2 border rounded-md" value={locationForm.active ? 'true' : 'false'} onChange={(e) => setLocationForm((p) => ({ ...p, active: e.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setShowLocationModal(false)} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md">{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showHotelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{hotelForm.id ? 'Edit Hotel' : 'Add New Hotel'}</h3>
                <button onClick={() => setShowHotelModal(false)} className="text-gray-400 hover:text-gray-600">x</button>
              </div>
              {formError && <div className="mb-3 text-sm text-red-600">{formError}</div>}
              <form className="space-y-4" onSubmit={submitHotel}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="w-full px-3 py-2 border rounded-md" placeholder="Hotel name" required value={hotelForm.name} onChange={(e) => setHotelForm((p) => ({ ...p, name: e.target.value }))} />
                  <select required className="w-full px-3 py-2 border rounded-md" value={hotelForm.locationId} onChange={(e) => setHotelForm((p) => ({ ...p, locationId: e.target.value }))}>
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}, {location.country.name}</option>
                    ))}
                  </select>
                  <input className="w-full px-3 py-2 border rounded-md md:col-span-2" placeholder="Address" value={hotelForm.address} onChange={(e) => setHotelForm((p) => ({ ...p, address: e.target.value }))} />
                  <input className="w-full px-3 py-2 border rounded-md" placeholder="Phone" value={hotelForm.phone} onChange={(e) => setHotelForm((p) => ({ ...p, phone: e.target.value }))} />
                  <input className="w-full px-3 py-2 border rounded-md" placeholder="Email" value={hotelForm.email} onChange={(e) => setHotelForm((p) => ({ ...p, email: e.target.value }))} />
                  <select className="w-full px-3 py-2 border rounded-md" value={hotelForm.status} onChange={(e) => setHotelForm((p) => ({ ...p, status: e.target.value as HotelStatus }))}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                  <input className="w-full px-3 py-2 border rounded-md" placeholder="Rating" value={hotelForm.rating} onChange={(e) => setHotelForm((p) => ({ ...p, rating: e.target.value }))} />
                  <input className="w-full px-3 py-2 border rounded-md md:col-span-2" placeholder="Amenities (comma separated)" value={hotelForm.amenities} onChange={(e) => setHotelForm((p) => ({ ...p, amenities: e.target.value }))} />
                  <div className="md:col-span-2 grid gap-4 lg:grid-cols-[220px,1fr]">
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-medium text-gray-700">Hotel Image</p>
                      {hotelImagePreview ? (
                        <img src={hotelImagePreview} alt={hotelForm.name || 'Hotel preview'} className="h-36 w-full rounded-md object-cover" />
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded-md bg-white text-gray-300">
                          <PhotoIcon className="h-10 w-10" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHotelImageChange}
                          className="mt-1 block w-full px-3 py-2 border rounded-md"
                        />
                      </label>
                      <p className="text-xs text-gray-500">
                        Select a real image file and it will be uploaded to the server when you save this hotel.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setShowHotelModal(false)} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-md">{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
