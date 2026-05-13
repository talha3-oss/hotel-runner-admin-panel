'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { fetchAllUsers, updateAdminUser, deleteAdminUser, AdminUser } from '../../../lib/api'

type EditForm = {
  firstName: string
  lastName: string
  phoneNumber: string
  country: string
  status: string
}

export default function CustomersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ firstName: '', lastName: '', phoneNumber: '', country: '', status: 'ACTIVE' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const loadUsers = useCallback(async (q = '') => {
    const token = localStorage.getItem('adminToken')
    if (!token) { setError('Admin token not found.'); setLoading(false); return }
    setError('')
    try {
      const result = await fetchAllUsers(token, q ? { search: q } : {})
      if (result.success) {
        setUsers(result.users || [])
        setTotal(result.total || 0)
      } else {
        setError(result.message || 'Failed to load users.')
      }
    } catch {
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleSearch = (value: string) => {
    setSearch(value)
    setLoading(true)
    loadUsers(value)
  }

  const handleDelete = async (user: AdminUser) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    if (!window.confirm(`Delete account for ${user.email}? This cannot be undone.`)) return
    try {
      const result = await deleteAdminUser(token, user.id)
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id))
        setTotal((prev) => prev - 1)
        if (selectedUser?.id === user.id) setShowDetails(false)
      } else {
        alert(result.message || 'Failed to delete user.')
      }
    } catch {
      alert('Unable to connect to server.')
    }
  }

  const handleToggleStatus = async (user: AdminUser) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      const result = await updateAdminUser(token, user.id, { status: newStatus })
      if (result.success) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u))
        if (selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, status: newStatus })
      } else {
        alert(result.message || 'Failed to update status.')
      }
    } catch {
      alert('Unable to connect to server.')
    }
  }

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      country: user.country || '',
      status: user.status,
    })
    setEditError('')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token || !editingUser) return
    setEditLoading(true)
    setEditError('')
    try {
      const result = await updateAdminUser(token, editingUser.id, {
        firstName: editForm.firstName.trim() || undefined,
        lastName: editForm.lastName.trim() || undefined,
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        country: editForm.country.trim() || undefined,
        status: editForm.status,
      })
      if (result.success) {
        setUsers((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, ...result.user } : u))
        if (selectedUser?.id === editingUser.id) setSelectedUser({ ...selectedUser, ...result.user })
        setEditingUser(null)
      } else {
        setEditError(result.message || 'Failed to update user.')
      }
    } catch {
      setEditError('Unable to connect to server.')
    } finally {
      setEditLoading(false)
    }
  }

  const displayName = (user: AdminUser) =>
    user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'

  const initials = (user: AdminUser) => {
    const name = displayName(user)
    if (name === '—') return user.email[0].toUpperCase()
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return iso }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="mt-1 text-sm text-gray-600">Registered website users</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
          <UserIcon className="h-8 w-8 text-primary-600" />
          <div>
            <p className="text-sm font-medium text-gray-600">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-bold text-xs">ACT</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Active</p>
            <p className="text-2xl font-bold text-gray-900">{users.filter((u) => u.status === 'ACTIVE').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs">NEW</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">This Month</p>
            <p className="text-2xl font-bold text-gray-900">
              {users.filter((u) => {
                const d = new Date(u.createdAt)
                const now = new Date()
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-primary-700 text-xs font-bold">{initials(user)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{displayName(user)}</div>
                          <div className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-0.5">
                        <EnvelopeIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {user.email}
                      </div>
                      {user.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <PhoneIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {user.phoneNumber}
                        </div>
                      )}
                      {user.country && <div className="text-xs text-gray-400 mt-0.5">{user.country}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedUser(user); setShowDetails(true) }} className="text-primary-600 hover:text-primary-900" title="View">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800" title="Edit">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'ACTIVE' ? 'Deactivate' : 'Approve'}
                          className={user.status === 'ACTIVE' ? 'text-yellow-500 hover:text-yellow-700' : 'text-green-500 hover:text-green-700'}
                        >
                          {user.status === 'ACTIVE'
                            ? <XCircleIcon className="h-4 w-4" />
                            : <CheckCircleIcon className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleDelete(user)} className="text-red-500 hover:text-red-700" title="Delete">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                      {search ? 'No customers match your search.' : 'No customers have registered yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-primary-700 text-lg font-bold">{initials(selectedUser)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-base">{displayName(selectedUser)}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${selectedUser.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{selectedUser.status}</span>
                </div>
                {selectedUser.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-gray-700">{selectedUser.phoneNumber}</span>
                  </div>
                )}
                {selectedUser.country && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Country</span>
                    <span className="text-gray-700">{selectedUser.country}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Registered</span>
                  <span className="text-gray-700">{formatDate(selectedUser.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowDetails(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Close</button>
              <button
                onClick={() => { setShowDetails(false); openEditModal(selectedUser) }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >Edit</button>
              <button
                onClick={() => handleToggleStatus(selectedUser)}
                className={`px-4 py-2 text-sm text-white rounded ${selectedUser.status === 'ACTIVE' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {selectedUser.status === 'ACTIVE' ? 'Deactivate' : 'Approve'}
              </button>
              <button onClick={() => { handleDelete(selectedUser); setShowDetails(false) }} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Customer</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="px-6 py-5 space-y-4">
                {editError && (
                  <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>
                )}
                <div className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2">
                  <span className="font-medium text-gray-700">Email:</span> {editingUser.email}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ACTIVE">ACTIVE — Approved</option>
                    <option value="INACTIVE">INACTIVE — Deactivated</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setEditingUser(null)} disabled={editLoading} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={editLoading} className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
