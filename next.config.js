/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  experimental: {
    // Every screen imports a handful of icons from a package that exports
    // thousands, and the bundler was pulling in the barrel file to find them.
    // This rewrites each import to the one file it actually needs.
    optimizePackageImports: ['@heroicons/react/24/outline', '@heroicons/react/24/solid', 'date-fns'],
  },
}

module.exports = nextConfig
