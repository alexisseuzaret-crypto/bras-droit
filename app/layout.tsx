import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Bras Droit — Mister IA',
  description: 'Gestion de tâches collaborative Mister IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
