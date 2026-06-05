'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import {
  BlogPost,
  BlogPayload,
  createAdminBlog,
  deleteAdminBlog,
  fetchAdminBlogs,
  updateAdminBlog,
} from '../../../lib/api'
import { uploadHomepageSectionImage } from '../../../lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

type FormState = BlogPayload & { id: string; tagsRaw: string }

const EMPTY: FormState = {
  id: '',
  title: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: '',
  tags: [],
  tagsRaw: '',
  author: 'Luxotel Team',
  isPublished: true,
  sortOrder: 0,
}

const CATEGORIES = ['Travel Tips', 'Hotel News', 'Dining & Cuisine', 'Wellness', 'Local Experiences', 'Offers & Deals', 'General']

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [filterCategory, setFilterCategory] = useState('all')
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await fetchAdminBlogs(token)
      if (result.success) setPosts(result.posts || [])
      else setError(result.message || 'Failed to load blog posts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, sortOrder: posts.length + 1 })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const openEdit = (post: BlogPost) => {
    const f: FormState = {
      id: post.id,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      coverImage: post.coverImage || '',
      category: post.category || '',
      tags: post.tags,
      tagsRaw: post.tags.join(', '),
      author: post.author,
      isPublished: post.isPublished,
      sortOrder: post.sortOrder,
    }
    setEditing(f)
    setForm(f)
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null) }

  const set = (k: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const result = await uploadHomepageSectionImage(file)
      if (result.success && result.data?.fileUrl) set('coverImage', result.data.fileUrl)
      else setError('Cover image upload failed.')
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setSaving(true)
    setError('')
    setSuccess('')
    const payload: BlogPayload = {
      title: form.title,
      excerpt: form.excerpt || undefined,
      content: form.content,
      coverImage: form.coverImage || undefined,
      category: form.category || undefined,
      tags: form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean),
      author: form.author || 'Luxotel Team',
      isPublished: form.isPublished,
      sortOrder: Number(form.sortOrder) || 0,
    }
    try {
      let result
      if (editing?.id) {
        result = await updateAdminBlog(token, editing.id, payload)
      } else {
        result = await createAdminBlog(token, payload)
      }
      if (result.success) {
        setSuccess(editing?.id ? 'Post updated!' : 'Post created!')
        closeModal()
        load()
      } else {
        setError(result.message || 'Save failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setDeletingId(id)
    try {
      const result = await deleteAdminBlog(token, id)
      if (result.success) { setSuccess('Post deleted.'); load() }
      else setError(result.message || 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  const allCategories = Array.from(new Set(posts.map(p => p.category).filter(Boolean) as string[]))
  const filtered = filterCategory === 'all' ? posts : posts.filter(p => p.category === filterCategory)

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-1">{posts.length} post{posts.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          New Post
        </button>
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <XCircleIcon className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['all', ...allCategories].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterCategory === cat
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No blog posts yet. Create your first post!</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Author</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((post, i) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {post.coverImage ? (
                        <img
                          src={post.coverImage.startsWith('http') ? post.coverImage : `${API_BASE_URL}${post.coverImage}`}
                          alt=""
                          className="h-10 w-14 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <PhotoIcon className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</p>
                        {post.excerpt && <p className="text-xs text-gray-400 line-clamp-1">{post.excerpt}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {post.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {post.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{post.author}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">{fmt(post.createdAt)}</td>
                  <td className="px-4 py-3">
                    {post.isPublished ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        <CheckCircleIcon className="h-3 w-3" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <XCircleIcon className="h-3 w-3" /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(post)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Post' : 'New Blog Post'}</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
              )}

              {/* Cover image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                <div className="flex items-center gap-4">
                  {form.coverImage ? (
                    <img
                      src={form.coverImage.startsWith('http') ? form.coverImage : `${API_BASE_URL}${form.coverImage}`}
                      alt="cover"
                      className="h-24 w-40 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-24 w-40 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <PhotoIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {uploadingCover ? 'Uploading…' : 'Upload Image'}
                    </button>
                    {form.coverImage && (
                      <button
                        type="button"
                        onClick={() => set('coverImage', '')}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Post title"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <input
                  value={form.excerpt}
                  onChange={e => set('excerpt', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Short summary shown on listing page"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  required
                  rows={10}
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  placeholder="Full blog post content. You can use basic markdown: **bold**, *italic*, ## Heading, - list item"
                />
              </div>

              {/* Category + Author row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    list="blog-categories"
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="E.g. Travel Tips"
                  />
                  <datalist id="blog-categories">
                    {CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                  <input
                    value={form.author}
                    onChange={e => set('author', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Luxotel Team"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  value={form.tagsRaw}
                  onChange={e => set('tagsRaw', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Comma-separated: luxury, travel, spa"
                />
              </div>

              {/* Sort order + Published row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={e => set('sortOrder', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min={0}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => set('isPublished', !form.isPublished)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.isPublished ? 'bg-primary-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Published</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editing ? 'Update Post' : 'Create Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
