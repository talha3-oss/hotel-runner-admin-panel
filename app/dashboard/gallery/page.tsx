'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PhotoIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  VideoCameraIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import {
  fetchGallery,
  deleteGalleryImage,
  galleryThumbUrl,
  getApiAssetUrl,
  uploadHomepageSectionImage,
  uploadHomepageSectionVideo,
  GalleryFile,
} from '../../../lib/api'

// The address of the API is not worked out here any more. This file read
// NEXT_PUBLIC_API_BASE_URL while every other screen in the panel reads
// NEXT_PUBLIC_API_URL -- only the second is set, so this one quietly fell back
// to localhost and "Open full size" sent people to a server on their own
// machine.
const PER_PAGE = 48

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GalleryPage() {
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [folder, setFolder] = useState('')
  const [total, setTotal] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<GalleryFile | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  // The search box asks the server, so it waits for a pause in typing rather
  // than sending a request per keystroke.
  const [term, setTerm] = useState('')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { setTerm(search); setPage(1) }, 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [search])

  const load = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const result = await fetchGallery(token, { search: term, page, limit: PER_PAGE, folder })
      if (result.success) {
        setFiles(result.files || [])
        setFolders(result.folders || [])
        setTotal(result.total || 0)
        setTotalBytes(result.totalBytes || 0)
        setPages(result.pages || 1)
      } else {
        setError(result.message || 'Could not load the gallery.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [term, page, folder])

  useEffect(() => { load() }, [load])

  // The library could only ever be filled from somewhere else -- a section
  // editor, a hotel's photos -- so a video or a picture you wanted on hand
  // before deciding where it went had nowhere to go. Which endpoint a file
  // takes is decided by what it is, not by asking the person to say.
  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')

    const failed: string[] = []
    for (const file of Array.from(files)) {
      try {
        const result = file.type.startsWith('video/')
          ? await uploadHomepageSectionVideo(file)
          : await uploadHomepageSectionImage(file)
        if (!result.success) failed.push(`${file.name}: ${result.message || 'refused'}`)
      } catch {
        failed.push(`${file.name}: could not reach the server`)
      }
    }

    setUploading(false)
    if (failed.length) setError(failed.join(' · '))
    // The listing is cached for fifteen seconds on the server, so a new file
    // can be missing from the first reload after it lands.
    setPage(1)
    await load()
  }

  const remove = async (file: GalleryFile) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    const what = file.kind === 'video' ? 'video' : 'image'
    const warning = file.inUse
      ? `"${file.name}" is still being used on the site. Deleting it will leave a broken ${what} wherever it appears.\n\nDelete it anyway?`
      : `Delete "${file.name}"? This cannot be undone.`
    if (!confirm(warning)) return

    setDeleting(file.name)
    try {
      let result = await deleteGalleryImage(token, file.folder, file.name, file.inUse)

      // The list is a few seconds old, so an image can have been put to use
      // since it was drawn. Rather than leave the person at a dead end with a
      // message and no button, ask the question that was not asked before.
      if (!result.success && result.inUse) {
        if (!confirm(`"${file.name}" is being used on the site after all. Delete it anyway?`)) return
        result = await deleteGalleryImage(token, file.folder, file.name, true)
      }

      if (result.success) {
        setPreview(null)
        await load()
      } else {
        setError(result.message || 'Could not delete the image.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setDeleting(null)
    }
  }

  const inUseCount = files.filter((f) => f.inUse).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 sm:order-1">
          <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every picture and video uploaded anywhere in the panel. {total} file{total === 1 ? '' : 's'},
            {' '}{formatBytes(totalBytes)} in all.
          </p>
        </div>

        <div className="order-1 sm:order-2">
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={uploadRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime"
            className="hidden"
            onChange={(e) => { upload(e.target.files); e.target.value = '' }}
          />
          <p className="mt-1 text-right text-xs text-gray-400">Pictures or videos</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Search and folder filter */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name…"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={folder}
          onChange={(e) => { setFolder(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All folders (pictures and videos)</option>
          {folders.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {inUseCount > 0 && (
        <p className="text-xs text-gray-400">
          A green dot means the file is in use somewhere on the site. {inUseCount} on this page.
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-20 text-center">
          <PhotoIcon className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            {term ? 'Nothing matches that name' : 'Nothing uploaded yet'}
          </p>
          {term && <p className="mt-1 text-sm text-gray-400">Try part of the name instead.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {files.map((file) => (
            <div
              key={`${file.folder}/${file.name}`}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setPreview(file)}
                className="relative block aspect-square w-full bg-gray-50"
                title={file.name}
              >
                {file.kind === 'video' ? (
                  <>
                    {/* No thumbnail to show: the browser is asked for the
                        opening moments only, which is enough to draw a frame
                        and costs far less than the whole file. */}
                    <video
                      src={getApiAssetUrl(file.url)}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/30">
                        <PlayIcon className="h-4 w-4 translate-x-[1px] text-white" />
                      </span>
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={galleryThumbUrl(file, 320)}
                    alt={file.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                )}
              </button>

              {file.inUse && (
                <span
                  title="In use on the site"
                  className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"
                />
              )}

              <button
                type="button"
                onClick={() => remove(file)}
                disabled={deleting === file.name}
                title="Delete this image"
                className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-red-500 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
              </button>

              <div className="px-2 py-1.5">
                <p className="truncate text-[11px] text-gray-600" title={file.name}>{file.name}</p>
                <p className="text-[10px] text-gray-400">
                  {formatBytes(file.size)} · {formatDate(file.uploadedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pager */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, pages))}
            disabled={page >= pages}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Next <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Full size preview */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-full w-full max-w-3xl overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{preview.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-gray-400">
                  {preview.kind === 'video' && <VideoCameraIcon className="h-3.5 w-3.5" />}
                  {preview.folder} · {formatBytes(preview.size)} · {formatDate(preview.uploadedAt)}
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="text-xl leading-none text-gray-400 hover:text-gray-700">
                &times;
              </button>
            </div>

            <div className="flex max-h-[60vh] items-center justify-center bg-gray-50">
              {preview.kind === 'video' ? (
                <video
                  src={getApiAssetUrl(preview.url)}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="max-h-[60vh] w-auto"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={galleryThumbUrl(preview, 800)}
                  alt={preview.name}
                  className="max-h-[60vh] w-auto object-contain"
                />
              )}
            </div>

            {preview.inUse && (
              <div className="flex items-start gap-2 border-t bg-amber-50 px-5 py-3 text-sm text-amber-800">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>This file is in use on the site. Deleting it leaves a gap wherever it appears.</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
              <a
                href={getApiAssetUrl(preview.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Open full size
              </a>
              <button
                onClick={() => remove(preview)}
                disabled={deleting === preview.name}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                {deleting === preview.name ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
