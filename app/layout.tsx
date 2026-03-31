import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
