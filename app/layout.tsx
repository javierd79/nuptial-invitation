import { Analytics } from '@vercel/analytics/next'
import { Cormorant_Garamond } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import AntiDevtools from '@/components/AntiDevtools'
import { OG_IMAGE, SITE_URL, WEDDING_DESCRIPTION, WEDDING_TITLE } from '@/lib/site'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Invitación de Boda | Javier Andrés & Maria Zolis',
    template: '%s | Javier & Maria',
  },
  description: WEDDING_DESCRIPTION,
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Javier & Maria',
    locale: 'es_VE',
    title: WEDDING_TITLE,
    description: WEDDING_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Carta de invitación de Javier & Maria',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: WEDDING_TITLE,
    description: WEDDING_DESCRIPTION,
    images: [OG_IMAGE],
  },
  icons: {
    icon: [
      {
        url: '/favicon-96x96.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: 'favicon-96x96.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${cormorant.variable} antialiased bg-white`}
        suppressHydrationWarning={true}
      >
        <AntiDevtools />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
