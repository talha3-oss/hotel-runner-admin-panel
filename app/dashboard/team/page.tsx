'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import {
  TeamMember,
  TeamMemberPayload,
  TEAM_MODULES,
  createTeamMember,
  deleteTeamMember,
  fetchTeamMembers,
  updateTeamMember,
} from '../../../lib/api'

type FormState = {
  id: string
  email: string
  password: string
  fullName: string
  roleLabel: string
  permissions: string[]
  status: string
}

const EMPTY: FormState = {
  id: '',
  email: '',
  password: '',
  fullName: '',
  roleLabel: '',
  permissions: [],
  status: 'ACTIVE',
}

const ALL_MODULE_KEYS = TEAM_MODULES.map((m) => m.key)

export default function TeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser')
      const parsed = raw ? JSON.parse(raw) : null
      if (!parsed?.isSuperAdmin) {
        router.push('/dashboard')
        return
      }
      setCurrentUserId(parsed.id || '')
    } catch {
      router.push('/dashboard')
    }
  }, [router])

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await fetchTeamMembers(token)
      if (result.success) setMembers(result.members || [])
      else setError(result.message || 'Failed to load team members.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const openEdit = (member: TeamMember) => {
    const f: FormState = {
      id: member.id,
      email: member.email,
      password: '',
      fullName: member.fullName || '',
      roleLabel: member.roleLabel || '',
      permissions: member.permissions || [],
      status: member.status,
    }
    setEditing(f)
    setForm(f)
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const toggleAll = (checked: boolean) => {
    setForm((p) => ({ ...p, permissions: checked ? [...ALL_MODULE_KEYS] : [] }))
  }

  const togglePermission = (key: string, checked: boolean) => {
    setForm((p) => ({
      ...p,
      permissions: checked ? [...p.permissions, key] : p.permissions.filter((k) => k !== key),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const payload: TeamMemberPayload = {
        fullName: form.fullName.trim(),
        roleLabel: form.roleLabel.trim() || undefined,
        permissions: form.permissions,
        status: form.status,
      }

      let result
      if (editing?.id) {
        if (form.password) payload.password = form.password
        result = await updateTeamMember(token, editing.id, payload)
      } else {
        payload.email = form.email.trim()
        payload.password = form.password
        result = await createTeamMember(token, payload)
      }

      if (result.success) {
        setSuccess(editing?.id ? 'Team member updated.' : 'Team member created.')
        setShowModal(false)
        await load()
      } else {
        setError(result.message || 'Failed to save team member.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete this team member?\n\n${email}`)) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setDeletingId(id)
    try {
      const result = await deleteTeamMember(token, id)
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.id !== id))
        setSuccess('Team member deleted.')
      } else {
        setError(result.message || 'Failed to delete team member.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const allSelected = form.permissions.length === ALL_MODULE_KEYS.length
  const editingMember = editing?.id ? members.find((m) => m.id === editing.id) : null
  const editingIsSuperAdmin = !!editingMember?.isSuperAdmin

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="mt-1 text-sm text-gray-500">Create admin logins and choose which modules each person can access.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Team Member
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Team list */}
      {loading ? (
        <div className="rounded-xl bg-white shadow px-6 py-10 text-center text-sm text-gray-500">Loading team members…</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl bg-white shadow px-6 py-16 text-center text-sm text-gray-400">
          No team members yet. Click <strong>New Team Member</strong> to create one.
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Permissions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {member.fullName || '—'}
                      {member.isSuperAdmin && <ShieldCheckIcon className="h-4 w-4 text-primary-600" title="Super admin" />}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {member.roleLabel ? (
                      <span className="inline-block rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs px-2.5 py-0.5 font-medium">{member.roleLabel}</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {member.isSuperAdmin ? (
                      <span className="text-xs font-semibold text-primary-600">All modules</span>
                    ) : (
                      <span className="text-xs text-gray-500">{member.permissions.length} module{member.permissions.length === 1 ? '' : 's'}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    {member.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        <CheckCircleIcon className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                        <XCircleIcon className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(member)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5" /> Edit
                      </button>
                      {!member.isSuperAdmin && member.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(member.id, member.email)}
                          disabled={deletingId === member.id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {deletingId === member.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">{editing?.id ? 'Edit Team Member' : 'New Team Member'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              {editingIsSuperAdmin && (
                <div className="rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
                  Super admin — access cannot be modified here.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Sarah Ahmed"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Label <span className="text-gray-400">(optional)</span></label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Support Staff"
                    value={form.roleLabel}
                    onChange={(e) => setForm((p) => ({ ...p, roleLabel: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  disabled={!!editing?.id}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editing?.id ? <span className="text-gray-400">(leave blank to keep unchanged)</span> : '*'}
                </label>
                <input
                  required={!editing?.id}
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={editing?.id ? '••••••••' : 'Set a login password'}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Module Permissions</label>
                  <label className="flex items-center gap-2 text-xs font-medium text-primary-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={editingIsSuperAdmin}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 disabled:opacity-40"
                    />
                    Select All
                  </label>
                </div>
                <div className={`grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-3 max-h-56 overflow-y-auto ${editingIsSuperAdmin ? 'opacity-40 pointer-events-none' : ''}`}>
                  {TEAM_MODULES.map((mod) => (
                    <label key={mod.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(mod.key)}
                        disabled={editingIsSuperAdmin}
                        onChange={(e) => togglePermission(mod.key, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      {mod.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  disabled={editingIsSuperAdmin}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : editing?.id ? 'Update Team Member' : 'Create Team Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
