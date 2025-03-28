import type { Metadata } from 'next'
import '@/app/globals.css'
import { LogsProvider } from "@/lib/logs-context"

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <LogsProvider>
          {children}
        </LogsProvider>
      </body>
    </html>
  )
}
