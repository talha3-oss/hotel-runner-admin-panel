import type { Metadata } from 'next'
import './globals.css'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3402'

export const metadata: Metadata = {
  title: 'Luxotel Admin Dashboard',
  description: 'Hotel management system for Luxotel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Every screen here reads from the API on another host. Opening that
          connection while the page is still being parsed saves the DNS, TCP
          and TLS wait that otherwise lands on the first request. */}
      <head>
        <link rel="preconnect" href={API_BASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={API_BASE_URL} />
      </head>
      <body>{children}</body>
    </html>
  )
}
