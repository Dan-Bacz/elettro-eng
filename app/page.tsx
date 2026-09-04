import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect visitors from the site root directly to the public client booking page.
  redirect('/client')
}
