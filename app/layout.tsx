import './globals.css'

export const metadata = {
  title: {
    default: 'Elettro Engineering Enterprises',
    template: '%s | Elettro',
  },
  description: 'Electrical installation, maintenance, and supply solutions for residential, commercial, and industrial projects.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}