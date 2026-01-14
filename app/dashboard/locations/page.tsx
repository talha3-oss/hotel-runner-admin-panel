'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

const countries = [
  {
    id: 1,
    name: 'United Kingdom',
    code: 'UK',
    flag: '🇬🇧',
    locations: [
      { id: 1, name: 'London', hotels: 3, active: true },
      { id: 2, name: 'Manchester', hotels: 1, active: true },
      { id: 3, name: 'Birmingham', hotels: 2, active: false },
    ]
  },
  {
    id: 2,
    name: 'Ireland',
    code: 'IE',
    flag: '🇮🇪',
    locations: [
      { id: 4, name: 'Dublin', hotels: 2, active: true },
      { id: 5, name: 'Cork', hotels: 1, active: true },
    ]
  },
  {
    id: 3,
    name: 'France',
    code: 'FR',
    flag: '🇫🇷',
    locations: [
      { id: 6, name: 'Paris', hotels: 0, active: false },
      { id: 7, name: 'Lyon', hotels: 0, active: false },
    ]
  }
]

const hotels = [
  {
    id: 1,
    name: 'Clayton Hotel London City',
    location: 'London',
    country: 'United Kingdom',
    address: '123 City Road, London EC1V 1JH',
    phone: '+44 20 7123 4567',
    email: 'london@claytonhotels.com',
    rooms: 156,
    status: 'Active',
    rating: 4.5,
    amenities: ['WiFi', 'Restaurant', 'Bar', 'Gym', 'Spa']
  },
  {
    id: 2,
    name: 'Clayton Hotel London Chiswick',
    location: 'London',
    country: 'United Kingdom',
    address: '626 Chiswick High Road, London W4 5RY',
    phone: '+44 20 8994 1234',
    email: 'chiswick@claytonhotels.com',
    rooms: 227,
    status: 'Active',
    rating: 4.3,
    amenities: ['WiFi', 'Restaurant', 'Bar', 'Gym', 'Pool']
  },
  {
    id: 3,
    name: 'Clayton Hotel Dublin Airport',
    location: 'Dublin',
    country: 'Ireland',
    address: 'Dublin Airport, Dublin K67 NY27',
    phone: '+353 1 271 5500',
    email: 'dublin@claytonhotels.com',
    rooms: 304,
    status: 'Active',
    rating: 4.4,
    amenities: ['WiFi', 'Restaurant', 'Bar', 'Gym', 'Airport Shuttle']
  }
]

export default function LocationsPage() {
  const [activeTab, setActiveTab] = useState('countries')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddCountry, setShowAddCountry] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [showAddHotel, setShowAddHotel] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<any>(null)

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.locations.some(location => 
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hotel.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hotel.country.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Countries & Locations</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage countries, locations, and hotels
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowAddCountry(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Country
            </button>
            <button 
              onClick={() => setShowAddLocation(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Location
            </button>
            <button 
              onClick={() => setShowAddHotel(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Hotel
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'countries' ? "Search countries or locations..." : "Search hotels..."}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Countries & Locations Tab */}
      {activeTab === 'countries' && (
        <div className="space-y-6">
          {filteredCountries.map((country) => (
            <div key={country.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{country.flag}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{country.name}</h3>
                      <p className="text-sm text-gray-500">Code: {country.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {country.locations.length} locations
                    </span>
                    <button className="text-blue-600 hover:text-blue-800">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
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
                          <button className="text-blue-600 hover:text-blue-800">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-800">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{location.hotels} hotels</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          location.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
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

      {/* Hotels Tab */}
      {activeTab === 'hotels' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hotel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rooms
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
                {filteredHotels.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{hotel.name}</div>
                          <div className="text-sm text-gray-500">Rating: {hotel.rating}/5</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{hotel.location}, {hotel.country}</div>
                        <div className="text-sm text-gray-500">{hotel.address}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{hotel.phone}</div>
                        <div className="text-sm text-gray-500">{hotel.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hotel.rooms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        hotel.status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {hotel.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
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

      {/* Add Country Modal */}
      {showAddCountry && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Country</h3>
                <button
                  onClick={() => setShowAddCountry(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter country name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., UK, US, FR"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flag Emoji</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="🇬🇧"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddCountry(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Add Country
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Location</h3>
                <button
                  onClick={() => setShowAddLocation(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>{country.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter location name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddLocation(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Location
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Hotel Modal */}
      {showAddHotel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
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
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select Location</option>
                      {countries.flatMap(country => 
                        country.locations.map(location => (
                          <option key={location.id} value={location.id}>
                            {location.name}, {country.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter full address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rooms</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter number of rooms"
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
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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