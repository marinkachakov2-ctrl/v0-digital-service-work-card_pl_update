import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClockingProvider } from '@/lib/clocking-context'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Работна Карта | Megatron EAD',
  description: 'Digital Service Work Card for Field Technicians',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ClockingProvider>
          {children}
        </ClockingProvider>
      </body>
    </html>
  )
}
