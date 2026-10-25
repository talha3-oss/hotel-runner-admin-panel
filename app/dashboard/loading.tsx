// The dashboard layout stays put while a page loads; this fills the space
// where the page itself goes. Before it existed the whole screen went blank
// for as long as the route took to arrive, sidebar and all.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-56 rounded bg-gray-200" />
      <div className="h-4 w-80 rounded bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl border border-gray-200 bg-white" />
        ))}
      </div>
    </div>
  )
}
