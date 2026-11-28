import './globals.css'

export const metadata = {
  title: {
    default: 'Elettro Engineering Enterprises',
    template: '%s | Elettro',
  },
  description: 'Electrical installation, maintenance, and supply solutions for residential, commercial, and industrial projects.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/print-document.css" media="print" /></head>
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}