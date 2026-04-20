import type { ReactNode } from 'react'
import Navbar from './Navbar'

export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
