export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
        <p className="text-sm font-semibold tracking-widest text-primary-600">LUXOTEL</p>
      </div>
    </div>
  )
}
