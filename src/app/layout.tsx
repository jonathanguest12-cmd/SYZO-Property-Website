import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'SYZO — Premium Shared Living across the South West',
  description:
    'Beautifully furnished rooms in professionally managed houses across Plymouth and Newquay. All bills included.',
  openGraph: {
    title: 'SYZO — Premium Shared Living across the South West',
    description: 'Beautifully furnished rooms in professionally managed houses across Plymouth and Newquay. All bills included.',
    url: 'https://syzo-property-website.vercel.app',
    siteName: 'SYZO',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: '#F7F6F3' }}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
