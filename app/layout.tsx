import type { Metadata } from 'next'
import '@/app/globals.css'
import { LogsProvider } from "@/lib/logs-context"

export const metadata: Metadata = {
  title: 'Opportunity Zone Search',
  description: 'Check if an address is in an opportunity zone',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <LogsProvider>
          {children}
        </LogsProvider>
      </body>
    </html>
  )
}
