'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  VideoCameraIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  fetchGallery,
  galleryThumbUrl,
  getApiAssetUrl,
  uploadMedia,
  isVideoFile,
  getUploadLimits,
  DEFAULT_UPLOAD_LIMITS,
  GalleryFile,
} from '../lib/api'

// Choosing a picture or a video, from one place.
//
// Every field that took an image could only upload a new one. A photograph
// already in the library had to be uploaded a second time to be used a second
// time, which is how four hundred files and three copies of the same quad bike
// got there. This offers the library first and uploading second.

const PER_PAGE = 24

/** What a file is, in the words the surrounding screen uses. */
type Kind = 'image' | 'video'

export default function MediaPicker({
  kind,
  onPick,
  onClose,
}: {
  kind: Kind
  onPick: (url: string) => void
  onClose: () => void
}) {
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [uploading, setUploading] = useState(false)
  const [percent, setPercent] = useState<number | null>(0)
  // Shown and enforced from the setting rather than from a number written
  // here, so Settings is the only place either changes.
  const [limitMb, setLimitMb] = useState(
    kind === 'video' ? DEFAULT_UPLOAD_LIMITS.video : DEFAULT_UPLOAD_LIMITS.image
  )
  const uploadRef = useRef<HTMLInputElement>(null)
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
    try {
      const result = await fetchGallery(token, { search: term, page, limit: PER_PAGE, kind })
      if (result.success) {
        setFiles(result.files || [])
        setPages(result.pages || 1)
        setError('')
      } else {
        setError(result.message || 'Could not load the library.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [term, page, kind])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let cancelled = false
    getUploadLimits().then(l => {
      if (!cancelled) setLimitMb(kind === 'video' ? l.video : l.image)
    })
    return () => { cancelled = true }
  }, [kind])

  // Escape closes, the way the other modals here behave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const upload = async (file: File | undefined) => {
    if (!file) return

    // A video dropped into a picture field, or the other way round, would be
    // uploaded happily and then never show up in this list. Said plainly
    // instead.
    if (isVideoFile(file) !== (kind === 'video')) {
      setError(kind === 'video' ? 'That is not a video.' : 'That is a video — this field takes a picture.')
      return
    }

    // Caught here as well as by the API: a file refused before it is sent
    // saves the person a long upload that was never going to be kept.
    if (file.size > limitMb * 1024 * 1024) {
      const mb = Math.round((file.size / 1024 / 1024) * 10) / 10
      setError(`That file is ${mb} MB. The limit is ${limitMb} MB — it can be changed in Settings → Uploads.`)
      return
    }

    setUploading(true)
    setPercent(0)
    setError('')
    const result = await uploadMedia(file, setPercent, limitMb)
    setUploading(false)

    if (result.success && result.data?.fileUrl) {
      onPick(result.data.fileUrl)
      onClose()
    } else {
      setError(result.message || 'Could not upload that file.')
    }
  }

  const noun = kind === 'video' ? 'video' : 'picture'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Choose a {noun}
            </h2>
            <p className="text-xs text-gray-400">
            From the library, or upload a new one — up to {limitMb} MB.
          </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search + upload */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Upload {noun}
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept={kind === 'video'
              ? 'video/mp4,video/webm,video/ogg,video/quicktime'
              : 'image/jpeg,image/png,image/webp,image/gif,image/avif'}
            className="hidden"
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>

        {uploading && <UploadBar percent={percent} />}

        {error && (
          <p className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700">{error}</p>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center">
              {kind === 'video'
                ? <VideoCameraIcon className="mx-auto h-10 w-10 text-gray-300" />
                : <PhotoIcon className="mx-auto h-10 w-10 text-gray-300" />}
              <p className="mt-3 text-sm font-medium text-gray-700">
                {term ? 'Nothing matches that name' : `No ${noun}s in the library yet`}
              </p>
              {!term && (
                <p className="mt-1 text-sm text-gray-400">
                  Use <strong>Upload {noun}</strong> above to add the first one.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {files.map((file) => (
                <button
                  key={`${file.folder}/${file.name}`}
                  type="button"
                  title={file.name}
                  onClick={() => { onPick(file.url); onClose() }}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white text-left hover:border-primary-500 hover:ring-2 hover:ring-primary-200"
                >
                  <div className="relative aspect-square w-full bg-gray-50">
                    {file.kind === 'video' ? (
                      <>
                        <video src={getApiAssetUrl(file.url)} preload="metadata" muted playsInline
                          className="h-full w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/30">
                            <PlayIcon className="h-3.5 w-3.5 translate-x-[1px] text-white" />
                          </span>
                        </span>
                      </>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={galleryThumbUrl(file, 240)} alt={file.name} loading="lazy" decoding="async"
                        className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="truncate px-1.5 py-1 text-[11px] text-gray-500">{file.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pager */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-5 py-2.5">
            <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Previous
            </button>
            <span className="text-xs text-gray-500">Page {page} of {pages}</span>
            <button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page >= pages}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** How far along an upload is. A percent when the browser can say, and a bar
 *  that simply moves when it cannot -- which is still more honest than a bar
 *  frozen at nothing. */
export function UploadBar({ percent }: { percent: number | null }) {
  const known = typeof percent === 'number'
  return (
    <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
      <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600">
        <span>{known && percent >= 100 ? 'Finishing up…' : 'Uploading…'}</span>
        {known && <span className="font-mono">{percent}%</span>}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full bg-primary-600 ${known ? 'transition-[width] duration-200' : 'w-1/3 animate-pulse'}`}
          style={known ? { width: `${percent}%` } : undefined}
        />
      </div>
      {known && percent >= 100 && (
        <p className="mt-1.5 text-xs text-gray-400">
          Sent. The server is still saving it — large videos take a moment.
        </p>
      )}
    </div>
  )
}
