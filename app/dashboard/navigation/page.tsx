'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PlusIcon,
  TrashIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { fetchNavMenu, saveNavMenu, NavItem } from '../../../lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

type DraftItem = NavItem & { tempId: string }

let tempCounter = 0
const mkId = () => `tmp-${++tempCounter}`

const todraft = (item: NavItem): DraftItem => ({
  ...item,
  tempId: item.id || mkId(),
})

// alias used internally
const toraft = todraft

export default function NavigationPage() {
  const [items, setItems] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pages/nav-menu`, { cache: 'no-store' })
      const result = await res.json()
      if (result.success) {
        setItems((result.items as NavItem[]).map(toraft))
      } else {
        setError(result.message || 'Failed to load menu.')
      }
    } catch { setError('Unable to connect.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { tempId: mkId(), label: '', href: '', order: prev.length, visible: true, openInNewTab: false },
    ])
  }

  const removeItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  const updateItem = (tempId: string, field: keyof NavItem, value: string | boolean) => {
    setItems((prev) => prev.map((i) => i.tempId === tempId ? { ...i, [field]: value } : i))
  }

  const handleSave = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const payload = items.map((item, idx) => ({
        label: item.label,
        href: item.href,
        order: idx,
        visible: item.visible,
        openInNewTab: item.openInNewTab,
      }))
      const result = await saveNavMenu(token, payload)
      if (result.success) {
        setItems((result.items as NavItem[]).map(toraft))
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        alert(result.message || 'Failed to save.')
      }
    } catch { alert('Unable to connect.') }
    finally { setSaving(false) }
  }

  // Simple drag-and-drop reorder
  const onDragStart = (idx: number) => setDragIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(idx)
  }
  const onDragEnd = () => setDragIdx(null)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigation Menu</h1>
          <p className="mt-1 text-sm text-gray-600">Control what links appear in the website sidebar menu</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addItem}
            className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Link
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save Menu'}
          </button>
        </div>
      </div>

      {error && <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {saveSuccess && <div className="mb-6 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">Menu saved successfully.</div>}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading menu…</div>
        ) : (
          <>
            {items.length === 0 ? (
              <div className="p-12 text-center">
                <Bars3Icon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-400">No menu items yet</p>
                <p className="text-xs text-gray-300 mt-1">Click "Add Link" to start building your navigation menu.</p>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1"></div>
                  <div className="col-span-4">Label</div>
                  <div className="col-span-4">URL / Path</div>
                  <div className="col-span-1 text-center">Visible</div>
                  <div className="col-span-1 text-center">New Tab</div>
                  <div className="col-span-1"></div>
                </div>
                {items.map((item, idx) => (
                  <div
                    key={item.tempId}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={(e) => onDragOver(e, idx)}
                    onDragEnd={onDragEnd}
                    className={`grid grid-cols-12 gap-3 px-4 py-3 items-center border-b border-gray-100 last:border-0 cursor-grab active:cursor-grabbing ${dragIdx === idx ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                  >
                    {/* Drag handle */}
                    <div className="col-span-1 flex justify-center text-gray-300">
                      <Bars3Icon className="h-4 w-4" />
                    </div>
                    {/* Label */}
                    <div className="col-span-4">
                      <input
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g. Our Hotels"
                        value={item.label}
                        onChange={(e) => updateItem(item.tempId, 'label', e.target.value)}
                      />
                    </div>
                    {/* href */}
                    <div className="col-span-4">
                      <input
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="/hotels"
                        value={item.href}
                        onChange={(e) => updateItem(item.tempId, 'href', e.target.value)}
                      />
                    </div>
                    {/* Visible toggle */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => updateItem(item.tempId, 'visible', !item.visible)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${item.visible ? 'bg-primary-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${item.visible ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {/* New tab toggle */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => updateItem(item.tempId, 'openInNewTab', !item.openInNewTab)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${item.openInNewTab ? 'bg-primary-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${item.openInNewTab ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {/* Delete */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeItem(item.tempId)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
                Drag rows to reorder. Toggle "Visible" to show/hide links without deleting them.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
