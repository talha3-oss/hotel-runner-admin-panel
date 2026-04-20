'use client'

import { useState } from 'react'
import { 
  CogIcon,
  UserIcon,
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    general: {
      hotelName: 'Luxotel Hotels',
      timezone: 'Europe/London',
      currency: 'JOD',
      language: 'English',
      dateFormat: 'DD/MM/YYYY'
    },
    notifications: {
      emailBookings: true,
      emailPayments: true,
      emailCancellations: true,
      smsBookings: false,
      smsPayments: true,
      pushNotifications: true
    },
    payment: {
      stripeEnabled: true,
      stripePublicKey: 'pk_test_...',
      stripeSecretKey: '••••••••••••••••',
      montypayEnabled: true,
      montypayApiKey: '••••••••••••••••',
      payAtHotelEnabled: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginAttempts: 5
    }
  })

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'users', name: 'Users', icon: UserIcon }
  ]

  const handleSave = () => {
    // In a real app, this would save settings to the backend
    alert('Settings saved successfully!')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your hotel system preferences and configurations
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className="mr-3 h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {tabs.find(tab => tab.id === activeTab)?.name} Settings
              </h3>
            </div>

            <div className="p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hotel Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={settings.general.hotelName}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, hotelName: e.target.value }
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.general.timezone}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, timezone: e.target.value }
                        })}
                      >
                        <option value="Europe/London">Europe/London</option>
                        <option value="Europe/Dublin">Europe/Dublin</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="America/New_York">America/New_York</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.general.currency}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, currency: e.target.value }
                        })}
                      >
                        <option value="JOD">JOD (JD)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.general.language}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, language: e.target.value }
                        })}
                      >
                        <option value="English">English</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Spanish">Spanish</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.general.dateFormat}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, dateFormat: e.target.value }
                        })}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Email Notifications</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'emailBookings', label: 'New Bookings' },
                        { key: 'emailPayments', label: 'Payment Confirmations' },
                        { key: 'emailCancellations', label: 'Booking Cancellations' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center">
                          <input
                            type="checkbox"
                            id={item.key}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                            onChange={(e) => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                [item.key]: e.target.checked
                              }
                            })}
                          />
                          <label htmlFor={item.key} className="ml-2 text-sm text-gray-700">
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">SMS Notifications</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'smsBookings', label: 'New Bookings' },
                        { key: 'smsPayments', label: 'Payment Confirmations' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center">
                          <input
                            type="checkbox"
                            id={item.key}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                            onChange={(e) => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                [item.key]: e.target.checked
                              }
                            })}
                          />
                          <label htmlFor={item.key} className="ml-2 text-sm text-gray-700">
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pushNotifications"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={settings.notifications.pushNotifications}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            pushNotifications: e.target.checked
                          }
                        })}
                      />
                      <label htmlFor="pushNotifications" className="ml-2 text-sm text-gray-700">
                        Push Notifications
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Settings */}
              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Payment Providers</h4>
                    
                    <div className="space-y-6">
                      {/* Stripe */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-gray-900">Stripe</h5>
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={settings.payment.stripeEnabled}
                            onChange={(e) => setSettings({
                              ...settings,
                              payment: { ...settings.payment, stripeEnabled: e.target.checked }
                            })}
                          />
                        </div>
                        {settings.payment.stripeEnabled && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Public Key
                              </label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={settings.payment.stripePublicKey}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  payment: { ...settings.payment, stripePublicKey: e.target.value }
                                })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Secret Key
                              </label>
                              <input
                                type="password"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={settings.payment.stripeSecretKey}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  payment: { ...settings.payment, stripeSecretKey: e.target.value }
                                })}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* MontyPay */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-gray-900">MontyPay</h5>
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={settings.payment.montypayEnabled}
                            onChange={(e) => setSettings({
                              ...settings,
                              payment: { ...settings.payment, montypayEnabled: e.target.checked }
                            })}
                          />
                        </div>
                        {settings.payment.montypayEnabled && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              API Key
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              value={settings.payment.montypayApiKey}
                              onChange={(e) => setSettings({
                                ...settings,
                                payment: { ...settings.payment, montypayApiKey: e.target.value }
                              })}
                            />
                          </div>
                        )}
                      </div>

                      {/* Pay at Hotel */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">Pay at Hotel</h5>
                            <p className="text-sm text-gray-500">Allow customers to pay upon arrival</p>
                          </div>
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={settings.payment.payAtHotelEnabled}
                            onChange={(e) => setSettings({
                              ...settings,
                              payment: { ...settings.payment, payAtHotelEnabled: e.target.checked }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, twoFactorAuth: e.target.checked }
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password Expiry (days)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.security.passwordExpiry}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, passwordExpiry: parseInt(e.target.value) }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Login Attempts
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={settings.security.loginAttempts}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, loginAttempts: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Users Settings */}
              {activeTab === 'users' && (
                <div>
                  <div className="text-center py-12">
                    <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">User Management</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      User management functionality will be implemented here.
                    </p>
                    <div className="mt-6">
                      <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md">
                        Add New User
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
